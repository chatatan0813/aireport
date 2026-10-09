import { google } from "googleapis";
import type { AnggotaTimMedia } from "../tim-media";

export type PegawaiHrd = { nama: string; cabang: string; jabatan: string };

const JABATAN_TIM_MEDIA = "Content creator & Desain grafis";
const CABANG_TIM_MEDIA = "Creative";

/**
 * Dari seluruh baris HRD "Aktif", pilih yang jabatannya content
 * creator/desain grafis DAN cabangnya "Creative" -- sengaja bukan cuma
 * jabatan, karena baris jabatan yang sama ada juga untuk staf toko (mis.
 * Ery Rusadi di cabang CHTTN) yang insentifnya sudah dihitung lewat pool
 * toko sendiri, bukan Tim Media.
 *
 * Murni karyawan Creative -- TIDAK ada tambahan manual (mis. Head) lagi,
 * roster sepenuhnya mengikuti sheet HRD apa adanya.
 */
export function filterTimMedia(rows: PegawaiHrd[]): AnggotaTimMedia[] {
  return rows
    .filter((r) => r.jabatan === JABATAN_TIM_MEDIA && r.cabang === CABANG_TIM_MEDIA)
    .map((r) => ({ nama: r.nama, peran: null }));
}

/** Baca tab "Aktif" dari spreadsheet HRD -- sama persis skema (kolom A/G/H) dengan yang sudah dipakai CBCST/chttn-basic. */
export async function bacaPegawaiAktif(): Promise<PegawaiHrd[]> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  // Sheet terpisah dari GOOGLE_SHEET_ID (itu punya tab Payroll/AI-Reporting
  // sendiri) -- ini ID spreadsheet HRD "Aktif" yang sama dengan yang dipakai
  // CBCST/chttn-basic, dipakai service account yang sama juga.
  if (!process.env.GOOGLE_SHEET_ID_HRD) throw new Error("GOOGLE_SHEET_ID_HRD is not set");

  let credentials;
  try {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }

  const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] });
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID_HRD, range: "Aktif!A2:H" });

  return (res.data.values ?? [])
    .filter((row) => row[0])
    .map((row) => ({ nama: String(row[0]), cabang: String(row[6] ?? ""), jabatan: String(row[7] ?? "") }));
}

export async function getTimMediaRoster(): Promise<AnggotaTimMedia[]> {
  return filterTimMedia(await bacaPegawaiAktif());
}
