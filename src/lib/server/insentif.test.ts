import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { bulanUntukPeriode, fetchInsentif } from "./insentif";

describe("bulanUntukPeriode", () => {
  it("uses the WIB calendar month, not the server's UTC month", () => {
    // 30 Sep 18:00 UTC = 1 Okt 01:00 WIB -> sudah Oktober.
    const now = new Date("2026-09-30T18:00:00Z");
    expect(bulanUntukPeriode("ini", now)).toBe("2026-10");
    expect(bulanUntukPeriode("lalu", now)).toBe("2026-09");
  });

  it("is still September one hour earlier", () => {
    const now = new Date("2026-09-30T16:59:00Z"); // 23:59 WIB
    expect(bulanUntukPeriode("ini", now)).toBe("2026-09");
    expect(bulanUntukPeriode("lalu", now)).toBe("2026-08");
  });

  it("rolls 'lalu' back over the year boundary", () => {
    expect(bulanUntukPeriode("lalu", new Date("2027-01-15T03:00:00Z"))).toBe("2026-12");
  });
});

describe("fetchInsentif", () => {
  const tokenSebelum = process.env.AIREPORT_LIVE_TOKEN;
  const now = new Date("2026-10-09T02:00:00Z");

  beforeEach(() => {
    process.env.AIREPORT_LIVE_TOKEN = "token-uji";
  });

  afterEach(() => {
    process.env.AIREPORT_LIVE_TOKEN = tokenSebelum;
  });

  const group = (divisi: string, nama: string, insentif: number) => ({
    divisi,
    targetTercapai: false,
    keterangan: "k",
    catatan: null,
    pegawai: [{ nama, peran: null, basis: null, insentif, bonus: 0, total: insentif }],
  });

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

  const ok = (groups: unknown[]) => () => Response.json({ bulan: "2026-10", groups });

  it("asks all three apps for the same month with the API key and merges groups in display order", async () => {
    const { impl, panggilan } = fetchPalsu({
      "chttn.": ok([group("CHTTN", "Andi", 100), group("KONVEKSI", "Ali", 200)]),
      "cbcst.": ok([group("ChatBarber Cempaka", "Husaini", 300)]),
      "chatbox.": ok([group("ChatBox", "Adit", 400)]),
    });

    const hasil = await fetchInsentif("ini", { fetchImpl: impl, now });

    expect(hasil.bulan).toBe("2026-10");
    expect(hasil.periode).toBe("ini");
    expect(hasil.gagal).toEqual([]);
    expect(hasil.groups.map((g) => `${g.sumber}/${g.divisi}`)).toEqual([
      "CHTTN/CHTTN",
      "CHTTN/KONVEKSI",
      "CBCST/ChatBarber Cempaka",
      "ChatBox/ChatBox",
    ]);
    expect(panggilan).toHaveLength(3);
    for (const p of panggilan) {
      expect(p.url).toMatch(/\?bulan=2026-10$/);
      expect(p.apiKey).toBe("token-uji");
    }
  });

  it("requests the previous month for periode 'lalu'", async () => {
    const { impl, panggilan } = fetchPalsu({ "chttn.": ok([]), "cbcst.": ok([]), "chatbox.": ok([]) });

    const hasil = await fetchInsentif("lalu", { fetchImpl: impl, now });

    expect(hasil.bulan).toBe("2026-09");
    expect(panggilan.every((p) => p.url.endsWith("?bulan=2026-09"))).toBe(true);
  });

  it("reports an app as failed (and keeps the others) on HTTP error, network error, or a non-insentif body", async () => {
    const { impl } = fetchPalsu({
      "chttn.": () => new Response("Unauthorized", { status: 401 }),
      "cbcst.": () => {
        throw new Error("ECONNRESET");
      },
      "chatbox.": ok([group("ChatBox", "Adit", 400)]),
    });

    const hasil = await fetchInsentif("ini", { fetchImpl: impl, now });

    expect(hasil.gagal).toEqual(["CHTTN", "CBCST"]);
    expect(hasil.groups.map((g) => g.divisi)).toEqual(["ChatBox"]);
  });

  it("treats a 200 with the wrong shape (e.g. an HTML error page parsed as JSON error) as failed", async () => {
    const { impl } = fetchPalsu({
      "chttn.": ok([]),
      "cbcst.": () => Response.json({ error: "Internal error" }),
      "chatbox.": () => new Response("<html>", { status: 200 }),
    });

    const hasil = await fetchInsentif("ini", { fetchImpl: impl, now });

    expect(hasil.gagal).toEqual(["CBCST", "ChatBox"]);
  });

  it("throws when the token is not configured instead of calling the apps unauthenticated", async () => {
    delete process.env.AIREPORT_LIVE_TOKEN;
    const { impl, panggilan } = fetchPalsu({});

    await expect(fetchInsentif("ini", { fetchImpl: impl, now })).rejects.toThrow("AIREPORT_LIVE_TOKEN");
    expect(panggilan).toHaveLength(0);
  });
});
