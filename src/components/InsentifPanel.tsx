"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { formatRupiah } from "@/lib/rupiah";
import { bulanIni, labelBulan, totalGroup, totalSemua } from "@/lib/insentif";
import type { InsentifGroup, InsentifResponse } from "@/lib/insentif";
import { useCetakKartu } from "@/lib/use-cetak-kartu";

// Disimpan di luar komponen supaya pindah tab lalu balik ke "Insentif" tidak
// menarik ulang ketiga aplikasi -- panel ini di-unmount tiap ganti tab. Data
// baru hanya diambil saat pertama buka tiap bulan atau saat tekan Refresh.
const cache: Partial<Record<string, InsentifResponse>> = {};

type PerBulan<T> = Partial<Record<string, T>>;

function Rupiah({ nilai, tebal = false }: { nilai: number; tebal?: boolean }) {
  if (nilai === 0) return <span className="text-slate-600">—</span>;
  const warna = nilai < 0 ? "text-rose-400" : tebal ? "font-semibold text-lime-400" : "text-slate-300";
  return (
    <span className={`whitespace-nowrap ${warna}`}>
      {nilai < 0 ? "-" : ""}Rp {formatRupiah(Math.abs(nilai))}
    </span>
  );
}

// Di layar sempit kolom Insentif & Bonus disembunyikan (4 kolom angka tidak
// muat tanpa geser ke samping) dan rinciannya pindah ke bawah nama.
function RincianSempit({ insentif, bonus }: { insentif: number; bonus: number }) {
  return (
    <div className="tabular text-xs text-slate-500 sm:hidden">
      Insentif <Rupiah nilai={insentif} /> · Bonus <Rupiah nilai={bonus} />
    </div>
  );
}

