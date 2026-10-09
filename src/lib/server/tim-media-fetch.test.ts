import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fetchTimMedia } from "./tim-media-fetch";
import type { AnggotaTimMedia } from "../tim-media";

describe("fetchTimMedia", () => {
  const tokenSebelum = process.env.AIREPORT_LIVE_TOKEN;

  beforeEach(() => {
    process.env.AIREPORT_LIVE_TOKEN = "token-uji";
  });

  afterEach(() => {
    process.env.AIREPORT_LIVE_TOKEN = tokenSebelum;
  });

  const anggota: AnggotaTimMedia[] = [{ nama: "Alpri Andrian", peran: "Head" }];
  const ambilRosterOk = async () => anggota;

  function fetchPalsu(jawaban: Record<string, () => Response | Promise<Response>>) {
    const panggilan: { url: string; apiKey: string | null }[] = [];
    const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      panggilan.push({ url, apiKey: new Headers(init?.headers).get("x-api-key") });
      const kunci = Object.keys(jawaban).find((k) => url.includes(k));
      if (!kunci) throw new Error("URL tidak dikenal: " + url);
      return jawaban[kunci]();
    }) as typeof fetch;
    return { impl, panggilan };
  }

  const divisions = (rows: { name: string; omzet: number; target: number }[]) => () =>
    Response.json({ from: "2026-10-01", to: "2026-10-31", divisions: rows });

  it("requests the full calendar month (01 to last day) from all three daily-report endpoints", async () => {
    const { impl, panggilan } = fetchPalsu({
      "chttn.": divisions([{ name: "CHTTN", omzet: 1_000_000, target: 2_000_000 }]),
      "cbcst.": divisions([]),
      "chatbox.": divisions([]),
    });

    await fetchTimMedia("2026-10", { fetchImpl: impl, ambilRoster: ambilRosterOk });

    expect(panggilan).toHaveLength(3);
    for (const p of panggilan) {
      expect(p.url).toMatch(/\?from=2026-10-01&to=2026-10-31$/);
      expect(p.apiKey).toBe("token-uji");
    }
  });

  it("handles February's shorter month correctly", async () => {
    const { impl, panggilan } = fetchPalsu({
      "chttn.": divisions([]),
      "cbcst.": divisions([]),
      "chatbox.": divisions([]),
    });

    await fetchTimMedia("2026-02", { fetchImpl: impl, ambilRoster: ambilRosterOk });

    for (const p of panggilan) expect(p.url).toMatch(/to=2026-02-28$/);
  });

  it("merges divisions from all three apps and feeds them into the Tim Media calculation", async () => {
    const { impl } = fetchPalsu({
      "chttn.": divisions([{ name: "CHTTN", omzet: 3_000_000, target: 2_000_000 }]),
      "cbcst.": divisions([
        { name: "ChatBarber Cempaka", omzet: 1_000_000, target: 2_000_000 },
        { name: "ChatBarber Pinus", omzet: 1_000_000, target: 2_000_000 },
      ]),
      "chatbox.": divisions([{ name: "ChatBox", omzet: 1_000_000, target: 2_000_000 }]),
    });

    const hasil = await fetchTimMedia("2026-10", { fetchImpl: impl, ambilRoster: ambilRosterOk });

    expect(hasil.group).not.toBeNull();
    // Pool insentif 0,1% x (3jt+1jt+1jt+1jt) = Rp6.000. Pool bonus 0,3% hanya
    // dari CHTTN (satu-satunya yang >= target-nya sendiri) = 3jt x 0,3% = Rp9.000.
    // Satu orang (Alpri) -> dapat semuanya.
    expect(hasil.group!.pegawai).toEqual([
      { nama: "Alpri Andrian", peran: "Head", basis: null, insentif: 6_000, bonus: 9_000, total: 15_000 },
    ]);
    expect(hasil.gagal).toEqual([]);
  });

  it("reports which app failed and still computes from the other two", async () => {
    const { impl } = fetchPalsu({
      "chttn.": () => new Response("Unauthorized", { status: 401 }),
      "cbcst.": divisions([{ name: "ChatBarber Cempaka", omzet: 2_000_000, target: 1_000_000 }]),
      "chatbox.": divisions([]),
    });

    const hasil = await fetchTimMedia("2026-10", { fetchImpl: impl, ambilRoster: ambilRosterOk });

    expect(hasil.gagal).toEqual(["CHTTN"]);
    expect(hasil.group).not.toBeNull();
    expect(hasil.group!.pegawai[0].insentif).toBe(2_000); // cuma dari ChatBarber Cempaka
  });

  it("regression: a ChatBarber/ChatShoeTreatment divisi with huge Rupiah omzet but jumlahTransaksi under its kepala/pekerjaan target is 'Belum Tercapai', not 'Tercapai'", async () => {
    // Kasus bug nyata: omzet Rp13.336.000 jauh di atas "target" 1.550 (itu
    // target KEPALA, bukan Rupiah) -- jumlahTransaksi (kepala asli) cuma 223,
    // di bawah target, jadi harus Belum Tercapai meski omzetnya besar.
    const { impl } = fetchPalsu({
      "chttn.": divisions([]),
      "cbcst.": () =>
        Response.json({
          divisions: [{ name: "ChatBarber Cempaka", omzet: 13_336_000, target: 1_550, jumlahTransaksi: 223 }],
        }),
      "chatbox.": divisions([]),
    });

    const hasil = await fetchTimMedia("2026-10", { fetchImpl: impl, ambilRoster: ambilRosterOk });

    expect(hasil.group!.rincianDivisi!.find((r) => r.divisi === "ChatBarber Cempaka")!.status).toBe("Belum Tercapai");
    expect(hasil.group!.pegawai[0].bonus).toBe(0);
  });

  it("returns a null group and reports 'Tim Media' as failed when the HRD roster itself can't be read", async () => {
    const { impl } = fetchPalsu({ "chttn.": divisions([]), "cbcst.": divisions([]), "chatbox.": divisions([]) });
    const ambilRosterGagal = async () => {
      throw new Error("Sheets API down");
    };

    const hasil = await fetchTimMedia("2026-10", { fetchImpl: impl, ambilRoster: ambilRosterGagal });

    expect(hasil.group).toBeNull();
    expect(hasil.gagal).toEqual(["Tim Media (roster)"]);
  });
});
