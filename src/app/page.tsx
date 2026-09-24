"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DivisiCard from "@/components/DivisiCard";
import OmzetChart from "@/components/OmzetChart";
import RiwayatTable from "@/components/RiwayatTable";
import PayrollTable from "@/components/PayrollTable";
import type { SnapshotTerbaru, RiwayatEntri, PayrollEntri, PeriodeOption, Divisi } from "@/lib/transform";
import { getPeriodeOptions, buildSnapshotForPeriode } from "@/lib/transform";

type LaporanResponse = {
  snapshotTerbaru: SnapshotTerbaru | null;
  riwayat: RiwayatEntri[];
  payroll: PayrollEntri[];
  stale: boolean;
};

type LiveResponse = {
  divisi: Divisi[];
  gagal: string[];
  awal: string;
  akhir: string;
};

const TABS = ["Ringkasan", "Live", "Riwayat", "Payroll"] as const;
type Tab = (typeof TABS)[number];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<LaporanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Ringkasan");
  const [periodeKey, setPeriodeKey] = useState<string>("terbaru");
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  const muatLive = () => {
    setLiveLoading(true);
    setLiveError(null);
    fetch("/api/live")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        if (!res.ok) throw new Error("gagal");
        return res.json();
      })
      .then((json) => {
        if (json) setLive(json);
      })
      .catch(() => setLiveError("Gagal memuat data live, hubungi admin"))
      .finally(() => setLiveLoading(false));
  };

  useEffect(() => {
    if (tab === "Live" && !live && !liveLoading) muatLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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
    return <div className="min-h-screen bg-slate-950 p-8 text-rose-400">{error}</div>;
  }
  if (!data) {
    return <div className="min-h-screen bg-slate-950 p-8 text-slate-400">Memuat...</div>;
  }

  const keyOf = (p: PeriodeOption) => `${p.jenisLaporan}|${p.rentangDari}|${p.rentangSampai}`;
  const periodeOptions = getPeriodeOptions(data.riwayat);
  const periodeDipilih = periodeOptions.find((p) => keyOf(p) === periodeKey);
  const snapshotDitampilkan =
    periodeKey === "terbaru" || !periodeDipilih
      ? data.snapshotTerbaru
      : (buildSnapshotForPeriode(data.riwayat, periodeDipilih) ?? data.snapshotTerbaru);

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-10">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-2xl font-semibold text-slate-100">AI Reporting — Chatatan Group</h1>
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Keluar
          </button>
        </div>
        {data.stale && (
          <div className="mt-2 rounded-lg bg-amber-950/40 px-4 py-2 text-sm text-amber-400 ring-1 ring-amber-900">
            Gagal memuat data terbaru, menampilkan data terakhir tersimpan.
          </div>
        )}
        {snapshotDitampilkan && (
          <p className="mt-1 text-sm text-slate-400">
            {snapshotDitampilkan.jenisLaporan} · {snapshotDitampilkan.rentangDari} s.d. {snapshotDitampilkan.rentangSampai} · dibuat {snapshotDitampilkan.tanggalGenerate}
          </p>
        )}
      </header>

      <nav className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`font-display rounded-full px-4 py-2 text-sm font-semibold ${tab === t ? "bg-emerald-950 text-emerald-400" : "text-slate-400 hover:text-slate-200"}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Ringkasan" && (
        <div className="mb-4 max-w-xs">
          <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="periode">
            Periode
          </label>
          <select
            id="periode"
            value={periodeKey}
            onChange={(e) => setPeriodeKey(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
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
        <p className="text-slate-400">Belum ada laporan tersimpan.</p>
      )}

      {tab === "Live" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              {live ? `Bulan berjalan · ${live.awal} s.d. ${live.akhir}` : "Bulan berjalan"} — ditarik langsung dari 3 aplikasi, tanpa narasi AI.
            </p>
            <button
              onClick={muatLive}
              disabled={liveLoading}
              className="shrink-0 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              {liveLoading ? "Memuat..." : "Refresh"}
            </button>
          </div>

          {liveError && <p className="text-rose-400">{liveError}</p>}

          {live && live.gagal.length > 0 && (
            <div className="rounded-lg bg-amber-950/40 px-4 py-2 text-sm text-amber-400 ring-1 ring-amber-900">
              Gagal ambil data dari: {live.gagal.join(", ")} — divisi terkait tidak masuk di bawah ini.
            </div>
          )}

          {live && live.divisi.length > 0 && (
            <div className="space-y-6">
              <OmzetChart divisi={live.divisi} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {live.divisi.map((d) => (
                  <DivisiCard key={d.nama} divisi={d} />
                ))}
              </div>
            </div>
          )}

          {live && live.divisi.length === 0 && !liveLoading && (
            <p className="text-slate-400">Tidak ada data.</p>
          )}

          {!live && liveLoading && <p className="text-slate-400">Memuat data live...</p>}
        </div>
      )}

      {tab === "Riwayat" && <RiwayatTable riwayat={data.riwayat} />}
      {tab === "Payroll" && <PayrollTable payroll={data.payroll} />}
    </div>
  );
}
