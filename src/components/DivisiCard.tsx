"use client";

import { useState } from "react";
import type { Divisi } from "@/lib/transform";
import { formatRupiah } from "@/lib/rupiah";
import { formatCapaian, parseLaporanAi } from "@/lib/transform";

const STATUS_STYLE: Record<string, string> = {
  Tercapai: "bg-green-100 text-green-800",
  "Belum Tercapai": "bg-red-100 text-red-800",
  "Target belum diatur": "bg-slate-100 text-slate-600",
};

export default function DivisiCard({ divisi }: { divisi: Divisi }) {
  const [open, setOpen] = useState(false);
  const bagian = parseLaporanAi(divisi.laporanAi);
  const badgeClass = STATUS_STYLE[divisi.status] ?? "bg-slate-100 text-slate-600";

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-3 flex items-start justify-between">
        <h3 className="font-semibold text-slate-900">{divisi.nama}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>{divisi.status}</span>
      </div>
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Omzet</dt>
          <dd className="font-medium text-slate-900">Rp {formatRupiah(divisi.omzet)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Laba</dt>
          <dd className="font-medium text-slate-900">{divisi.laba === null ? "—" : "Rp " + formatRupiah(divisi.laba)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Capaian</dt>
          <dd className="text-slate-700">{formatCapaian(divisi.capaian, divisi.satuanTarget)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Target</dt>
          <dd className="text-slate-700">{divisi.target > 0 ? formatCapaian(divisi.target, divisi.satuanTarget) : "belum diatur"}</dd>
        </div>
      </dl>
      <button onClick={() => setOpen((v) => !v)} className="mt-3 text-xs font-medium text-slate-500 hover:text-slate-800">
        {open ? "Sembunyikan analisis AI ▲" : "Lihat analisis AI ▼"}
      </button>
      {open && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm text-slate-700">
          <p><span className="font-medium">Ringkasan:</span> {bagian.ringkasan || "—"}</p>
          <p><span className="font-medium">Evaluasi:</span> {bagian.evaluasi || "—"}</p>
          <p><span className="font-medium">Rekomendasi:</span> {bagian.rekomendasi || "—"}</p>
          <p><span className="font-medium">Insight:</span> {bagian.insight || "—"}</p>
        </div>
      )}
    </div>
  );
}
