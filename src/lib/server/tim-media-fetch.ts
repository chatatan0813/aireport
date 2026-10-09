import type { InsentifGroup } from "../insentif";
import { hitungTimMedia, type AnggotaTimMedia, type DivisiOmzet } from "../tim-media";
import { getTimMediaRoster } from "./hrd-sheet";
import { statusDivisi } from "./live";

type RawDivision = {
  name: string;
  omzet?: unknown;
  target?: unknown;
  jumlahTransaksi?: unknown;
  jumlahPcs?: unknown;
};
type DailyReportResponse = { divisions?: unknown };

const SUMBER: { nama: string; url: string }[] = [
  { nama: "CHTTN", url: "https://chttn.chatatangroup.com/daftar-laporan-eksternal-harian" },
  { nama: "CBCST", url: "https://cbcst.chatatangroup.com/api/external/daily-report" },
  { nama: "ChatBox", url: "https://chatbox.chatatangroup.com/api/external/daily-report" },
];

/** Hari terakhir bulan `bulan` (YYYY-MM), aman untuk bulan 28/29/30/31 hari. */
function akhirBulan(bulan: string): string {
  const [tahun, bulanAngka] = bulan.split("-").map(Number);
  const hariTerakhir = new Date(Date.UTC(tahun, bulanAngka, 0)).getUTCDate();
  return `${bulan}-${String(hariTerakhir).padStart(2, "0")}`;
}

export type FetchTimMediaResult = { group: InsentifGroup | null; gagal: string[] };

export async function fetchTimMedia(
  bulan: string,
  opsi: { fetchImpl?: typeof fetch; ambilRoster?: () => Promise<AnggotaTimMedia[]> } = {},
): Promise<FetchTimMediaResult> {
  const token = process.env.AIREPORT_LIVE_TOKEN;
  if (!token) throw new Error("AIREPORT_LIVE_TOKEN is not set");

  const fetchImpl = opsi.fetchImpl ?? fetch;
  const ambilRoster = opsi.ambilRoster ?? getTimMediaRoster;
  const gagal: string[] = [];

  let anggota: AnggotaTimMedia[];
  try {
    anggota = await ambilRoster();
  } catch (err) {
    console.error("fetchTimMedia: gagal baca roster HRD:", err);
    return { group: null, gagal: ["Tim Media (roster)"] };
  }

  const awal = `${bulan}-01`;
  const akhir = akhirBulan(bulan);

  const hasilPerApp = await Promise.all(
    SUMBER.map(async (s): Promise<DivisiOmzet[]> => {
      try {
        const res = await fetchImpl(`${s.url}?from=${awal}&to=${akhir}`, {
          headers: { "X-API-Key": token },
          cache: "no-store",
        });
        if (!res.ok) {
          gagal.push(s.nama);
          return [];
        }
        const json = (await res.json()) as DailyReportResponse;
        if (!Array.isArray(json.divisions)) {
          gagal.push(s.nama);
          return [];
        }
        return (json.divisions as RawDivision[])
          .filter((d): d is RawDivision & { name: string } => typeof d.name === "string")
          .map((d) => {
            const omzet = Number(d.omzet) || 0;
            // statusDivisi() sendiri yang menentukan satuan capaian yang
            // benar per jenis divisi (kepala/pekerjaan/pcs/Rupiah) -- lihat
            // catatan di tim-media.ts kenapa ini tidak boleh dihitung ulang
            // dengan membandingkan omzet langsung ke target di sini.
            const status = statusDivisi(d.name, {
              name: d.name,
              omzet,
              target: Number(d.target) || 0,
              jumlahTransaksi: Number(d.jumlahTransaksi) || 0,
              jumlahPcs: Number(d.jumlahPcs) || 0,
            });
            return { nama: d.name, omzet, status };
          });
      } catch {
        gagal.push(s.nama);
        return [];
      }
    }),
  );

  const group = hitungTimMedia(hasilPerApp.flat(), anggota);
  return { group, gagal };
}
