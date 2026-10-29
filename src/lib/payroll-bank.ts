// Rincian pembayaran payroll per bank (2026-10-14, permintaan owner).
//
// Tiap divisi dibayar dari rekening perusahaannya sendiri: divisi CBCST
// (ChatBarber, ChatShoeTreatment, Pomade) dari BSI, ChatBox dari BTN,
// CHTTN dan KONVEKSI dari Mandiri (sebelumnya BRI, diganti owner 2026-10-29). Total THP satu orang dibagi ke bank-bank itu
// SESUAI PROPORSI LABA BERSIH tiap divisi (keputusan owner: bukan dari
// insentif+bonus yang dihasilkan tiap divisi). Divisi rugi / laba <= 0
// dihitung 0%.

import type { RincianDivisi } from "./payroll-rincian";

export type Bank = "BSI" | "BTN" | "Mandiri" | "Lainnya";

const URUTAN_BANK: Bank[] = ["BSI", "BTN", "Mandiri", "Lainnya"];

export function bankDivisi(divisi: string): Exclude<Bank, "Lainnya"> | null {
  const d = divisi.toLowerCase();
  if (d.startsWith("chatbarber") || d.startsWith("chatshoetreatment") || d.startsWith("pomade")) return "BSI";
  if (d.startsWith("chatbox")) return "BTN";
  if (d.startsWith("chttn") || d.startsWith("konveksi")) return "Mandiri";
  return null;
}

export type PembayaranDivisi = {
  divisi: string;
  bank: Bank;
  status: string;
  labaBersih: number | null;
  persen: number; // pecahan 0..1
};

export type PembayaranBank = { bank: Bank; persen: number; nominal: number };

export function hitungPembayaranBank(
  rincian: RincianDivisi[],
  totalThp: number
): { divisi: PembayaranDivisi[]; bank: PembayaranBank[] } {
  const labaPositif = rincian.map((r) => Math.max(r.labaBersih ?? 0, 0));
  const totalLaba = labaPositif.reduce((s, n) => s + n, 0);

  const divisi: PembayaranDivisi[] = rincian.map((r, i) => ({
    divisi: r.divisi,
    bank: bankDivisi(r.divisi) ?? "Lainnya",
    status: r.status,
    labaBersih: r.labaBersih,
    persen: totalLaba > 0 ? labaPositif[i] / totalLaba : 0,
  }));

  if (totalLaba <= 0) return { divisi, bank: [] };

  const persenBank = new Map<Bank, number>();
  for (const d of divisi) {
    if (d.persen > 0) persenBank.set(d.bank, (persenBank.get(d.bank) ?? 0) + d.persen);
  }
  const daftar = URUTAN_BANK.filter((b) => persenBank.has(b)).map((b) => ({ bank: b, persen: persenBank.get(b)! }));

  // Pembulatan sisa terbesar: dibulatkan ke bawah dulu, lalu sisa Rupiahnya
  // dibagikan ke bank dengan pecahan terbesar -- jadi jumlahnya selalu TEPAT
  // Total THP (tidak selisih Rp1 karena pembulatan).
  const mentah = daftar.map((b) => b.persen * totalThp);
  const nominal = mentah.map(Math.floor);
  let sisa = Math.round(totalThp) - nominal.reduce((s, n) => s + n, 0);
  const urutSisa = mentah.map((m, i) => ({ i, pecahan: m - Math.floor(m) })).sort((a, b) => b.pecahan - a.pecahan);
  for (let k = 0; sisa > 0 && k < urutSisa.length; k++, sisa--) nominal[urutSisa[k].i] += 1;

  return { divisi, bank: daftar.map((b, i) => ({ ...b, nominal: nominal[i] })) };
}
