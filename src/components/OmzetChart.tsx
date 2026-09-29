import type { Divisi } from "@/lib/transform";
import { formatRupiah } from "@/lib/rupiah";

const SATUAN_LABEL: Record<string, string> = {
  Rupiah: "Omzet vs Target (Rupiah)",
  kepala: "Capaian vs Target (kepala)",
  pekerjaan: "Capaian vs Target (pekerjaan)",
  pcs: "Capaian vs Target (pcs)",
};

// Warna dicicilkan per baris -- sama palet dgn cincin di DivisiCard, murni
// variasi visual biar list ini senada sama kartu di atasnya.
const WARNA_BAR = ["#d4f832", "#7c3aed", "#22d3ee", "#f97316", "#0ea5e9", "#ec4899"];

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
      {kelompok.map(([satuan, list]) => (
        <div key={satuan} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="font-display mb-4 font-semibold text-slate-100">{SATUAN_LABEL[satuan] ?? `Capaian vs Target (${satuan})`}</h3>
          <div className="space-y-4">
            {list.map((d, i) => {
              const persen = d.target > 0 ? Math.min((d.capaian / d.target) * 100, 100) : 0;
              const warna = WARNA_BAR[i % WARNA_BAR.length];
              return (
                <div key={d.nama}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-slate-200">{d.nama}</span>
                    <span className="tabular shrink-0 text-sm font-semibold text-slate-100">{persen.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{ width: `${persen}%`, backgroundColor: warna }}
                    />
                  </div>
                  <div className="tabular mt-1 text-xs text-slate-500">
                    {formatNilai(d.capaian, satuan)}
                    {d.target > 0 && <span> / {formatNilai(d.target, satuan)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
