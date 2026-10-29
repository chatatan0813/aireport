// Kalkulator transfer sisa gaji (2026-10-29, permintaan owner).
//
// HRD mengisi sisa gaji tiap orang sekitar tgl 29/30. Sisa gaji itu dibagi ke
// rekening divisi (BSI/BTN/Mandiri, lihat payroll-bank.ts) sesuai PROPORSI
// LABA BULAN BERJALAN (data Live) dari divisi yang DIPEGANG orang itu saja --
// keputusan owner, beda dengan kartu Payroll yang memakai laba bulan lalu.
// Daftar divisi per orang mengikuti tabel Payroll Calculator; Pomade ikut
// ChatBarber (datanya memang tergabung di CBCST). Alpri hanya divisi utamanya
// (CHTTN, KONVEKSI), bukan divisi "lainnya" yang cuma bonus 0,5%.

import type { Divisi } from "./transform";
import { hitungPembayaranBank, type PembayaranBank } from "./payroll-bank";

const CBCST_CHATBARBER = ["chatbarber", "pomade"];
const CBCST_CST = ["chatshoetreatment"];

export const PENERIMA_GAJI: { nama: string; divisi: string[] }[] = [
  { nama: "Alpri Andrian", divisi: ["chttn", "konveksi"] },
  { nama: "Tisma H.", divisi: [...CBCST_CHATBARBER, "chatbox"] },
  { nama: "Erwan", divisi: [...CBCST_CHATBARBER, ...CBCST_CST, "chatbox"] },
  { nama: "Fitri Isnawati", divisi: [...CBCST_CST, "chttn"] },
  { nama: "Risky Annisa F.", divisi: [...CBCST_CHATBARBER, ...CBCST_CST, "chatbox", "chttn", "konveksi"] },
  { nama: "Rizki", divisi: [...CBCST_CHATBARBER, ...CBCST_CST, "chatbox", "chttn", "konveksi"] },
];

/** Divisi Live yang dipegang orang ini (dicocokkan dari awalan nama divisi). */
export function divisiDipegang(awalan: string[], divisi: Divisi[]): Divisi[] {
  return divisi.filter((d) => awalan.some((a) => d.nama.toLowerCase().startsWith(a)));
}

export function hitungTransferSisaGaji(
  awalan: string[],
  divisiLive: Divisi[],
  sisaGaji: number
): PembayaranBank[] {
  if (sisaGaji <= 0) return [];
  const rincian = divisiDipegang(awalan, divisiLive).map((d) => ({
    divisi: d.nama,
    labaBersih: d.laba,
    status: d.status,
  }));
  return hitungPembayaranBank(rincian, sisaGaji).bank;
}
