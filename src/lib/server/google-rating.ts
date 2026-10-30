import { getRatingGoogleRows } from "./sheets";

// Place ID diambil dari tabel clients di rev.chatatangroup.com (Chatatan Review),
// yang sudah menyimpan Place ID tiap usaha untuk link tulis-review.
// Tambah usaha baru = tambah satu baris di sini.
export const GRUP_USAHA = ["Chatatan Group", "Alabica Group"] as const;
export type GrupUsaha = (typeof GRUP_USAHA)[number];

export const BISNIS_GOOGLE: { nama: string; grup: GrupUsaha; placeId: string }[] = [
  { nama: "ChatBarber Cempaka", grup: "Chatatan Group", placeId: "ChIJ4cB_39oj5C0RUjpIVILr6gE" },
  { nama: "ChatBarber Pinus", grup: "Chatatan Group", placeId: "ChIJY0g1uXQj5C0RJv9kfgkJ_HA" },
  { nama: "ChatShoeTreatment Cempaka", grup: "Chatatan Group", placeId: "ChIJgdD2INsj5C0Rr0E7Okkb22Q" },
  { nama: "CHTTN", grup: "Chatatan Group", placeId: "ChIJgTlV5zIj5C0RMrw2CKRarjE" },
  { nama: "ChatBox", grup: "Chatatan Group", placeId: "ChIJadr0kd4j5C0R3ZsHNJIT5wY" },
  { nama: "Kopi Sabrina", grup: "Alabica Group", placeId: "ChIJSUjwIUUj5C0RI8R4Vz5dEao" },
  { nama: "Aksel Cafe", grup: "Alabica Group", placeId: "ChIJO7csLgAj5C0RBlV-ovp9mPM" },
];

export type RatingBisnis = {
  nama: string;
  grup: GrupUsaha;
  rating: number | null;
  totalReview: number;
  urlMaps: string | null;
  // Review baru bulan berjalan = total sekarang − snapshot pertama bulan ini.
  // `sejak` diisi kalau snapshot pertama bukan tanggal 1 (data baru mulai tengah bulan).
  reviewBulanIni: number | null;
  sejak: string | null;
};

type Snapshot = { tanggal?: string; usaha?: string; total_review?: string | number };

/** Bulan berjalan di WITA, format YYYY-MM. */
function bulanIniWita(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar", year: "numeric", month: "2-digit" }).format(new Date());
}

async function ambilSnapshotSheet(): Promise<Snapshot[]> {
  return (await getRatingGoogleRows()).data;
}

export function reviewBulanIni(
  snapshot: Snapshot[],
  usaha: string,
  totalSekarang: number,
  bulan: string,
): { reviewBulanIni: number | null; sejak: string | null } {
  const awal = snapshot
    .filter((s) => s.usaha === usaha && String(s.tanggal ?? "").startsWith(bulan + "-"))
    .sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)))[0];
  const totalAwal = Number(awal?.total_review);
  if (!awal || !Number.isFinite(totalAwal)) return { reviewBulanIni: null, sejak: null };
  return {
    reviewBulanIni: totalSekarang - totalAwal,
    sejak: awal.tanggal === `${bulan}-01` ? null : String(awal.tanggal),
  };
}

export type GoogleRatingResult = {
  bisnis: RatingBisnis[];
  gagal: string[];
  kunciBelumDiisi: boolean;
};

type PlaceResponse = { rating?: unknown; userRatingCount?: unknown; googleMapsUri?: unknown };

// Rating Google tidak berubah tiap menit; cache 1 jam supaya tagihan Places API
// (dihitung per permintaan) tetap di dalam kuota gratis bulanan.
const CACHE_DETIK = 3600;

export async function fetchGoogleRating(
  opsi: { fetchImpl?: typeof fetch; ambilSnapshot?: () => Promise<Snapshot[]>; bulan?: string } = {},
): Promise<GoogleRatingResult> {
  const kunci = process.env.GOOGLE_PLACES_API_KEY;
  if (!kunci) return { bisnis: [], gagal: [], kunciBelumDiisi: true };

  const fetchImpl = opsi.fetchImpl ?? fetch;
  const bulan = opsi.bulan ?? bulanIniWita();
  const gagal: string[] = [];

  // Sheet snapshot gagal dibaca: kartu tetap tampil, hanya baris "review bulan ini" yang hilang.
  const snapshotPromise = (opsi.ambilSnapshot ?? ambilSnapshotSheet)().catch((err) => {
    console.error("fetchGoogleRating: gagal baca snapshot Rating Google:", err);
    return [] as Snapshot[];
  });

  const hasil = await Promise.all(
    BISNIS_GOOGLE.map(async (b): Promise<RatingBisnis | null> => {
      try {
        const res = await fetchImpl(`https://places.googleapis.com/v1/places/${b.placeId}`, {
          headers: { "X-Goog-Api-Key": kunci, "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri" },
          next: { revalidate: CACHE_DETIK },
        });
        if (!res.ok) {
          console.error(`fetchGoogleRating: ${b.nama} HTTP ${res.status}`);
          gagal.push(b.nama);
          return null;
        }
        const json = (await res.json()) as PlaceResponse;
        const totalReview = typeof json.userRatingCount === "number" ? json.userRatingCount : 0;
        return {
          nama: b.nama,
          grup: b.grup,
          rating: typeof json.rating === "number" ? json.rating : null,
          totalReview,
          urlMaps: typeof json.googleMapsUri === "string" ? json.googleMapsUri : null,
          ...reviewBulanIni(await snapshotPromise, b.nama, totalReview, bulan),
        };
      } catch (err) {
        console.error(`fetchGoogleRating: ${b.nama} gagal:`, err);
        gagal.push(b.nama);
        return null;
      }
    }),
  );

  return { bisnis: hasil.filter((b): b is RatingBisnis => b !== null), gagal, kunciBelumDiisi: false };
}
