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
  if (raw === undefined || raw === null || raw === "") return null;
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
    .map((row) => ({
      ...toDivisi(row),
      jenisLaporan: row.jenis_laporan ?? "",
      rentangDari: row.rentang_dari ?? "",
      rentangSampai: row.rentang_sampai ?? "",
      tanggalGenerate: row.tanggal_generate ?? "",
    }))
    .sort((a, b) => (a.tanggalGenerate < b.tanggalGenerate ? 1 : -1));

  if (riwayat.length === 0) {
    return { snapshotTerbaru: null, riwayat: [] };
  }

  const latestTs = riwayat[0].tanggalGenerate;
  const snapshotRows = riwayat.filter((r) => r.tanggalGenerate === latestTs);

  return {
    snapshotTerbaru: {
      jenisLaporan: snapshotRows[0].jenisLaporan,
      rentangDari: snapshotRows[0].rentangDari,
      rentangSampai: snapshotRows[0].rentangSampai,
      tanggalGenerate: latestTs,
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
    .map((row) => ({
      bulan: row.bulan ?? "",
      nama: row.nama ?? "",
      totalInsentif: parseNum(row.total_insentif),
      totalBonus: parseNum(row.total_bonus),
      totalThp: parseNum(row.total_thp),
      rincianDivisi: row.rincian_divisi ?? "",
      _ts: row.tanggal_generate ?? "",
    }))
    .sort((a, b) => (a._ts < b._ts ? 1 : -1))
    .map(({ _ts, ...rest }) => rest);
}
