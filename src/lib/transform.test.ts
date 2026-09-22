import { describe, it, expect } from "vitest";
import { groupSnapshotDanRiwayat, mapPayrollRows, formatCapaian, parseLaporanAi } from "./transform";
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

  it("groups the 7 most recent rows sharing tanggal_generate into one snapshot", () => {
    const rows = [
      aiRow({ divisi: "CHTTN", tanggal_generate: "2026-09-22 08:00:00" }),
      aiRow({ divisi: "KONVEKSI", tanggal_generate: "2026-09-22 08:00:00" }),
      aiRow({ divisi: "CHTTN", tanggal_generate: "2026-09-03 08:00:00" }), // older snapshot, different run
    ];
    const result = groupSnapshotDanRiwayat(rows);
    expect(result.snapshotTerbaru?.divisi.length).toBe(2);
    expect(result.snapshotTerbaru?.tanggalGenerate).toBe("2026-09-22 08:00:00");
    expect(result.riwayat.length).toBe(3);
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
