"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { GoogleRatingResult, GrupUsaha, RatingBisnis } from "@/lib/server/google-rating";

// Disimpan di luar komponen supaya pindah tab lalu balik tidak menarik ulang
// (panel di-unmount tiap ganti tab); data baru hanya saat tekan Refresh.
let cache: GoogleRatingResult | null = null;

const GRID_VARIANTS = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

function Bintang({ rating }: { rating: number }) {
  const persen = Math.max(0, Math.min(rating / 5, 1)) * 100;
  return (
    <span className="relative inline-block text-xl leading-none tracking-wider" aria-label={`${rating} dari 5 bintang`}>
      <span className="text-slate-700">★★★★★</span>
      <span className="absolute inset-0 overflow-hidden text-amber-400" style={{ width: `${persen}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

export default function GoogleRatingPanel() {
  const router = useRouter();
  const [data, setData] = useState<GoogleRatingResult | null>(cache);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const muat = () => {
    setLoading(true);
    setError(null);
    fetch("/api/google-rating")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        if (!res.ok) throw new Error("gagal");
        return res.json();
      })
      .then((json) => {
        if (json) {
          cache = json;
          setData(json);
        }
      })
      .catch(() => setError("Gagal memuat rating Google, hubungi admin"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!cache) muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalReview = data?.bisnis.reduce((s, b) => s + b.totalReview, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          Rating bintang &amp; jumlah review Google Maps tiap usaha
          {data && data.bisnis.length > 0 && ` · total ${totalReview.toLocaleString("id-ID")} review`}
          {" "}— diperbarui maksimal tiap 1 jam.
        </p>
        <button
          onClick={muat}
          disabled={loading}
          className="shrink-0 rounded-xl border border-[#1f2023] bg-[#111214] px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-lime-400/30 hover:text-lime-300 disabled:opacity-50"
        >
          {loading ? "Memuat..." : "Refresh"}
        </button>
      </div>

      {error && <p className="text-rose-400">{error}</p>}

      {data?.kunciBelumDiisi && (
        <div className="rounded-lg bg-amber-950/40 px-4 py-2 text-sm text-amber-400 ring-1 ring-amber-900">
          Kunci Google Places belum diisi (env <code>GOOGLE_PLACES_API_KEY</code> di Vercel).
        </div>
      )}

      {data && data.gagal.length > 0 && (
        <div className="rounded-lg bg-amber-950/40 px-4 py-2 text-sm text-amber-400 ring-1 ring-amber-900">
          Gagal ambil rating: {data.gagal.join(", ")}.
        </div>
      )}

      {data &&
        GRUP.map((g) => {
          const isi = data.bisnis.filter((b) => b.grup === g.nama);
          if (isi.length === 0) return null;
          const review = isi.reduce((s, b) => s + b.totalReview, 0);
          return (
            <section key={g.nama} className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`flex h-12 items-center rounded-2xl px-3 ${g.latar}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.logo} alt={g.nama} className="h-8 w-auto" />
                </span>
                <div>
                  <h2 className="font-display font-semibold text-slate-100">{g.nama}</h2>
                  <p className="text-xs text-slate-500">
                    {isi.length} usaha · {review.toLocaleString("id-ID")} review
                  </p>
                </div>
              </div>
              <KartuGrup bisnis={isi} />
            </section>
          );
        })}

      {!data && loading && <p className="text-slate-400">Memuat rating Google...</p>}
    </div>
  );
}

// Logo Chatatan Group putih (untuk latar gelap); logo Alabica = logo Sabrina
// yang hitam, jadi diberi latar terang supaya terbaca.
const GRUP: { nama: GrupUsaha; logo: string; latar: string }[] = [
  { nama: "Chatatan Group", logo: "/logo/chatatan-group.png", latar: "bg-[#111214] ring-1 ring-[#1f2023]" },
  { nama: "Alabica Group", logo: "/logo/alabica-group.png", latar: "bg-slate-100" },
];

function KartuGrup({ bisnis }: { bisnis: RatingBisnis[] }) {
  return (
    <motion.div initial="hidden" animate="show" variants={GRID_VARIANTS} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {bisnis.map((b) => (
        <motion.div
          key={b.nama}
          variants={CARD_VARIANTS}
          className="rounded-3xl border border-[#1f2023] bg-[#111214] p-5 transition-shadow hover:border-lime-400/20 hover:shadow-[0_0_24px_-8px_rgba(198,255,61,0.25)]"
        >
          <h3 className="font-display font-semibold text-slate-100">{b.nama}</h3>
          <div className="mt-3 flex items-end gap-3">
            <span className="font-display text-4xl font-semibold text-slate-100">
              {b.rating !== null ? b.rating.toFixed(1).replace(".", ",") : "—"}
            </span>
            {b.rating !== null && (
              <span className="pb-1.5">
                <Bintang rating={b.rating} />
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-400">{b.totalReview.toLocaleString("id-ID")} review</p>
          {b.reviewBulanIni !== null && (
            <p className="mt-1 text-sm text-slate-300">
              Review bulan ini: <span className="font-semibold text-lime-300">+{b.reviewBulanIni.toLocaleString("id-ID")}</span>
              {b.sejak && <span className="text-slate-500"> (sejak {b.sejak.slice(8, 10)}-{b.sejak.slice(5, 7)})</span>}
            </p>
          )}
          {b.urlMaps && (
            <a
              href={b.urlMaps}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-lime-300 hover:underline"
            >
              Buka di Google Maps
            </a>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
