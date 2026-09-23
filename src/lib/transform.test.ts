import { describe, it, expect } from "vitest";
import { groupSnapshotDanRiwayat, mapPayrollRows, formatCapaian, parseLaporanAi, getPeriodeOptions, buildSnapshotForPeriode } from "./transform";
import type { SheetRow } from "./server/sheets";

function aiRow(overrides: Partial<SheetRow> = {}): SheetRow {
  return {
    tanggal_generate: "2026-09-22 08:00:00",
    jenis_laporan: "Bulanan",
    rentang_dari: "2026-08-01",
    rentang_sampai: "2026-08-31",
    divisi: "CHTTN",
    omzet: "313860023",
    laba: "51841233",
    target: "175000000",
    status: "Tercapai",
    laporan_ai: "RINGKASAN: ok\nEVALUASI: ok\nREKOMENDASI: ok\nINSIGHT: ok",
    sumber_ai: "gemini",
    capaian: "313860023",
    satuan_target: "Rupiah",
    ...overrides,
  };
}

describe("groupSnapshotDanRiwayat", () => {
  it("returns null snapshot and empty riwayat for no rows", () => {
    const result = groupSnapshotDanRiwayat([]);
    expect(result.snapshotTerbaru).toBeNull();
    expect(result.riwayat).toEqual([]);
  });

  it("groups rows from one n8n run into one snapshot even when tanggal_generate differs by a few seconds per division", () => {
    // Real Sheet rows from the same run are written 4-6 seconds apart per
    // division, so tanggal_generate is NOT identical across them. Grouping
    // must key on jenisLaporan+rentangDari+rentangSampai, not exact
    // tanggal_generate string equality.
    //
    // The first row below is a GENUINELY different period (Dekade1, not
    // Bulanan) for the same division (CHTTN) as one of the 7 real rows, and
    // is appended FIRST (oldest by row order) — this must be excluded from
    // the snapshot purely by period mismatch, not by division-dedup (there
    // is no other Dekade1 row for it to dedup against). If the period
    // filter were broken and fell through to "everything sharing the
    // overall newest row's tanggal_generate", divisi.length would come out
    // wrong (either 8, or exclude a real Bulanan division instead).
    const rows = [
      aiRow({ divisi: "CHTTN", jenis_laporan: "Dekade1", rentang_dari: "2026-08-01", rentang_sampai: "2026-08-10", tanggal_generate: "2026-08-15 08:00:00" }),
      aiRow({ divisi: "CHTTN", tanggal_generate: "2026-09-22 08:00:00" }),
      aiRow({ divisi: "KONVEKSI", tanggal_generate: "2026-09-22 08:00:04" }),
      aiRow({ divisi: "ChatBarber Cempaka", tanggal_generate: "2026-09-22 08:00:09" }),
      aiRow({ divisi: "ChatBarber Kramat", tanggal_generate: "2026-09-22 08:00:14" }),
      aiRow({ divisi: "Waroeng Steak", tanggal_generate: "2026-09-22 08:00:19" }),
      aiRow({ divisi: "Kedai Kopi", tanggal_generate: "2026-09-22 08:00:23" }),
      aiRow({ divisi: "Toko Fashion", tanggal_generate: "2026-09-22 08:00:28" }),
    ];
    const result = groupSnapshotDanRiwayat(rows);
    expect(result.snapshotTerbaru?.divisi.length).toBe(7);
    expect(result.snapshotTerbaru?.jenisLaporan).toBe("Bulanan");
    expect(result.riwayat.length).toBe(8);
  });

  it("treats a later row as newest even when its hour is not zero-padded and lexicographically smaller (the exact C2 bug)", () => {
    // "2026-09-22 9:23:06" > "2026-09-22 12:10:47" as a STRING (because "9" >
    // "1"), which is backwards. Ordering must use the original Sheet row
    // order (append order), not a string comparison of tanggal_generate.
    const rows = [
      aiRow({ divisi: "CHTTN", tanggal_generate: "2026-09-22 9:23:06" }),
      aiRow({ divisi: "CHTTN", rentang_dari: "2026-09-01", tanggal_generate: "2026-09-22 12:10:47" }),
    ];
    const result = groupSnapshotDanRiwayat(rows);
    // The later-appended (second) row must be treated as newest.
    expect(result.riwayat[0].tanggalGenerate).toBe("2026-09-22 12:10:47");
    expect(result.riwayat[1].tanggalGenerate).toBe("2026-09-22 9:23:06");
    expect(result.snapshotTerbaru?.tanggalGenerate).toBe("2026-09-22 12:10:47");
    expect(result.snapshotTerbaru?.rentangDari).toBe("2026-09-01");
  });

  it("dedupes duplicate re-runs of the same period for the same division, keeping only the newest per division", () => {
    // The real Sheet contains multiple re-runs of the same period (e.g. 4
    // separate Dekade2 runs for the same date range). Matching on period
    // alone must not return duplicates for the same division.
    const rows = [
      aiRow({ divisi: "CHTTN", omzet: "100000000", tanggal_generate: "2026-09-22 08:00:00" }),
      aiRow({ divisi: "CHTTN", omzet: "200000000", tanggal_generate: "2026-09-22 08:05:00" }), // re-run
      aiRow({ divisi: "CHTTN", omzet: "300000000", tanggal_generate: "2026-09-22 08:10:00" }), // re-run
      aiRow({ divisi: "KONVEKSI", omzet: "50000000", tanggal_generate: "2026-09-22 08:12:00" }),
    ];
    const result = groupSnapshotDanRiwayat(rows);
    expect(result.snapshotTerbaru?.divisi.length).toBe(2);
    const chttn = result.snapshotTerbaru?.divisi.find((d) => d.nama === "CHTTN");
    expect(chttn?.omzet).toBe(300000000); // the newest re-run, not the first
  });

  it("parses a numeric laba as a number", () => {
    const result = groupSnapshotDanRiwayat([aiRow({ laba: "2599713" })]);
    expect(result.snapshotTerbaru?.divisi[0].laba).toBe(2599713);
  });

  it("treats an empty-string laba as null, not zero", () => {
    const result = groupSnapshotDanRiwayat([aiRow({ laba: "" })]);
    expect(result.snapshotTerbaru?.divisi[0].laba).toBeNull();
  });

  it("treats a missing laba key as null, not zero", () => {
    const row = aiRow();
    delete (row as Record<string, string>).laba;
    const result = groupSnapshotDanRiwayat([row]);
    expect(result.snapshotTerbaru?.divisi[0].laba).toBeNull();
  });

  it("treats a genuine negative laba (rugi) as that negative number, not null", () => {
    const result = groupSnapshotDanRiwayat([aiRow({ laba: "-5564744" })]);
    expect(result.snapshotTerbaru?.divisi[0].laba).toBe(-5564744);
  });

  it("treats a genuine zero laba as the number 0, not null", () => {
    const result = groupSnapshotDanRiwayat([aiRow({ laba: "0" })]);
    expect(result.snapshotTerbaru?.divisi[0].laba).toBe(0);
  });

  it("treats a whitespace-only laba as null, not zero", () => {
    const result = groupSnapshotDanRiwayat([aiRow({ laba: "   " })]);
    expect(result.snapshotTerbaru?.divisi[0].laba).toBeNull();
  });

  it("keeps satuan_target and capaian for non-Rupiah divisions", () => {
    const result = groupSnapshotDanRiwayat([
      aiRow({ divisi: "ChatBarber Cempaka", satuan_target: "kepala", capaian: "1119", target: "1550" }),
    ]);
    const d = result.snapshotTerbaru!.divisi[0];
    expect(d.satuanTarget).toBe("kepala");
    expect(d.capaian).toBe(1119);
    expect(d.target).toBe(1550);
  });

  it("passes through status literally, including 'Target belum diatur'", () => {
    const result = groupSnapshotDanRiwayat([aiRow({ status: "Target belum diatur", target: "0" })]);
    expect(result.snapshotTerbaru?.divisi[0].status).toBe("Target belum diatur");
  });
});

