"use client";

import { useState } from "react";
import type { PayrollEntri } from "@/lib/transform";
import { formatRupiah } from "@/lib/rupiah";

function Rupiah({ nilai, tebal = false }: { nilai: number; tebal?: boolean }) {
  if (nilai === 0) return <span className="text-slate-600">—</span>;
  const warna = tebal ? "font-semibold text-lime-400" : "text-slate-300";
  return <span className={`whitespace-nowrap ${warna}`}>Rp {formatRupiah(nilai)}</span>;
}

function KartuPayroll({ entri }: { entri: PayrollEntri }) {
  // rincianDivisi datang dari n8n sebagai satu blok teks (satu baris per
  // divisi, sudah diformat Rupiah) -- bukan JSON terstruktur, jadi dipecah
  // per baris di sini untuk ditampilkan, tanpa diparse lebih jauh.
  const rincianBaris = entri.rincianDivisi.split("\n").filter((b) => b.trim() !== "");

  return (
    <div className="rounded-3xl border border-[#1f2023] bg-[#111214] p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <div className="text-xs font-medium tracking-wide text-slate-500">{entri.bulan}</div>
          <h3 className="font-display font-semibold text-slate-100">{entri.nama}</h3>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <dt className="text-xs text-slate-500">Insentif</dt>
          <dd className="tabular font-display mt-1 text-sm"><Rupiah nilai={entri.totalInsentif} /></dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Bonus</dt>
          <dd className="tabular font-display mt-1 text-sm"><Rupiah nilai={entri.totalBonus} /></dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Total THP</dt>
          <dd className="tabular font-display mt-1 text-sm"><Rupiah nilai={entri.totalThp} tebal /></dd>
        </div>
      </dl>

      {rincianBaris.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 marker:content-none hover:text-lime-300">
            Rincian per divisi
          </summary>
          <div className="mt-2 space-y-1.5 border-t border-[#1f2023] pt-3 text-xs text-slate-400">
            {rincianBaris.map((baris, i) => (
              <p key={i}>{baris}</p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export default function PayrollTable({ payroll }: { payroll: PayrollEntri[] }) {
  const [bulanFilter, setBulanFilter] = useState<string>("Semua");

  if (payroll.length === 0) {
    return (
      <div className="rounded-3xl border border-[#1f2023] bg-[#111214] p-5 text-slate-500">
        Belum ada payroll yang dihitung.
      </div>
    );
  }

  // `payroll` is already newest-bulan-first, so the order bulan names are
  // first encountered here is the order they should appear in the dropdown.
  const bulanOptions = ["Semua", ...Array.from(new Set(payroll.map((p) => p.bulan)))];
  const filtered = bulanFilter === "Semua" ? payroll : payroll.filter((p) => p.bulan === bulanFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display font-semibold text-slate-100">Payroll</h3>
        <select
          value={bulanFilter}
          onChange={(e) => setBulanFilter(e.target.value)}
          className="rounded-xl border border-[#1f2023] bg-[#0a0a0c] px-2 py-1.5 text-sm text-slate-100 focus:border-lime-400/40 focus:outline-none"
        >
          {bulanOptions.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-slate-500">Tidak ada payroll untuk bulan ini.</p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {filtered.map((p, i) => (
            <KartuPayroll key={`${p.bulan}-${p.nama}-${i}`} entri={p} />
          ))}
        </div>
      )}
    </div>
  );
}
