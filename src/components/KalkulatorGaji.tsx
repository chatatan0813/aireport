"use client";

import { useState } from "react";
import type { Divisi } from "@/lib/transform";
import type { Bank } from "@/lib/payroll-bank";
import { formatRupiah } from "@/lib/rupiah";
import { formatTanggal, formatTanggalIso } from "@/lib/tanggal";
import { PENERIMA_GAJI, divisiDipegang, hitungTransferSisaGaji } from "@/lib/kalkulator-gaji";

const BANK: Exclude<Bank, "Lainnya">[] = ["BSI", "BTN", "Mandiri"];

function Rupiah({ nilai, tebal = false }: { nilai: number; tebal?: boolean }) {
  if (nilai === 0) return <span className="text-slate-600">—</span>;
  const warna = tebal ? "font-semibold text-lime-400" : "text-slate-300";
  return <span className={`whitespace-nowrap ${warna}`}>Rp {formatRupiah(nilai)}</span>;
}

export default function KalkulatorGaji({
  live,
  liveLoading,
  liveError,
  onRefresh,
}: {
  live: { divisi: Divisi[]; gagal: string[]; awal: string; akhir: string } | null;
  liveLoading: boolean;
  liveError: string | null;
  onRefresh: () => void;
}) {
  // Hanya kalkulator: isian tidak disimpan ke mana pun, hilang saat refresh halaman.
  const [sisa, setSisa] = useState<Record<string, number>>({});

  const baris = PENERIMA_GAJI.map((p) => {
    const nominal = sisa[p.nama] ?? 0;
    const transfer = live ? hitungTransferSisaGaji(p.divisi, live.divisi, nominal) : [];
    const perBank = Object.fromEntries(transfer.map((t) => [t.bank, t]));
    const adaLaba = live ? divisiDipegang(p.divisi, live.divisi).some((d) => (d.laba ?? 0) > 0) : false;
    return { ...p, nominal, perBank, adaLaba };
  });
  const totalBank = (b: string) => baris.reduce((s, r) => s + (r.perBank[b]?.nominal ?? 0), 0);
  const totalSisa = baris.reduce((s, r) => s + r.nominal, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-slate-400">
          Dasar persentase: laba bulan berjalan{live ? ` · ${formatTanggalIso(live.awal)} s.d. ${formatTanggalIso(live.akhir)}` : ""}, hanya divisi yang dipegang tiap orang.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-xl border border-[#1f2023] bg-[#111214] px-3 py-1.5 text-sm font-medium text-slate-400 transition hover:border-lime-400/30 hover:text-lime-300"
          >
            Print
          </button>
          <button
            onClick={onRefresh}
            disabled={liveLoading}
            className="rounded-xl border border-[#1f2023] bg-[#111214] px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-lime-400/30 hover:text-lime-300 disabled:opacity-50"
          >
            {liveLoading ? "Memuat..." : "Refresh"}
          </button>
        </div>
      </div>

      {liveError && <p className="text-rose-400">{liveError}</p>}
      {live && live.gagal.length > 0 && (
        <div className="rounded-lg bg-amber-950/40 px-4 py-2 text-sm text-amber-400 ring-1 ring-amber-900 print:hidden">
          Gagal ambil data dari: {live.gagal.join(", ")} — persentase bank belum lengkap, jangan transfer dulu.
        </div>
      )}
      {!live && liveLoading && <p className="text-slate-400">Memuat laba bulan berjalan...</p>}

      {live && (
        <div className="kartu-cetak overflow-x-auto rounded-3xl border border-[#1f2023] bg-[#111214] p-5">
          <div className="mb-3 hidden border-b border-black pb-2 print:block">
            <p className="font-display font-semibold">Chatatan Group</p>
            <p className="text-xs">
              Transfer Sisa Gaji · laba {formatTanggalIso(live.awal)} s.d. {formatTanggalIso(live.akhir)} · dicetak {formatTanggal(new Date())}
            </p>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1f2023] text-slate-500">
                <th className="py-2 pr-3 font-medium">Nama</th>
                <th className="py-2 pr-3 font-medium">Sisa gaji</th>
                {BANK.map((b) => (
                  <th key={b} className="py-2 pr-3 text-right font-medium last:pr-0">{b}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {baris.map((r) => (
                <tr key={r.nama} className="border-b border-[#1f2023]/60 align-top">
                  <td className="py-2 pr-3 font-medium text-slate-100">{r.nama}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1 rounded-lg border border-[#1f2023] bg-[#0a0a0c] px-2 focus-within:border-lime-400/40 print:border-0 print:bg-transparent print:px-0">
                      <span className="text-xs text-slate-500">Rp</span>
                      <input
                        inputMode="numeric"
                        value={r.nominal ? formatRupiah(r.nominal) : ""}
                        onChange={(e) => {
                          const angka = Number(e.target.value.replace(/\D/g, "")) || 0;
                          setSisa((s) => ({ ...s, [r.nama]: angka }));
                        }}
                        placeholder="0"
                        className="tabular w-28 bg-transparent py-1 text-sm text-slate-100 focus:outline-none"
                      />
                    </div>
                    {r.nominal > 0 && !r.adaLaba && (
                      <div className="mt-1 text-xs text-amber-400">Divisi yang dipegang belum ada laba, tidak bisa dibagi.</div>
                    )}
                  </td>
                  {BANK.map((b) => (
                    <td key={b} className="tabular py-2 pr-3 text-right last:pr-0">
                      <Rupiah nilai={r.perBank[b]?.nominal ?? 0} />
                      {r.perBank[b] && (
                        <div className="text-xs text-slate-500">{Math.round(r.perBank[b].persen * 100)}%</div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-slate-300">
                <td className="py-2 pr-3 text-xs text-slate-400">Total transfer per rekening</td>
                <td className="tabular py-2 pr-3"><Rupiah nilai={totalSisa} /></td>
                {BANK.map((b) => (
                  <td key={b} className="tabular py-2 pr-3 text-right last:pr-0"><Rupiah nilai={totalBank(b)} tebal /></td>
                ))}
              </tr>
            </tfoot>
          </table>
          <p className="mt-3 text-xs text-slate-500">
            BSI = ChatBarber, Pomade, ChatShoeTreatment · BTN = ChatBox · Mandiri = CHTTN, KONVEKSI. Persen per orang = laba divisi
            di bank itu ÷ total laba divisi yang dia pegang (divisi rugi dihitung 0).
          </p>
        </div>
      )}
    </div>
  );
}