describe("mapPayrollRows", () => {
  function payrollRow(overrides: Partial<SheetRow> = {}): SheetRow {
    return {
      tanggal_generate: "2026-09-22 12:39:30",
      bulan: "Agustus 2026",
      nama: "Rizki",
      total_insentif: "3718496",
      total_bonus: "2592062",
      total_thp: "6310558",
      rincian_divisi: "ChatBarber Cempaka: omzet Rp 66.983.597, ...",
      ...overrides,
    };
  }

  it("maps rows and parses numeric fields", () => {
    const result = mapPayrollRows([payrollRow()]);
    expect(result).toEqual([
      {
        bulan: "Agustus 2026",
        nama: "Rizki",
        totalInsentif: 3718496,
        totalBonus: 2592062,
        totalThp: 6310558,
        rincianDivisi: "ChatBarber Cempaka: omzet Rp 66.983.597, ...",
      },
    ]);
  });

  it("returns newest-first order", () => {
    const rows = [
      payrollRow({ nama: "Rizki", tanggal_generate: "2026-09-22 12:39:30" }),
      payrollRow({ nama: "Erwan", tanggal_generate: "2026-10-14 10:00:05" }),
    ];
    const result = mapPayrollRows(rows);
    expect(result[0].nama).toBe("Erwan");
    expect(result[1].nama).toBe("Rizki");
  });

  it("orders by original row (append) order, not a string comparison of a non-zero-padded hour", () => {
    // "2026-09-22 9:15:00" > "2026-09-22 12:39:30" as a STRING, which is
    // backwards. mapPayrollRows must sort by original row index, not by
    // the tanggal_generate string.
    const rows = [
      payrollRow({ nama: "Rizki", tanggal_generate: "2026-09-22 9:15:00" }),
      payrollRow({ nama: "Erwan", tanggal_generate: "2026-09-22 12:39:30" }),
    ];
    const result = mapPayrollRows(rows);
    expect(result[0].nama).toBe("Erwan");
    expect(result[1].nama).toBe("Rizki");
  });

  it("returns an empty array for no rows", () => {
    expect(mapPayrollRows([])).toEqual([]);
  });
});

