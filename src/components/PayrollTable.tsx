"use client";

import { useState } from "react";
import type { PayrollEntri } from "@/lib/transform";
import { formatRupiah } from "@/lib/rupiah";
import { parseRincianPayroll } from "@/lib/payroll-rincian";
import { useCetakKartu } from "@/lib/use-cetak-kartu";

function Rupiah({ nilai, tebal = false }: { nilai: number; tebal?: boolean }) {
  if (nilai === 0) return <span className="text-slate-600">—</span>;
  const warna = tebal ? "font-semibold text-lime-400" : "text-slate-300";
  return <span className={`whitespace-nowrap ${warna}`}>Rp {formatRupiah(nilai)}</span>;
}

function BadgeStatus({ status }: { status: string }) {
  const kelas =
    status === "Tercapai"
      ? "bg-emerald-950 text-emerald-400"
      : status === "Rugi"
        ? "bg-rose-950 text-rose-400"
        : "bg-slate-800 text-slate-400";
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${kelas}`}>{status}</span>;
}

function KartuPayroll({
  entri,
  sedangCetak,
  onCetak,
}: {
  entri: PayrollEntri;
  sedangCetak: boolean;
  onCetak: () => void;
}) {
  // rincianDivisi datang dari n8n sebagai satu blok teks -- diparse jadi
  // baris per divisi di sini. "laba gabungan" dan "pajak CV 10%" SENGAJA
  // tidak ditampilkan (itu angka perhitungan internal, bukan untuk slip
  // yang dilihat karyawan) -- lihat src/lib/payroll-rincian.ts.
  const rincian = parseRincianPayroll(entri.rincianDivisi);

  return (
    <div className={`kartu-cetak rounded-3xl border border-[#1f2023] bg-[#111214] p-5 ${sedangCetak ? "print:hidden" : ""}`}>
      <div className="mb-3 hidden border-b border-black pb-2 print:block">
        <p className="font-display font-semibold">Chatatan Group</p>
        <p className="text-xs">Slip Penerimaan Payroll · dicetak {new Date().toLocaleDateString("id-ID")}</p>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <div className="text-xs font-medium tracking-wide text-slate-500">{entri.bulan}</div>
          <h3 className="font-display font-semibold text-slate-100">{entri.nama}</h3>
        </div>
        <button
          onClick={onCetak}
          className="print:hidden shrink-0 rounded-lg border border-[#1f2023] px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:border-lime-400/30 hover:text-lime-300"
        >
          Print
        </button>
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

      {rincian.length > 0 && (
        <div className="mt-4 overflow-x-auto border-t border-[#1f2023] pt-3">
          <p className="mb-2 text-xs font-medium text-slate-500">Rincian per divisi</p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1f2023] text-slate-500">
                <th className="py-1.5 pr-3 font-medium">Divisi</th>
                <th className="py-1.5 pr-3 font-medium">Status</th>
                <th className="hidden py-1.5 pr-3 text-right font-medium sm:table-cell print:table-cell">Laba Bersih</th>
                <th className="py-1.5 pr-3 text-right font-medium">Insentif</th>
                <th className="py-1.5 text-right font-medium">Bonus</th>
              </tr>
            </thead>
            <tbody>
              {rincian.map((r, i) => (
                <tr key={`${r.divisi}-${i}`} className="border-b border-[#1f2023]/60">
                  <td className="py-1.5 pr-3 text-slate-200">{r.divisi}</td>
                  <td className="py-1.5 pr-3"><BadgeStatus status={r.status} /></td>
                  <td className="tabular hidden whitespace-nowrap py-1.5 pr-3 text-right sm:table-cell print:table-cell">
                    {r.labaBersih === null ? <span className="text-slate-600">—</span> : <Rupiah nilai={r.labaBersih} />}
                  </td>
                  <td className="tabular whitespace-nowrap py-1.5 pr-3 text-right">
                    <Rupiah nilai={r.insentif} />
                    {r.insentifPersen !== null && <span className="text-xs text-slate-500"> ({r.insentifPersen}%)</span>}
                  </td>
                  <td className="tabular whitespace-nowrap py-1.5 text-right">
                    <Rupiah nilai={r.bonus} />
                    {r.bonusPersen !== null && <span className="text-xs text-slate-500"> ({r.bonusPersen}%)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function PayrollTable({ payroll }: { payroll: PayrollEntri[] }) {
  const [bulanFilter, setBulanFilter] = useState<string>("Semua");
  const { cetakId, setCetakId } = useCetakKartu();

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
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
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
          {filtered.map((p, i) => {
            const id = `${p.bulan}-${p.nama}-${i}`;
            return (
              <KartuPayroll
                key={id}
                entri={p}
                sedangCetak={cetakId !== null && cetakId !== id}
                onCetak={() => setCetakId(id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
