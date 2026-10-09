import type { InsentifGroup, InsentifRincianDivisi } from "./insentif";

// 6 divisi yang jadi basis insentif Tim Media -- KONVEKSI sengaja TIDAK
// termasuk (itu punya pool insentif sendiri, lihat KonveksiInsentifService
// di chttn-basic), dan nama di sini harus persis sama dengan `name`/`divisi`
// yang dikembalikan endpoint daily-report tiap aplikasi.
const DIVISI_TIM_MEDIA = [
  "ChatBarber Cempaka",
  "ChatBarber Pinus",
  "ChatShoeTreatment Cempaka",
  "ChatShoeTreatment Pinus",
  "CHTTN",
  "ChatBox",
];

const RATE_INSENTIF = 0.001; // 0,1% dari omzet, selalu jalan
const RATE_BONUS = 0.003; // 0,3% dari omzet, hanya divisi yang capai target bulan itu

export type DivisiOmzet = { nama: string; omzet: number; target: number };
export type AnggotaTimMedia = { nama: string; peran: string | null };

/**
 * Insentif & bonus Tim Media (content creator + desain grafis), dihitung dari
 * omzet 6 divisi yang mereka bantu kontenkan -- bukan dari data yang sudah
 * ada di aplikasi manapun, rumus ini murni punya aireport sendiri.
 *
 * Tiap divisi: insentif = omzet x 0,1% (selalu), bonus = omzet x 0,3% HANYA
 * kalau omzet divisi itu sendiri sudah >= target-nya sendiri. Keenam hasil
 * dijumlah jadi satu pool insentif + satu pool bonus, baru dibagi rata ke
 * jumlah anggota yang dikasih (pembagian terakhir, bukan per-divisi).
 */
export function hitungTimMedia(divisiList: DivisiOmzet[], anggota: AnggotaTimMedia[]): InsentifGroup {
  const relevan = divisiList.filter((d) => DIVISI_TIM_MEDIA.includes(d.nama));

  let poolInsentif = 0;
  let poolBonus = 0;
  let jumlahTercapai = 0;
  const rincianDivisi: InsentifRincianDivisi[] = [];

  for (const d of relevan) {
    const insentifDivisi = Math.round(d.omzet * RATE_INSENTIF);
    const tercapai = d.target > 0 && d.omzet >= d.target;
    const bonusDivisi = tercapai ? Math.round(d.omzet * RATE_BONUS) : 0;

    poolInsentif += insentifDivisi;
    poolBonus += bonusDivisi;
    if (tercapai) jumlahTercapai += 1;

    rincianDivisi.push({ divisi: d.nama, omzet: d.omzet, target: d.target, tercapai, insentif: insentifDivisi, bonus: bonusDivisi });
  }

  const n = anggota.length;
  const pegawai =
    n === 0
      ? []
      : anggota.map((a, i) => {
          // Sisa pembulatan (kalau pool tidak habis dibagi rata) ditumpuk ke
          // orang terakhir, supaya jumlah semua baris selalu persis sama
          // dengan pool-nya -- bukan lebih/kurang beberapa rupiah karena
          // setiap baris dibulatkan sendiri-sendiri.
          const insentif = bagiRata(poolInsentif, n, i);
          const bonus = bagiRata(poolBonus, n, i);
          return { nama: a.nama, peran: a.peran, basis: null, insentif, bonus, total: insentif + bonus };
        });

  return {
    sumber: "Media",
    divisi: "Tim Media",
    targetTercapai: jumlahTercapai > 0,
    keterangan: `${jumlahTercapai} dari ${DIVISI_TIM_MEDIA.length} divisi capai target bulan ini`,
    catatan: null,
    pegawai,
    rincianDivisi,
  };
}

/**
 * Bagi `total` rata ke `n` orang dalam rupiah bulat. Sisa pembulatan (selalu
 * < n rupiah) ditumpuk satu-satu ke orang pertama secara berurutan, supaya
 * jumlah semua baris persis sama dengan `total` dan tidak ada orang yang
 * bedanya lebih dari Rp1 dari yang lain.
 */
function bagiRata(total: number, n: number, index: number): number {
  const rata = Math.floor(total / n);
  const sisa = Math.round(total) - rata * n;
  return index < sisa ? rata + 1 : rata;
}
