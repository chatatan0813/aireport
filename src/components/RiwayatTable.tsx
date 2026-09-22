"use client";

import { useState } from "react";
import type { RiwayatEntri } from "@/lib/transform";
import { formatRupiah } from "@/lib/rupiah";

const JENIS_OPTIONS = ["Semua", "Bulanan", "Dekade1", "Dekade2"] as const;

export default function RiwayatTable({ riwayat }: { riwayat: RiwayatEntri[] }) {
  const [filter, setFilter] = useState<(typeof JENIS_OPTIONS)[number]>("Semua");
  const filtered = filter === "Semua" ? riwayat : riwayat.filter((r) => r.jenisLaporan === filter);

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Riwayat Laporan</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as (typeof JENIS_OPTIONS)[number])}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
        >
          {JENIS_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">Tanggal</th>
              <th className="py-2 pr-4">Jenis</th>
              <th className="py-2 pr-4">Divisi</th>
              <th className="py-2 pr-4">Omzet</th>
              <th className="py-2 pr-4">Laba</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2 pr-4 text-slate-600">{r.tanggalGenerate}</td>
                <td className="py-2 pr-4 text-slate-600">{r.jenisLaporan}</td>
                <td className="py-2 pr-4 font-medium text-slate-900">{r.nama}</td>
                <td className="py-2 pr-4 text-slate-700">Rp {formatRupiah(r.omzet)}</td>
                <td className="py-2 pr-4 text-slate-700">{r.laba === null ? "—" : "Rp " + formatRupiah(r.laba)}</td>
                <td className="py-2 pr-4 text-slate-700">{r.status}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">Belum ada data.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
