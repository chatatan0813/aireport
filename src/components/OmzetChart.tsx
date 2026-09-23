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
          <div key={satuan} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-display mb-4 font-semibold text-slate-100">{SATUAN_LABEL[satuan] ?? `Capaian vs Target (${satuan})`}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f222a" />
                <XAxis dataKey="nama" tick={{ fontSize: 11, fill: "#767c8a" }} stroke="#1f222a" />
                <YAxis tickFormatter={(v) => formatRupiah(Number(v))} width={80} tick={{ fontSize: 11, fill: "#767c8a" }} stroke="#1f222a" />
                <Tooltip
                  formatter={(v) => formatNilai(Number(v), satuan)}
                  contentStyle={{ background: "#14161c", border: "1px solid #1f222a", borderRadius: 8, color: "#e7e9ee" }}
                  labelStyle={{ color: "#e7e9ee" }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: "#767c8a" }} />
                <Bar dataKey="Capaian" fill="#6fe3b4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Target" fill="#2a2e38" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
