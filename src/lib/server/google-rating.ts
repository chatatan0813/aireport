// Place ID diambil dari tabel clients di rev.chatatangroup.com (Chatatan Review),
// yang sudah menyimpan Place ID tiap usaha untuk link tulis-review.
// Tambah usaha baru = tambah satu baris di sini.
export const BISNIS_GOOGLE: { nama: string; placeId: string }[] = [
  { nama: "ChatBarber Cempaka", placeId: "ChIJ4cB_39oj5C0RUjpIVILr6gE" },
  { nama: "ChatBarber Pinus", placeId: "ChIJY0g1uXQj5C0RJv9kfgkJ_HA" },
  { nama: "ChatShoeTreatment Cempaka", placeId: "ChIJgdD2INsj5C0Rr0E7Okkb22Q" },
  { nama: "CHTTN", placeId: "ChIJgTlV5zIj5C0RMrw2CKRarjE" },
  { nama: "ChatBox", placeId: "ChIJadr0kd4j5C0R3ZsHNJIT5wY" },
  { nama: "Kopi Sabrina", placeId: "ChIJSUjwIUUj5C0RI8R4Vz5dEao" },
  { nama: "Aksel Cafe", placeId: "ChIJO7csLgAj5C0RBlV-ovp9mPM" },
];

export type RatingBisnis = {
  nama: string;
  rating: number | null;
  totalReview: number;
  urlMaps: string | null;
};

export type GoogleRatingResult = {
  bisnis: RatingBisnis[];
  gagal: string[];
  kunciBelumDiisi: boolean;
};

type PlaceResponse = { rating?: unknown; userRatingCount?: unknown; googleMapsUri?: unknown };

// Rating Google tidak berubah tiap menit; cache 1 jam supaya tagihan Places API
// (dihitung per permintaan) tetap di dalam kuota gratis bulanan.
const CACHE_DETIK = 3600;

export async function fetchGoogleRating(opsi: { fetchImpl?: typeof fetch } = {}): Promise<GoogleRatingResult> {
  const kunci = process.env.GOOGLE_PLACES_API_KEY;
  if (!kunci) return { bisnis: [], gagal: [], kunciBelumDiisi: true };

  const fetchImpl = opsi.fetchImpl ?? fetch;
  const gagal: string[] = [];

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
        return {
          nama: b.nama,
          rating: typeof json.rating === "number" ? json.rating : null,
          totalReview: typeof json.userRatingCount === "number" ? json.userRatingCount : 0,
          urlMaps: typeof json.googleMapsUri === "string" ? json.googleMapsUri : null,
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
