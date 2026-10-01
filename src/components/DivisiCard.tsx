"use client";

import { useEffect, useRef, useState } from "react";
import { motion, animate } from "framer-motion";
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import type { Divisi } from "@/lib/transform";
import { formatRupiah } from "@/lib/rupiah";
import { formatCapaian, parseLaporanAi } from "@/lib/transform";

const STATUS_STYLE: Record<string, string> = {
  Tercapai: "bg-emerald-950 text-emerald-400",
  "Belum Tercapai": "bg-rose-950 text-rose-400",
  "Target belum diatur": "bg-slate-800 text-slate-400",
};

// Warna cincin dicicilkan per kartu (bukan berdasar status) -- murni variasi
// visual kayak referensi (kuning/ungu/cyan/oranye/biru/pink), status tetap
// kelihatan lewat badge teks di sampingnya.
const WARNA_CINCIN = ["#d4f832", "#7c3aed", "#22d3ee", "#f97316", "#0ea5e9", "#ec4899"];

// Angka persen di tengah cincin dianimasikan ngitung naik dari 0 ke nilai
// akhir (bukan loncat langsung) -- senada sama cincinnya yang juga animasi
// ngisi dari 0%.
function usePersenCountUp(target: number) {
  const [tampil, setTampil] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    const dari = prevTarget.current;
    prevTarget.current = target;
    const kontrol = animate(dari, target, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => setTampil(v),
    });
    return () => kontrol.stop();
  }, [target]);
  return tampil;
}

export default function DivisiCard({ divisi, index = 0 }: { divisi: Divisi; index?: number }) {
  const [open, setOpen] = useState(false);
  const bagian = parseLaporanAi(divisi.laporanAi);
  const badgeClass = STATUS_STYLE[divisi.status] ?? "bg-slate-800 text-slate-400";
  const persen = divisi.target > 0 ? Math.min((divisi.capaian / divisi.target) * 100, 100) : 0;
  const persenTampil = usePersenCountUp(persen);
  const warna = WARNA_CINCIN[index % WARNA_CINCIN.length];

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="rounded-3xl border border-[#1f2023] bg-[#111214] p-5 shadow-[0_0_0_1px_rgba(0,0,0,0)] transition-shadow hover:border-lime-400/20 hover:shadow-[0_0_24px_-8px_rgba(198,255,61,0.25)]"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>{divisi.status}</span>
      </div>

      <div className="relative mx-auto h-[200px] w-[200px]">
        <RadialBarChart
          width={200}
          height={200}
          cx="50%"
          cy="50%"
          innerRadius="82%"
          outerRadius="100%"
          barSize={10}
          data={[{ value: persen, fill: warna }]}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: "#1c1d20" }} dataKey="value" cornerRadius={20} animationDuration={900} animationEasing="ease-out" />
        </RadialBarChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <div className="font-display text-sm font-semibold text-slate-200">{divisi.nama}</div>
          <div className="tabular mt-1 text-2xl font-bold text-slate-50">{persenTampil.toFixed(2)}%</div>
        </div>
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Target</dt>
          <dd className="tabular font-medium text-slate-200">{divisi.target > 0 ? formatCapaian(divisi.target, divisi.satuanTarget) : "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Capaian</dt>
          <dd className="tabular font-medium text-slate-200">{formatCapaian(divisi.capaian, divisi.satuanTarget)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Omzet</dt>
          <dd className="tabular font-medium text-slate-200">Rp {formatRupiah(divisi.omzet)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Laba</dt>
          <dd className={`tabular font-medium ${divisi.laba !== null && divisi.laba < 0 ? "text-rose-400" : "text-slate-200"}`}>
            {divisi.laba === null ? "—" : "Rp " + formatRupiah(divisi.laba)}
          </dd>
        </div>
      </dl>

      {divisi.laporanAi && (
        <button onClick={() => setOpen((v) => !v)} className="mt-4 text-xs font-medium text-slate-500 hover:text-lime-300">
          {open ? "Sembunyikan analisis AI ▲" : "Lihat analisis AI ▼"}
        </button>
      )}
      {open && divisi.laporanAi && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25 }}
          className="mt-3 space-y-2 overflow-hidden border-t border-[#1f2023] pt-3 text-sm text-slate-300"
        >
          <p><span className="font-medium text-slate-100">Ringkasan:</span> {bagian.ringkasan || "—"}</p>
          <p><span className="font-medium text-slate-100">Evaluasi:</span> {bagian.evaluasi || "—"}</p>
          <p><span className="font-medium text-slate-100">Rekomendasi:</span> {bagian.rekomendasi || "—"}</p>
          <p><span className="font-medium text-slate-100">Insight:</span> {bagian.insight || "—"}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
