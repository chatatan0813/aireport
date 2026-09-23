"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { Divisi } from "@/lib/transform";
import { formatRupiah } from "@/lib/rupiah";

const SATUAN_LABEL: Record<string, string> = {
  Rupiah: "Omzet vs Target (Rupiah)",
  kepala: "Capaian vs Target (kepala)",
  pekerjaan: "Capaian vs Target (pekerjaan)",
  pcs: "Capaian vs Target (pcs)",
};

function formatNilai(n: number, satuan: string): string {
  return satuan === "Rupiah" ? "Rp " + formatRupiah(n) : formatRupiah(n) + " " + satuan;
}

export default function OmzetChart({ divisi }: { divisi: Divisi[] }) {
  const grup = new Map<string, Divisi[]>();
  for (const d of divisi) {
    const list = grup.get(d.satuanTarget) ?? [];
    list.push(d);
    grup.set(d.satuanTarget, list);
  }
  const kelompok = Array.from(grup.entries());

  if (kelompok.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {kelompok.map(([satuan, list]) => {
        const data = list.map((d) => ({ nama: d.nama, Capaian: d.capaian, Target: d.target }));
        return (
          <div key={satuan} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h3 className="mb-4 font-semibold text-slate-900">{SATUAN_LABEL[satuan] ?? `Capaian vs Target (${satuan})`}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="nama" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => formatRupiah(Number(v))} width={80} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatNilai(Number(v), satuan)} />
                <Legend />
                <Bar dataKey="Capaian" fill="#0f172a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Target" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
