import { normalisasiGroups, type InsentifGroup, type InsentifResponse } from "../insentif";

// Urutan di sini = urutan tampil di tab "Insentif": CHTTN (toko + Konveksi),
// lalu CBCST (ChatBarber + ChatShoeTreatment per cabang), lalu ChatBox.
const SUMBER: { nama: string; url: string }[] = [
  { nama: "CHTTN", url: "https://chttn.chatatangroup.com/daftar-insentif-eksternal-bulanan" },
  { nama: "CBCST", url: "https://cbcst.chatatangroup.com/api/external/insentif-bonus" },
  { nama: "ChatBox", url: "https://chatbox.chatatangroup.com/api/external/insentif-bonus" },
];

const BATAS_WAKTU_MS = 20_000;

// Bulan kalender dalam WIB (UTC+7) -- sama dengan rentangBulanBerjalan() di
// live.ts dan workflow n8n, supaya "bulan ini" di tab Live dan tab Insentif
// selalu bulan yang sama (server jalan di UTC, jadi tidak boleh pakai jam lokal).
// Dipakai sebagai default server-side kalau pemanggil tidak kirim ?bulan=.
export function bulanBerjalanWib(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 7);
}

export async function fetchInsentif(
  bulan: string,
  opsi: { fetchImpl?: typeof fetch } = {},
): Promise<InsentifResponse> {
  // Token yang sama dengan tab "Live" -- ketiga aplikasi menerima
  // EXTERNAL_API_TOKEN_AIREPORT di endpoint daily-report maupun insentif.
  const token = process.env.AIREPORT_LIVE_TOKEN;
  if (!token) throw new Error("AIREPORT_LIVE_TOKEN is not set");

  const fetchImpl = opsi.fetchImpl ?? fetch;
  const gagal: string[] = [];

  const hasil = await Promise.all(
    SUMBER.map(async (s): Promise<InsentifGroup[]> => {
      try {
        const res = await fetchImpl(`${s.url}?bulan=${bulan}`, {
          headers: { "X-API-Key": token },
          cache: "no-store",
          signal: AbortSignal.timeout(BATAS_WAKTU_MS),
        });
        if (!res.ok) {
          gagal.push(s.nama);
          return [];
        }
        const groups = normalisasiGroups(await res.json(), s.nama);
        if (groups === null) {
          gagal.push(s.nama);
          return [];
        }
        return groups;
      } catch {
        gagal.push(s.nama);
        return [];
      }
    }),
  );

  // gagal diurutkan mengikuti SUMBER (bukan urutan siapa yang gagal duluan)
  // supaya pesan peringatannya stabil antar-refresh.
  return {
    bulan,
    groups: hasil.flat(),
    gagal: SUMBER.map((s) => s.nama).filter((nama) => gagal.includes(nama)),
  };
}
