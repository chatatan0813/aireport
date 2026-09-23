"use client";

import { Fragment, useState } from "react";
import type { PayrollEntri } from "@/lib/transform";
import { formatRupiah } from "@/lib/rupiah";

export default function PayrollTable({ payroll }: { payroll: PayrollEntri[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [bulanFilter, setBulanFilter] = useState<string>("Semua");

  if (payroll.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 text-slate-400 shadow-sm ring-1 ring-slate-200">
        Belum ada payroll yang dihitung.
      </div>
    );
  }

  // `payroll` is already newest-bulan-first, so the order bulan names are
  // first encountered here is the order they should appear in the dropdown.
  const bulanOptions = ["Semua", ...Array.from(new Set(payroll.map((p) => p.bulan)))];
  const filtered = bulanFilter === "Semua" ? payroll : payroll.filter((p) => p.bulan === bulanFilter);

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Payroll</h3>
        <select
          value={bulanFilter}
          onChange={(e) => setBulanFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
        >
          {bulanOptions.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">Bulan</th>
              <th className="py-2 pr-4">Nama</th>
              <th className="py-2 pr-4">Total Insentif</th>
              <th className="py-2 pr-4">Total Bonus</th>
              <th className="py-2 pr-4">Total THP</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <Fragment key={i}>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-600">{p.bulan}</td>
                  <td className="py-2 pr-4 font-medium text-slate-900">{p.nama}</td>
                  <td className="py-2 pr-4 text-slate-700">Rp {formatRupiah(p.totalInsentif)}</td>
                  <td className="py-2 pr-4 text-slate-700">Rp {formatRupiah(p.totalBonus)}</td>
                  <td className="py-2 pr-4 font-semibold text-slate-900">Rp {formatRupiah(p.totalThp)}</td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => setExpanded(expanded === i ? null : i)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800"
                    >
                      {expanded === i ? "Tutup" : "Rincian"}
                    </button>
                  </td>
                </tr>
                {expanded === i && (
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td colSpan={6} className="px-4 py-3">
                      <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700">{p.rincianDivisi}</pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
