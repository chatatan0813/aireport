import type { SheetRow } from "./server/sheets";

export type Divisi = {
  nama: string;
  omzet: number;
  laba: number | null;
  capaian: number;
  target: number;
  satuanTarget: string;
  status: string;
  laporanAi: string;
  sumberAi: string;
};

export type SnapshotTerbaru = {
  jenisLaporan: string;
  rentangDari: string;
  rentangSampai: string;
  tanggalGenerate: string;
  divisi: Divisi[];
};

export type RiwayatEntri = Divisi & {
  jenisLaporan: string;
  rentangDari: string;
  rentangSampai: string;
  tanggalGenerate: string;
};

export type PayrollEntri = {
  bulan: string;
  nama: string;
  totalInsentif: number;
  totalBonus: number;
  totalThp: number;
  rincianDivisi: string;
};

function parseLaba(raw: string | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return isFinite(n) ? n : null;
}

function parseNum(raw: string | undefined): number {
  const n = Number(raw);
  return isFinite(n) ? n : 0;
}

function toDivisi(row: SheetRow): Divisi {
  return {
    nama: row.divisi ?? "",
    omzet: parseNum(row.omzet),
    laba: parseLaba(row.laba),
    capaian: parseNum(row.capaian),
    target: parseNum(row.target),
    satuanTarget: row.satuan_target ?? "Rupiah",
    status: row.status ?? "",
    laporanAi: row.laporan_ai ?? "",
    sumberAi: row.sumber_ai ?? "",
  };
}

export function groupSnapshotDanRiwayat(rows: SheetRow[]): {
  snapshotTerbaru: SnapshotTerbaru | null;
  riwayat: RiwayatEntri[];
} {
  const riwayat: RiwayatEntri[] = rows
    .map((row, i) => ({
      ...toDivisi(row),
      jenisLaporan: row.jenis_laporan ?? "",
      rentangDari: row.rentang_dari ?? "",
      rentangSampai: row.rentang_sampai ?? "",
      tanggalGenerate: row.tanggal_generate ?? "",
      _rowIndex: i,
    }))
    .sort((a, b) => b._rowIndex - a._rowIndex)
    .map(({ _rowIndex, ...rest }) => rest);

  if (riwayat.length === 0) {
    return { snapshotTerbaru: null, riwayat: [] };
  }

  const newest = riwayat[0];
  const periodRows = riwayat.filter(
    (r) =>
      r.jenisLaporan === newest.jenisLaporan &&
      r.rentangDari === newest.rentangDari &&
      r.rentangSampai === newest.rentangSampai
  );

  // Real Sheet data can contain multiple re-runs of the same period (e.g.
  // several Dekade2 runs for the same date range). Keep only the latest
  // row per division. `periodRows` is already ordered newest-first (by
  // original Sheet row index, not the tanggal_generate string — see C2),
  // so the first occurrence of each `nama` is the one to keep.
  const seenDivisi = new Set<string>();
  const snapshotRows = periodRows.filter((r) => {
    if (seenDivisi.has(r.nama)) return false;
    seenDivisi.add(r.nama);
    return true;
  });

  return {
    snapshotTerbaru: {
      jenisLaporan: newest.jenisLaporan,
      rentangDari: newest.rentangDari,
      rentangSampai: newest.rentangSampai,
      tanggalGenerate: newest.tanggalGenerate,
      divisi: snapshotRows.map((r) => ({
        nama: r.nama,
        omzet: r.omzet,
        laba: r.laba,
        capaian: r.capaian,
        target: r.target,
        satuanTarget: r.satuanTarget,
        status: r.status,
        laporanAi: r.laporanAi,
        sumberAi: r.sumberAi,
      })),
    },
    riwayat,
  };
}

export function mapPayrollRows(rows: SheetRow[]): PayrollEntri[] {
  return rows
    .map((row, i) => ({
      bulan: row.bulan ?? "",
      nama: row.nama ?? "",
      totalInsentif: parseNum(row.total_insentif),
      totalBonus: parseNum(row.total_bonus),
      totalThp: parseNum(row.total_thp),
      rincianDivisi: row.rincian_divisi ?? "",
      _rowIndex: i,
    }))
    .sort((a, b) => b._rowIndex - a._rowIndex)
    .map(({ _rowIndex, ...rest }) => rest);
}

export function formatCapaian(nilai: number, satuan: string): string {
  if (satuan === "Rupiah") return "Rp " + nilai.toLocaleString("id-ID", { maximumFractionDigits: 0 });
  return nilai.toLocaleString("id-ID", { maximumFractionDigits: 0 }) + " " + satuan;
}

export type LaporanAiBagian = { ringkasan: string; evaluasi: string; rekomendasi: string; insight: string };

export function parseLaporanAi(teks: string): LaporanAiBagian {
  const labels = ["RINGKASAN:", "EVALUASI:", "REKOMENDASI:", "INSIGHT:"] as const;
  const ambil = (label: (typeof labels)[number]): string => {
    const i = teks.indexOf(label);
    if (i < 0) return "";
    let end = teks.length;
    for (const other of labels) {
      if (other === label) continue;
      const j = teks.indexOf(other, i + label.length);
      if (j >= 0 && j < end) end = j;
    }
    return teks.slice(i + label.length, end).trim();
  };
  return {
    ringkasan: ambil("RINGKASAN:"),
    evaluasi: ambil("EVALUASI:"),
    rekomendasi: ambil("REKOMENDASI:"),
    insight: ambil("INSIGHT:"),
  };
}
