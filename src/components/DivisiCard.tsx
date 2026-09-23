"use client";

import { useState } from "react";
import type { Divisi } from "@/lib/transform";
import { formatRupiah } from "@/lib/rupiah";
import { formatCapaian, parseLaporanAi } from "@/lib/transform";

const STATUS_STYLE: Record<string, string> = {
  Tercapai: "bg-emerald-950 text-emerald-400",
  "Belum Tercapai": "bg-rose-950 text-rose-400",
  "Target belum diatur": "bg-slate-800 text-slate-400",
};

export default function DivisiCard({ divisi }: { divisi: Divisi }) {
  const [open, setOpen] = useState(false);
  const bagian = parseLaporanAi(divisi.laporanAi);
  const badgeClass = STATUS_STYLE[divisi.status] ?? "bg-slate-800 text-slate-400";
  const persen = divisi.target > 0 ? Math.min((divisi.capaian / divisi.target) * 100, 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display font-semibold text-slate-100">{divisi.nama}</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>{divisi.status}</span>
      </div>

      <div className="tabular font-display text-2xl font-semibold text-slate-100">
        {formatCapaian(divisi.capaian, divisi.satuanTarget)}
        {divisi.target > 0 && (
          <span className="ml-2 text-sm font-medium text-slate-500">/ {formatCapaian(divisi.target, divisi.satuanTarget)}</span>
        )}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${persen}%` }} />
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
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

      <button onClick={() => setOpen((v) => !v)} className="mt-4 text-xs font-medium text-slate-500 hover:text-slate-300">
        {open ? "Sembunyikan analisis AI ▲" : "Lihat analisis AI ▼"}
      </button>
      {open && (
        <div className="mt-3 space-y-2 border-t border-slate-800 pt-3 text-sm text-slate-300">
          <p><span className="font-medium text-slate-100">Ringkasan:</span> {bagian.ringkasan || "—"}</p>
          <p><span className="font-medium text-slate-100">Evaluasi:</span> {bagian.evaluasi || "—"}</p>
          <p><span className="font-medium text-slate-100">Rekomendasi:</span> {bagian.rekomendasi || "—"}</p>
          <p><span className="font-medium text-slate-100">Insight:</span> {bagian.insight || "—"}</p>
        </div>
      )}
    </div>
  );
}
