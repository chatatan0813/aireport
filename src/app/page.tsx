"use client";

import { useEffect, useState } from "react";
import DivisiCard from "@/components/DivisiCard";
import OmzetChart from "@/components/OmzetChart";
import RiwayatTable from "@/components/RiwayatTable";
import PayrollTable from "@/components/PayrollTable";
import type { SnapshotTerbaru, RiwayatEntri, PayrollEntri } from "@/lib/transform";

type LaporanResponse = {
  snapshotTerbaru: SnapshotTerbaru | null;
  riwayat: RiwayatEntri[];
  payroll: PayrollEntri[];
  stale: boolean;
};

const TABS = ["Ringkasan", "Riwayat", "Payroll"] as const;
type Tab = (typeof TABS)[number];

export default function DashboardPage() {
  const [data, setData] = useState<LaporanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Ringkasan");

  useEffect(() => {
    fetch("/api/laporan")
      .then((res) => {
        if (!res.ok) throw new Error("gagal");
        return res.json();
      })
      .then(setData)
      .catch(() => setError("Gagal memuat data, hubungi admin"));
  }, []);

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }
  if (!data) {
    return <div className="p-8 text-slate-500">Memuat...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">AI Reporting — Chatatan Group</h1>
        {data.stale && (
          <div className="mt-2 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
            Gagal memuat data terbaru, menampilkan data terakhir tersimpan.
          </div>
        )}
        {data.snapshotTerbaru && (
          <p className="mt-1 text-sm text-slate-500">
            {data.snapshotTerbaru.jenisLaporan} · {data.snapshotTerbaru.rentangDari} s.d. {data.snapshotTerbaru.rentangSampai} · dibuat {data.snapshotTerbaru.tanggalGenerate}
          </p>
        )}
      </header>

      <nav className="mb-6 flex gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${tab === t ? "border-b-2 border-slate-900 text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Ringkasan" && data.snapshotTerbaru && (
        <div className="space-y-6">
          <OmzetChart divisi={data.snapshotTerbaru.divisi} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.snapshotTerbaru.divisi.map((d) => (
              <DivisiCard key={d.nama} divisi={d} />
            ))}
          </div>
        </div>
      )}
      {tab === "Ringkasan" && !data.snapshotTerbaru && (
        <p className="text-slate-500">Belum ada laporan tersimpan.</p>
      )}

      {tab === "Riwayat" && <RiwayatTable riwayat={data.riwayat} />}
      {tab === "Payroll" && <PayrollTable payroll={data.payroll} />}
    </div>
  );
}
