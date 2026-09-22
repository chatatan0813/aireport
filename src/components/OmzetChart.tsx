"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { Divisi } from "@/lib/transform";
import { formatRupiah } from "@/lib/rupiah";

export default function OmzetChart({ divisi }: { divisi: Divisi[] }) {
  const data = divisi
    .filter((d) => d.satuanTarget === "Rupiah")
    .map((d) => ({ nama: d.nama, Omzet: d.omzet, Target: d.target }));

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-4 font-semibold text-slate-900">Omzet vs Target (divisi berbasis Rupiah)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="nama" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => formatRupiah(Number(v))} width={80} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => "Rp " + formatRupiah(Number(v))} />
          <Legend />
          <Bar dataKey="Omzet" fill="#0f172a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Target" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
