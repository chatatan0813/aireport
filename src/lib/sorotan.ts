import type { Divisi } from "./transform";

export type Sorotan = {
  totalOmzet: number;
  totalLaba: number | null; // null kalau tidak ada satu pun divisi yang punya angka laba
  tercapai: number;
  jumlahDivisi: number;
  rataCapaian: number | null; // rata-rata % capaian (maks 100 per divisi), hanya divisi bertarget
};

/** Angka ringkasan untuk kotak warna di atas Live / Ringkasan. */
export function hitungSorotan(divisi: Divisi[]): Sorotan {
  const laba = divisi.map((d) => d.laba).filter((l): l is number => l !== null);
  const bertarget = divisi.filter((d) => d.target > 0);
  return {
    totalOmzet: divisi.reduce((s, d) => s + d.omzet, 0),
    totalLaba: laba.length ? laba.reduce((s, l) => s + l, 0) : null,
    tercapai: divisi.filter((d) => d.status === "Tercapai").length,
    jumlahDivisi: divisi.length,
    rataCapaian: bertarget.length
      ? bertarget.reduce((s, d) => s + Math.min((d.capaian / d.target) * 100, 100), 0) / bertarget.length
      : null,
  };
}

/** Rupiah ringkas untuk kotak besar: "Rp 191,9 jt", "Rp 1,25 M", "-Rp 1,2 jt". */
export function rupiahRingkas(n: number): string {
  const tanda = n < 0 ? "-" : "";
  const a = Math.abs(n);
  const fmt = (v: number, d: number) => v.toLocaleString("id-ID", { maximumFractionDigits: d });
  if (a >= 1e9) return `${tanda}Rp ${fmt(a / 1e9, 2)} M`;
  if (a >= 1e6) return `${tanda}Rp ${fmt(a / 1e6, 1)} jt`;
  return `${tanda}Rp ${fmt(a, 0)}`;
}