function BadgeTarget({ tercapai }: { tercapai: boolean | null }) {
  const [teks, kelas] =
    tercapai === null
      ? ["Target belum diset", "bg-slate-800 text-slate-400"]
      : tercapai
        ? ["Target tercapai", "bg-emerald-950 text-emerald-400"]
        : ["Target belum tercapai", "bg-rose-950 text-rose-400"];
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${kelas}`}>{teks}</span>;
}

function KartuDivisi({
  group,
  sedangCetak,
  onCetak,
}: {
  group: InsentifGroup;
  sedangCetak: boolean;
  onCetak: () => void;
}) {
  const total = totalGroup(group);
  return (
    <div className={`kartu-cetak rounded-3xl border border-[#1f2023] bg-[#111214] p-5 ${sedangCetak ? "print:hidden" : ""}`}>
      <div className="mb-3 hidden border-b border-black pb-2 print:block">
        <p className="font-display font-semibold">Chatatan Group</p>
        <p className="text-xs">Slip Insentif &amp; Bonus · dicetak {new Date().toLocaleDateString("id-ID")}</p>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          {group.sumber === "CBCST" && <div className="text-xs font-medium tracking-wide text-slate-500">CBCST</div>}
          {/* Sengaja tidak di-truncate: "ChatShoeTreatment Cempaka" dan "...Pinus" jadi tak terbedakan kalau dipotong. */}
          <h3 className="font-display font-semibold text-slate-100">{group.divisi}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onCetak}
            className="print:hidden rounded-lg border border-[#1f2023] px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:border-lime-400/30 hover:text-lime-300"
          >
            Print
          </button>
          <BadgeTarget tercapai={group.targetTercapai} />
        </div>
      </div>
      {group.keterangan && <p className="mt-1 text-sm text-slate-400">{group.keterangan}</p>}
      {group.catatan && (
        <p className="mt-2 rounded-lg bg-amber-950/40 px-3 py-2 text-xs text-amber-400 ring-1 ring-amber-900">{group.catatan}</p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#1f2023] text-slate-500">
              <th className="py-2 pr-4 font-medium">Nama</th>
              <th className="hidden py-2 pr-4 text-right font-medium sm:table-cell print:table-cell">Insentif</th>
              <th className="hidden py-2 pr-4 text-right font-medium sm:table-cell print:table-cell">Bonus</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {group.pegawai.map((p, i) => (
              <tr key={`${p.nama}-${i}`} className="border-b border-[#1f2023]/60 transition hover:bg-white/[0.02]">
                <td className="py-2 pr-4">
                  <div className="font-medium text-slate-100">{p.nama}</div>
                  {(p.peran || p.basis) && (
                    <div className="tabular text-xs text-slate-500">{[p.peran, p.basis].filter(Boolean).join(" · ")}</div>
                  )}
                  <RincianSempit insentif={p.insentif} bonus={p.bonus} />
                </td>
                <td className="tabular hidden whitespace-nowrap py-2 pr-4 text-right sm:table-cell print:table-cell"><Rupiah nilai={p.insentif} /></td>
                <td className="tabular hidden whitespace-nowrap py-2 pr-4 text-right sm:table-cell print:table-cell"><Rupiah nilai={p.bonus} /></td>
                <td className="tabular whitespace-nowrap py-2 text-right"><Rupiah nilai={p.total} tebal /></td>
              </tr>
            ))}
            {group.pegawai.length === 0 && (
              <tr>
                <td colSpan={4} className="py-5 text-center text-slate-500">Belum ada penerima.</td>
              </tr>
            )}
          </tbody>
          {group.pegawai.length > 1 && (
            <tfoot>
              <tr className="text-slate-400">
                <td className="py-2 pr-4 text-xs">
                  Subtotal · {total.jumlahPegawai} orang
                  <RincianSempit insentif={total.insentif} bonus={total.bonus} />
                </td>
                <td className="tabular hidden whitespace-nowrap py-2 pr-4 text-right sm:table-cell print:table-cell"><Rupiah nilai={total.insentif} /></td>
                <td className="tabular hidden whitespace-nowrap py-2 pr-4 text-right sm:table-cell print:table-cell"><Rupiah nilai={total.bonus} /></td>
                <td className="tabular whitespace-nowrap py-2 text-right"><Rupiah nilai={total.total} tebal /></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {group.rincianDivisi && group.rincianDivisi.length > 0 && (
        <div className="mt-4 overflow-x-auto border-t border-[#1f2023] pt-3">
          <p className="mb-2 text-xs font-medium text-slate-500">Rincian per divisi</p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1f2023] text-slate-500">
                <th className="py-1.5 pr-3 font-medium">Divisi</th>
                <th className="py-1.5 pr-3 font-medium">Status</th>
                <th className="hidden py-1.5 pr-3 text-right font-medium sm:table-cell print:table-cell">Omzet</th>
                <th className="py-1.5 pr-3 text-right font-medium">Insentif</th>
                <th className="py-1.5 text-right font-medium">Bonus</th>
              </tr>
            </thead>
            <tbody>
              {group.rincianDivisi.map((r) => (
                <tr key={r.divisi} className="border-b border-[#1f2023]/60">
                  <td className="py-1.5 pr-3 text-slate-200">{r.divisi}</td>
                  <td className="py-1.5 pr-3">
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.target <= 0
                          ? "bg-slate-800 text-slate-400"
                          : r.tercapai
                            ? "bg-emerald-950 text-emerald-400"
                            : "bg-rose-950 text-rose-400"
                      }`}
                    >
                      {r.target <= 0 ? "Target belum diset" : r.tercapai ? "Tercapai" : "Belum tercapai"}
                    </span>
                  </td>
                  <td className="tabular hidden whitespace-nowrap py-1.5 pr-3 text-right sm:table-cell print:table-cell">
                    <Rupiah nilai={r.omzet} />
                  </td>
                  <td className="tabular whitespace-nowrap py-1.5 pr-3 text-right"><Rupiah nilai={r.insentif} /></td>
                  <td className="tabular whitespace-nowrap py-1.5 text-right"><Rupiah nilai={r.bonus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-500">
            Insentif = 0,1% omzet (selalu cair) · Bonus = 0,3% omzet (hanya divisi yang capai target), dijumlah lalu dibagi rata ke {total.jumlahPegawai || "0"} orang.
          </p>
        </div>
      )}
    </div>
  );
}

export default function InsentifPanel() {
  const router = useRouter();
  const bulanSekarang = bulanIni();
  const [bulan, setBulan] = useState(bulanSekarang);
  const [data, setData] = useState<PerBulan<InsentifResponse>>(() => ({ ...cache }));
  const [loading, setLoading] = useState<PerBulan<boolean>>({});
  const [error, setError] = useState<PerBulan<string>>({});

  // State disimpan per bulan: jawaban bulan lain yang datang terlambat tidak
  // boleh menimpa tampilan bulan yang sedang dibuka kalau user sudah pindah.
  const muat = useCallback(
    (b: string) => {
      setLoading((l) => ({ ...l, [b]: true }));
      setError((e) => ({ ...e, [b]: undefined }));
      fetch(`/api/insentif?bulan=${b}`)
        .then((res) => {
          if (res.status === 401) {
            router.push("/login");
            return null;
          }
          if (!res.ok) throw new Error("gagal");
          return res.json() as Promise<InsentifResponse>;
        })
        .then((json) => {
          if (!json) return;
          cache[b] = json;
          setData((d) => ({ ...d, [b]: json }));
        })
        .catch(() => setError((e) => ({ ...e, [b]: "Gagal memuat data insentif, hubungi admin" })))
        .finally(() => setLoading((l) => ({ ...l, [b]: false })));
    },
    [router],
  );

  useEffect(() => {
    if (!cache[bulan]) muat(bulan);
  }, [bulan, muat]);

  const hasil = data[bulan];
  const sedangMuat = loading[bulan] ?? false;
  const pesanError = error[bulan];
  const total = hasil ? totalSemua(hasil.groups) : null;
  const { cetakId, setCetakId } = useCetakKartu();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="month"
            value={bulan}
            max={bulanSekarang}
            onChange={(e) => e.target.value && setBulan(e.target.value)}
            className="rounded-xl border border-[#1f2023] bg-[#111214] px-3 py-1.5 text-sm font-medium text-slate-200 [color-scheme:dark] focus:border-lime-400/40 focus:outline-none"
          />
          <p className="text-sm text-slate-400">
            {hasil ? labelBulan(hasil.bulan) : labelBulan(bulan)}
            {bulan === bulanSekarang ? " · masih berjalan, angka sampai hari ini" : " · satu bulan penuh"}
          </p>
        </div>
        <button
          onClick={() => muat(bulan)}
          disabled={sedangMuat}
          className="shrink-0 rounded-xl border border-[#1f2023] bg-[#111214] px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-lime-400/30 hover:text-lime-300 disabled:opacity-50"
        >
          {sedangMuat ? "Memuat..." : "Refresh"}
        </button>
      </div>

      {pesanError && <p className="text-rose-400">{pesanError}</p>}

      {hasil && hasil.gagal.length > 0 && (
        <div className="print:hidden rounded-lg bg-amber-950/40 px-4 py-2 text-sm text-amber-400 ring-1 ring-amber-900">
          Gagal ambil data dari: {hasil.gagal.join(", ")} — karyawan dari aplikasi itu belum masuk hitungan di bawah ini.
        </div>
      )}

      {!hasil && sedangMuat && <p className="text-slate-400">Memuat data insentif...</p>}

      {hasil && total && (
        <motion.div key={bulan} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:hidden">
            {[
              { label: "Total insentif", isi: <Rupiah nilai={total.insentif} /> },
              { label: "Total bonus", isi: <Rupiah nilai={total.bonus} /> },
              { label: "Insentif + bonus", isi: <Rupiah nilai={total.total} tebal /> },
              { label: "Penerima", isi: <span className="text-slate-300">{total.jumlahPegawai} orang</span> },
            ].map((t) => (
              <div key={t.label} className="rounded-2xl border border-[#1f2023] bg-[#111214] px-4 py-3">
                <dt className="text-xs text-slate-500">{t.label}</dt>
                <dd className="tabular font-display mt-1 text-lg font-semibold">{t.isi}</dd>
              </div>
            ))}
          </dl>

          {hasil.groups.length > 0 ? (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              {hasil.groups.map((g) => {
                const id = `${g.sumber}/${g.divisi}`;
                return (
                  <KartuDivisi
                    key={id}
                    group={g}
                    sedangCetak={cetakId !== null && cetakId !== id}
                    onCetak={() => setCetakId(id)}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400">Tidak ada data.</p>
          )}
        </motion.div>
      )}
    </div>
  );
}