describe("formatCapaian", () => {
  it("formats Rupiah with prefix", () => {
    expect(formatCapaian(1500000, "Rupiah")).toBe("Rp 1.500.000");
  });

  it("formats non-Rupiah with unit suffix", () => {
    expect(formatCapaian(1119, "kepala")).toBe("1.119 kepala");
  });
});

describe("parseLaporanAi", () => {
  it("splits the 4 labeled sections", () => {
    const teks = "RINGKASAN: a\nEVALUASI: b\nREKOMENDASI: c\nINSIGHT: d";
    expect(parseLaporanAi(teks)).toEqual({ ringkasan: "a", evaluasi: "b", rekomendasi: "c", insight: "d" });
  });

  it("returns empty strings for missing sections", () => {
    expect(parseLaporanAi("")).toEqual({ ringkasan: "", evaluasi: "", rekomendasi: "", insight: "" });
  });
});

describe("getPeriodeOptions", () => {
  it("returns an empty list for no history", () => {
    expect(getPeriodeOptions([])).toEqual([]);
  });

  it("returns one option per distinct period, newest-first", () => {
    const rows = [
      aiRow({ divisi: "CHTTN", jenis_laporan: "Dekade2", rentang_dari: "2026-09-01", rentang_sampai: "2026-09-20", tanggal_generate: "2026-09-22 12:06:28" }),
      aiRow({ divisi: "ChatBox", jenis_laporan: "Dekade2", rentang_dari: "2026-09-01", rentang_sampai: "2026-09-20", tanggal_generate: "2026-09-22 12:06:37" }),
      aiRow({ divisi: "CHTTN", jenis_laporan: "Bulanan", rentang_dari: "2026-08-01", rentang_sampai: "2026-08-31", tanggal_generate: "2026-09-22 12:10:39" }),
    ];
    const { riwayat } = groupSnapshotDanRiwayat(rows);
    const options = getPeriodeOptions(riwayat);
    // Row-index order (append order) is: Dekade2 CHTTN, Dekade2 ChatBox, then
    // Bulanan CHTTN appended LAST — so Bulanan is "newest" by row order even
    // though its tanggal_generate string looks earlier for one row and later
    // for another; getPeriodeOptions must follow riwayat's own order, not
    // re-derive its own.
    expect(options).toEqual([
      { jenisLaporan: "Bulanan", rentangDari: "2026-08-01", rentangSampai: "2026-08-31", label: "Bulanan (2026-08-01 s.d. 2026-08-31)" },
      { jenisLaporan: "Dekade2", rentangDari: "2026-09-01", rentangSampai: "2026-09-20", label: "Dekade2 (2026-09-01 s.d. 2026-09-20)" },
    ]);
  });
});

describe("buildSnapshotForPeriode", () => {
  it("returns null when no row matches the given period", () => {
    const { riwayat } = groupSnapshotDanRiwayat([aiRow()]);
    const result = buildSnapshotForPeriode(riwayat, { jenisLaporan: "Dekade1", rentangDari: "2026-01-01", rentangSampai: "2026-01-10", label: "" });
    expect(result).toBeNull();
  });

  it("rebuilds a snapshot for a non-newest period, deduping re-runs to the latest per division", () => {
    const rows = [
      // Older period (Dekade1), re-run twice for CHTTN — the second (later
      // row index) must win.
      aiRow({ divisi: "CHTTN", jenis_laporan: "Dekade1", rentang_dari: "2026-09-01", rentang_sampai: "2026-09-10", tanggal_generate: "2026-09-11 08:00:00", omzet: "1000" }),
      aiRow({ divisi: "CHTTN", jenis_laporan: "Dekade1", rentang_dari: "2026-09-01", rentang_sampai: "2026-09-10", tanggal_generate: "2026-09-11 09:00:00", omzet: "2000" }),
      // Newest period (Bulanan), appended last.
      aiRow({ divisi: "CHTTN", jenis_laporan: "Bulanan", rentang_dari: "2026-08-01", rentang_sampai: "2026-08-31", tanggal_generate: "2026-09-22 08:00:00" }),
    ];
    const { riwayat } = groupSnapshotDanRiwayat(rows);
    const result = buildSnapshotForPeriode(riwayat, { jenisLaporan: "Dekade1", rentangDari: "2026-09-01", rentangSampai: "2026-09-10", label: "" });
    expect(result?.divisi.length).toBe(1);
    expect(result?.divisi[0].omzet).toBe(2000);
    expect(result?.jenisLaporan).toBe("Dekade1");
  });
});
