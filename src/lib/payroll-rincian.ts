// Parser untuk `PayrollEntri.rincianDivisi` -- satu blok teks bebas yang
// dikirim apa adanya oleh node "Hitung Payroll" di workflow n8n "Payroll
// Calculator Chatatan Group" (satu baris per divisi). Ini TIDAK ada di
// Sheet sebagai JSON terstruktur, jadi dipecah di sini supaya tampilan
// Payroll bisa jadi kartu rapi (dan sengaja SEMBUNYIKAN laba gabungan +
// pajak CV 10% -- itu angka perhitungan internal, bukan untuk slip).
//
// Contoh baris asli (lihat node "Hitung Payroll" di n8n untuk bentuk persisnya):
//   "CHTTN: omzet Rp 190.459.785, laba gabungan Rp 8.081.755, pajak CV 10%
//   Rp 808.176, laba bersih Rp 7.273.579, Tercapai -> insentif Rp 109.104
//   (1.5%), bonus Rp 181.839 (2.5%)"
//   "ChatBarber Pinus: omzet Rp 10.000.000, laba gabungan Rp -500.000 ->
//   Rugi -> insentif Rp0, bonus Rp0"

export type RincianDivisi = {
  divisi: string;
  rugi: boolean;
  labaBersih: number | null; // null kalau rugi -- workflow tidak pernah menghitungnya untuk divisi rugi
  status: string; // "Tercapai" | "Belum Tercapai" | "Rugi"
  insentif: number;
  insentifPersen: number | null;
  bonus: number;
  bonusPersen: number | null;
};

function parseRupiah(teks: string): number {
  const m = teks.match(/Rp\s*(-?[\d.]+)/);
  if (!m) return 0;
  return Number(m[1].replace(/\./g, ""));
}

export function parseRincianBaris(baris: string): RincianDivisi | null {
  const idx = baris.indexOf(":");
  if (idx === -1) return null;
  const divisi = baris.slice(0, idx).trim();
  const sisa = baris.slice(idx + 1);
  if (!divisi) return null;

  if (/Rugi/.test(sisa)) {
    return { divisi, rugi: true, labaBersih: null, status: "Rugi", insentif: 0, insentifPersen: null, bonus: 0, bonusPersen: null };
  }

  const labaBersihM = sisa.match(/laba bersih (Rp\s*-?[\d.]+)/);
  const statusM = sisa.match(/(Belum Tercapai|Tercapai)/);
  const insentifM = sisa.match(/insentif (Rp\s*-?[\d.]+)\s*\(([\d.,]+)%\)/);
  const bonusM = sisa.match(/bonus (Rp\s*-?[\d.]+)\s*\(([\d.,]+)%\)/);
  if (!statusM || !insentifM || !bonusM) return null;

  return {
    divisi,
    rugi: false,
    labaBersih: labaBersihM ? parseRupiah(labaBersihM[1]) : null,
    status: statusM[1],
    insentif: parseRupiah(insentifM[1]),
    insentifPersen: Number(insentifM[2].replace(",", ".")),
    bonus: parseRupiah(bonusM[1]),
    bonusPersen: Number(bonusM[2].replace(",", ".")),
  };
}

export function parseRincianPayroll(teks: string): RincianDivisi[] {
  return teks
    .split("\n")
    .map((b) => b.trim())
    .filter((b) => b !== "")
    .map(parseRincianBaris)
    .filter((r): r is RincianDivisi => r !== null);
}
