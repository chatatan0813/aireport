"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DivisiCard from "@/components/DivisiCard";
import OmzetChart from "@/components/OmzetChart";
import RiwayatTable from "@/components/RiwayatTable";
import PayrollTable from "@/components/PayrollTable";
import type { SnapshotTerbaru, RiwayatEntri, PayrollEntri, PeriodeOption } from "@/lib/transform";
import { getPeriodeOptions, buildSnapshotForPeriode } from "@/lib/transform";

type LaporanResponse = {
  snapshotTerbaru: SnapshotTerbaru | null;
  riwayat: RiwayatEntri[];
  payroll: PayrollEntri[];
  stale: boolean;
};

const TABS = ["Ringkasan", "Riwayat", "Payroll"] as const;
type Tab = (typeof TABS)[number];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<LaporanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Ringkasan");
  const [periodeKey, setPeriodeKey] = useState<string>("terbaru");

  useEffect(() => {
    fetch("/api/laporan")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        if (!res.ok) throw new Error("gagal");
        return res.json();
      })
      .then((json) => {
        if (json) setData(json);
      })
      .catch(() => setError("Gagal memuat data, hubungi admin"));
  }, [router]);

  const handleLogout = () => {
    fetch("/api/logout", { method: "POST" }).finally(() => router.push("/login"));
  };

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }
  if (!data) {
    return <div className="p-8 text-slate-500">Memuat...</div>;
  }

  const keyOf = (p: PeriodeOption) => `${p.jenisLaporan}|${p.rentangDari}|${p.rentangSampai}`;
  const periodeOptions = getPeriodeOptions(data.riwayat);
  const periodeDipilih = periodeOptions.find((p) => keyOf(p) === periodeKey);
  const snapshotDitampilkan =
    periodeKey === "terbaru" || !periodeDipilih
      ? data.snapshotTerbaru
      : (buildSnapshotForPeriode(data.riwayat, periodeDipilih) ?? data.snapshotTerbaru);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">AI Reporting — Chatatan Group</h1>
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-700"
          >
            Keluar
          </button>
        </div>
        {data.stale && (
          <div className="mt-2 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
            Gagal memuat data terbaru, menampilkan data terakhir tersimpan.
          </div>
        )}
        {snapshotDitampilkan && (
          <p className="mt-1 text-sm text-slate-500">
            {snapshotDitampilkan.jenisLaporan} · {snapshotDitampilkan.rentangDari} s.d. {snapshotDitampilkan.rentangSampai} · dibuat {snapshotDitampilkan.tanggalGenerate}
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

      {tab === "Ringkasan" && (
        <div className="mb-4 max-w-xs">
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="periode">
            Periode
          </label>
          <select
            id="periode"
            value={periodeKey}
            onChange={(e) => setPeriodeKey(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="terbaru">Terbaru</option>
            {periodeOptions.map((p) => (
              <option key={keyOf(p)} value={keyOf(p)}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {tab === "Ringkasan" && snapshotDitampilkan && (
        <div className="space-y-6">
          <OmzetChart divisi={snapshotDitampilkan.divisi} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {snapshotDitampilkan.divisi.map((d) => (
              <DivisiCard key={d.nama} divisi={d} />
            ))}
          </div>
        </div>
      )}
      {tab === "Ringkasan" && !snapshotDitampilkan && (
        <p className="text-slate-500">Belum ada laporan tersimpan.</p>
      )}

      {tab === "Riwayat" && <RiwayatTable riwayat={data.riwayat} />}
      {tab === "Payroll" && <PayrollTable payroll={data.payroll} />}
    </div>
  );
}
