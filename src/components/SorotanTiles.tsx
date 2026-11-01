"use client";

import { motion } from "framer-motion";
import type { Divisi } from "@/lib/transform";
import { hitungSorotan, rupiahRingkas } from "@/lib/sorotan";
import { formatRupiah } from "@/lib/rupiah";

// Kotak warna penuh ala kartu "Team Profiles" di referensi Dark Mode Elevation.
// Warna terang = teks gelap, warna pekat = teks putih, supaya tetap kontras.
const TILE = [
  { latar: "bg-[#c6ff3d]", teks: "text-[#0b0d05]", glow: "rgba(198,255,61,0.45)" },
  { latar: "bg-[#ffd84d]", teks: "text-[#1a1404]", glow: "rgba(255,216,77,0.4)" },
  { latar: "bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9]", teks: "text-white", glow: "rgba(139,92,246,0.45)" },
  { latar: "bg-gradient-to-br from-[#fb923c] to-[#ec4899]", teks: "text-white", glow: "rgba(236,72,153,0.4)" },
];

const TILE_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export default function SorotanTiles({ divisi }: { divisi: Divisi[] }) {
  const s = hitungSorotan(divisi);
  const isi = [
    { label: "Total omzet", nilai: rupiahRingkas(s.totalOmzet), detail: `Rp ${formatRupiah(s.totalOmzet)}` },
    {
      label: "Total laba",
      nilai: s.totalLaba === null ? "—" : rupiahRingkas(s.totalLaba),
      detail: s.totalLaba === null ? "Belum ada data laba" : `Rp ${formatRupiah(s.totalLaba)}`,
    },
    { label: "Divisi tercapai", nilai: `${s.tercapai}/${s.jumlahDivisi}`, detail: `${s.jumlahDivisi - s.tercapai} divisi belum mencapai target` },
    {
      label: "Rata-rata capaian",
      nilai: s.rataCapaian === null ? "—" : `${s.rataCapaian.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`,
      detail: "Rata-rata % target semua divisi",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {isi.map((k, i) => {
        const t = TILE[i];
        return (
          <motion.div
            key={k.label}
            variants={TILE_VARIANTS}
            whileHover={{ y: -3 }}
            className={`relative overflow-hidden rounded-3xl p-4 md:p-5 ${t.latar} ${t.teks}`}
            style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 18px 40px -18px ${t.glow}` }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-display text-sm font-semibold leading-tight opacity-80 md:text-base">{k.label}</span>
              <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/85 text-xs text-white">↗</span>
            </div>
            <div className="font-display tabular mt-5 text-2xl font-bold leading-none tracking-tight md:text-4xl">{k.nilai}</div>
            <div className="mt-2 truncate text-xs font-medium opacity-70">{k.detail}</div>
          </motion.div>
        );
      })}
    </div>
  );
}
