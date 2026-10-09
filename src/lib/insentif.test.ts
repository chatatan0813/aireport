import { describe, it, expect } from "vitest";
import { bulanIni, bulanSebelum, bulanValid, labelBulan, normalisasiGroups, totalGroup, totalSemua } from "./insentif";

describe("bulanIni", () => {
  it("reads the calendar month off local Date getters, not toISOString/UTC", () => {
    // Jam device 1 Jan 2027 00:30 lokal -- kalau sampai pakai toISOString()
    // (UTC) ini bisa salah mundur ke Desember tergantung offset device.
    expect(bulanIni(new Date(2027, 0, 1, 0, 30))).toBe("2027-01");
    expect(bulanIni(new Date(2026, 9, 9, 12, 0))).toBe("2026-10");
  });
});

describe("bulanValid", () => {
  it("accepts YYYY-MM only", () => {
    expect(bulanValid("2026-10")).toBe(true);
    expect(bulanValid("2026-01")).toBe(true);
    expect(bulanValid("2026-13")).toBe(false);
    expect(bulanValid("2026-00")).toBe(false);
    expect(bulanValid("2026-9")).toBe(false);
    expect(bulanValid("2026-10-01")).toBe(false);
    expect(bulanValid("")).toBe(false);
  });
});

describe("labelBulan", () => {
  it("renders an Indonesian month label", () => {
    expect(labelBulan("2026-10")).toBe("Oktober 2026");
    expect(labelBulan("2027-01")).toBe("Januari 2027");
  });

  it("returns invalid input untouched instead of 'undefined 2026'", () => {
    expect(labelBulan("2026-13")).toBe("2026-13");
  });
});

describe("bulanSebelum", () => {
  it("steps back one month", () => {
    expect(bulanSebelum("2026-10")).toBe("2026-09");
  });

  it("rolls over the year in January", () => {
    expect(bulanSebelum("2027-01")).toBe("2026-12");
  });
});

describe("normalisasiGroups", () => {
  const respons = {
    bulan: "2026-09",
    groups: [
      {
        divisi: "ChatBarber Cempaka",
        targetTercapai: false,
        keterangan: "1.119 dari target 1.550 kepala",
        catatan: null,
        pegawai: [
          { nama: "Husaini", peran: null, basis: "210 kepala (18,8%)", insentif: 620000, bonus: 0, total: 620000 },
          { nama: "Bilhan", peran: null, basis: "100 kepala (8,9%)", insentif: 295000, bonus: 0, total: 295000 },
        ],
      },
    ],
  };

  it("tags every group with its source app and keeps the amounts", () => {
    const groups = normalisasiGroups(respons, "CBCST");
    expect(groups).toHaveLength(1);
    expect(groups![0]).toMatchObject({
      sumber: "CBCST",
      divisi: "ChatBarber Cempaka",
      targetTercapai: false,
      keterangan: "1.119 dari target 1.550 kepala",
      catatan: null,
    });
    expect(groups![0].pegawai[0]).toEqual({
      nama: "Husaini", peran: null, basis: "210 kepala (18,8%)", insentif: 620000, bonus: 0, total: 620000,
    });
  });

  it("returns null for anything that is not an insentif response, so the caller reports the app as failed", () => {
    expect(normalisasiGroups(null, "CBCST")).toBeNull();
    expect(normalisasiGroups("<html>502</html>", "CBCST")).toBeNull();
    expect(normalisasiGroups({ error: "Unauthorized" }, "CBCST")).toBeNull();
    expect(normalisasiGroups({ groups: "bukan array" }, "CBCST")).toBeNull();
  });

  it("recomputes total from insentif + bonus instead of trusting the upstream total", () => {
    const groups = normalisasiGroups(
      { groups: [{ divisi: "CHTTN", pegawai: [{ nama: "Andi", insentif: 100, bonus: 50, total: 999999 }] }] },
      "CHTTN",
    );
    expect(groups![0].pegawai[0].total).toBe(150);
  });

  it("coerces numeric strings and treats missing or garbage amounts as 0, never NaN", () => {
    const groups = normalisasiGroups(
      { groups: [{ divisi: "KONVEKSI", pegawai: [{ nama: "Ali", insentif: "112500", bonus: null }, { nama: "Beni", insentif: "abc" }] }] },
      "CHTTN",
    );
    expect(groups![0].pegawai).toEqual([
      { nama: "Ali", peran: null, basis: null, insentif: 112500, bonus: 0, total: 112500 },
      { nama: "Beni", peran: null, basis: null, insentif: 0, bonus: 0, total: 0 },
    ]);
  });

  it("keeps targetTercapai null (target belum diset) distinct from false (belum tercapai)", () => {
    const groups = normalisasiGroups({ groups: [{ divisi: "KONVEKSI", targetTercapai: null, pegawai: [] }] }, "CHTTN");
    expect(groups![0].targetTercapai).toBeNull();
  });

  it("falls back to the source name when divisi is missing and drops non-object entries", () => {
    const groups = normalisasiGroups({ groups: [null, "x", { pegawai: [null, 7, { nama: "" }] }] }, "ChatBox");
    expect(groups).toHaveLength(1);
    expect(groups![0].divisi).toBe("ChatBox");
    expect(groups![0].pegawai).toEqual([{ nama: "-", peran: null, basis: null, insentif: 0, bonus: 0, total: 0 }]);
  });
});

describe("totalGroup / totalSemua", () => {
  const groups = normalisasiGroups(
    {
      groups: [
        { divisi: "A", pegawai: [{ nama: "x", insentif: 100, bonus: 50 }, { nama: "y", insentif: 200, bonus: 0 }] },
        { divisi: "B", pegawai: [{ nama: "x", insentif: 10, bonus: 5 }] },
        { divisi: "C", pegawai: [] },
      ],
    },
    "CBCST",
  )!;

  it("sums one group", () => {
    expect(totalGroup(groups[0])).toEqual({ insentif: 300, bonus: 50, total: 350, jumlahPegawai: 2 });
    expect(totalGroup(groups[2])).toEqual({ insentif: 0, bonus: 0, total: 0, jumlahPegawai: 0 });
  });

  it("sums across groups and counts recipient rows (same name in two divisions counts twice)", () => {
    expect(totalSemua(groups)).toEqual({ insentif: 310, bonus: 55, total: 365, jumlahPegawai: 3 });
  });

  it("returns zeros for no groups", () => {
    expect(totalSemua([])).toEqual({ insentif: 0, bonus: 0, total: 0, jumlahPegawai: 0 });
  });
});
