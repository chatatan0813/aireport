import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { bulanBerjalanWib, fetchInsentif } from "./insentif";

describe("bulanBerjalanWib", () => {
  it("uses the WIB calendar month, not the server's UTC month", () => {
    // 30 Sep 18:00 UTC = 1 Okt 01:00 WIB -> sudah Oktober.
    expect(bulanBerjalanWib(new Date("2026-09-30T18:00:00Z"))).toBe("2026-10");
  });

  it("is still September one hour earlier", () => {
    expect(bulanBerjalanWib(new Date("2026-09-30T16:59:00Z"))).toBe("2026-09"); // 23:59 WIB
  });
});

describe("fetchInsentif", () => {
  const tokenSebelum = process.env.AIREPORT_LIVE_TOKEN;

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

  // Stub Tim Media SELALU disertakan di bawah -- fetchInsentif sekarang juga
  // memanggil daily-report ketiga app + roster HRD untuk kartu "Tim Media".
  // Kunci daily-report HARUS didaftar sebelum kunci domain generik ("chttn.",
  // "cbcst.", "chatbox.") di objek yang sama, karena fetchPalsu mencocokkan
  // key pertama yang jadi substring URL -- kunci generik itu juga substring
  // dari URL daily-report, jadi kalau urutannya kebalik dia salah kena.
  const timMediaKosong = {
    "daftar-laporan-eksternal-harian": () => Response.json({ divisions: [] }),
    "cbcst.chatatangroup.com/api/external/daily-report": () => Response.json({ divisions: [] }),
    "chatbox.chatatangroup.com/api/external/daily-report": () => Response.json({ divisions: [] }),
  };
  const ambilRosterKosong = async () => [];

  it("asks all three apps for the chosen month with the API key and merges groups in display order", async () => {
    const { impl, panggilan } = fetchPalsu({
      ...timMediaKosong,
      "chttn.": ok([group("CHTTN", "Andi", 100), group("KONVEKSI", "Ali", 200)]),
      "cbcst.": ok([group("ChatBarber Cempaka", "Husaini", 300)]),
      "chatbox.": ok([group("ChatBox", "Adit", 400)]),
    });

    const hasil = await fetchInsentif("2026-10", { fetchImpl: impl, ambilRosterTimMedia: ambilRosterKosong });

    expect(hasil.bulan).toBe("2026-10");
    expect(hasil.gagal).toEqual([]);
    expect(hasil.groups.map((g) => `${g.sumber}/${g.divisi}`)).toEqual([
      "CHTTN/CHTTN",
      "CHTTN/KONVEKSI",
      "CBCST/ChatBarber Cempaka",
      "ChatBox/ChatBox",
      "Media/Tim Media",
    ]);

    // Hanya panggilan ke endpoint insentif-bonus (bukan daily-report Tim
    // Media) yang dicek bentuknya di sini -- itu fokus test ini.
    const panggilanInsentif = panggilan.filter((p) => p.url.includes("bulan=2026-10"));
    expect(panggilanInsentif).toHaveLength(3);
    for (const p of panggilanInsentif) {
      expect(p.url).toMatch(/\?bulan=2026-10$/);
      expect(p.apiKey).toBe("token-uji");
    }
  });

  it("requests an arbitrary past month exactly as given", async () => {
    const { impl, panggilan } = fetchPalsu({
      ...timMediaKosong,
      "chttn.": ok([]),
      "cbcst.": ok([]),
      "chatbox.": ok([]),
    });

    const hasil = await fetchInsentif("2026-02", { fetchImpl: impl, ambilRosterTimMedia: ambilRosterKosong });

    expect(hasil.bulan).toBe("2026-02"); // bulan yang diminta, bukan dari body respons palsu
    const panggilanInsentif = panggilan.filter((p) => p.url.includes("bulan="));
    expect(panggilanInsentif.every((p) => p.url.endsWith("?bulan=2026-02"))).toBe(true);
  });

  it("reports an app as failed (and keeps the others) on HTTP error, network error, or a non-insentif body", async () => {
    const { impl } = fetchPalsu({
      ...timMediaKosong,
      "chttn.": () => new Response("Unauthorized", { status: 401 }),
      "cbcst.": () => {
        throw new Error("ECONNRESET");
      },
      "chatbox.": ok([group("ChatBox", "Adit", 400)]),
    });

    const hasil = await fetchInsentif("2026-10", { fetchImpl: impl, ambilRosterTimMedia: ambilRosterKosong });

    expect(hasil.gagal).toEqual(["CHTTN", "CBCST"]);
    expect(hasil.groups.map((g) => g.divisi)).toEqual(["ChatBox", "Tim Media"]);
  });

  it("treats a 200 with the wrong shape (e.g. an HTML error page parsed as JSON error) as failed", async () => {
    const { impl } = fetchPalsu({
      ...timMediaKosong,
      "chttn.": ok([]),
      "cbcst.": () => Response.json({ error: "Internal error" }),
      "chatbox.": () => new Response("<html>", { status: 200 }),
    });

    const hasil = await fetchInsentif("2026-10", { fetchImpl: impl, ambilRosterTimMedia: ambilRosterKosong });

    expect(hasil.gagal).toEqual(["CBCST", "ChatBox"]);
  });

  it("throws when the token is not configured instead of calling the apps unauthenticated", async () => {
    delete process.env.AIREPORT_LIVE_TOKEN;
    const { impl, panggilan } = fetchPalsu({});

    await expect(fetchInsentif("2026-10", { fetchImpl: impl })).rejects.toThrow("AIREPORT_LIVE_TOKEN");
    expect(panggilan).toHaveLength(0);
  });

  it("appends a Tim Media group built from the three apps' daily-report numbers, after the per-app groups", async () => {
    const { impl } = fetchPalsu({
      "daftar-insentif-eksternal-bulanan": ok([group("CHTTN", "Andi", 100)]),
      "cbcst.chatatangroup.com/api/external/insentif-bonus": ok([]),
      "chatbox.chatatangroup.com/api/external/insentif-bonus": ok([]),
      "daftar-laporan-eksternal-harian": () => Response.json({ divisions: [{ name: "CHTTN", omzet: 1_000_000, target: 2_000_000 }] }),
      "cbcst.chatatangroup.com/api/external/daily-report": () => Response.json({ divisions: [] }),
      "chatbox.chatatangroup.com/api/external/daily-report": () => Response.json({ divisions: [] }),
    });
    const ambilRosterTimMedia = async () => [{ nama: "Alpri Andrian", peran: "Head" }];

    const hasil = await fetchInsentif("2026-10", { fetchImpl: impl, ambilRosterTimMedia });

    expect(hasil.groups.map((g) => g.divisi)).toEqual(["CHTTN", "Tim Media"]);
    const timMedia = hasil.groups[1];
    expect(timMedia.pegawai).toEqual([
      { nama: "Alpri Andrian", peran: "Head", basis: null, insentif: 1_000, bonus: 0, total: 1_000 },
    ]);
  });

  it("merges Tim Media's own failures into the same gagal list, without duplicating an app already marked failed", async () => {
    const { impl } = fetchPalsu({
      "daftar-insentif-eksternal-bulanan": () => new Response("Unauthorized", { status: 401 }), // CHTTN gagal di insentif-bonus
      "cbcst.chatatangroup.com/api/external/insentif-bonus": ok([]),
      "chatbox.chatatangroup.com/api/external/insentif-bonus": ok([]),
      "daftar-laporan-eksternal-harian": () => new Response("Unauthorized", { status: 401 }), // CHTTN gagal juga di daily-report
      "cbcst.chatatangroup.com/api/external/daily-report": () => Response.json({ divisions: [] }),
      "chatbox.chatatangroup.com/api/external/daily-report": () => Response.json({ divisions: [] }),
    });
    const ambilRosterTimMedia = async () => [{ nama: "Alpri Andrian", peran: "Head" }];

    const hasil = await fetchInsentif("2026-10", { fetchImpl: impl, ambilRosterTimMedia });

    expect(hasil.gagal).toEqual(["CHTTN"]); // bukan ["CHTTN", "CHTTN"]
  });

  it("still returns the per-app groups when the Tim Media roster itself fails to load", async () => {
    const { impl } = fetchPalsu({
      "daftar-insentif-eksternal-bulanan": ok([group("CHTTN", "Andi", 100)]),
      "cbcst.chatatangroup.com/api/external/insentif-bonus": ok([]),
      "chatbox.chatatangroup.com/api/external/insentif-bonus": ok([]),
      "daftar-laporan-eksternal-harian": () => Response.json({ divisions: [] }),
      "cbcst.chatatangroup.com/api/external/daily-report": () => Response.json({ divisions: [] }),
      "chatbox.chatatangroup.com/api/external/daily-report": () => Response.json({ divisions: [] }),
    });
    const ambilRosterTimMedia = async () => {
      throw new Error("Sheets API down");
    };

    const hasil = await fetchInsentif("2026-10", { fetchImpl: impl, ambilRosterTimMedia });

    expect(hasil.groups.map((g) => g.divisi)).toEqual(["CHTTN"]); // tanpa kartu Tim Media
    expect(hasil.gagal).toContain("Tim Media (roster)");
  });
});
