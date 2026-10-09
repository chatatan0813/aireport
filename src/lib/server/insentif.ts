import { normalisasiGroups, type InsentifGroup, type InsentifResponse } from "../insentif";
import type { AnggotaTimMedia } from "../tim-media";
import { fetchTimMedia } from "./tim-media-fetch";

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
  opsi: { fetchImpl?: typeof fetch; ambilRosterTimMedia?: () => Promise<AnggotaTimMedia[]> } = {},
): Promise<InsentifResponse> {
  // Token yang sama dengan tab "Live" -- ketiga aplikasi menerima
  // EXTERNAL_API_TOKEN_AIREPORT di endpoint daily-report maupun insentif.
  const token = process.env.AIREPORT_LIVE_TOKEN;
  if (!token) throw new Error("AIREPORT_LIVE_TOKEN is not set");

  const fetchImpl = opsi.fetchImpl ?? fetch;
  const gagal: string[] = [];

  const [hasil, timMedia] = await Promise.all([
    Promise.all(
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
    ),
    // Tim Media: pool lintas 6 divisi dengan rumusnya sendiri (0,1%/0,3% dari
    // omzet), bukan dari endpoint insentif-bonus manapun -- lihat tim-media-fetch.ts.
    fetchTimMedia(bulan, { fetchImpl, ambilRoster: opsi.ambilRosterTimMedia }),
  ]);

  const groups = hasil.flat();
  if (timMedia.group) groups.push(timMedia.group);

  // gagal diurutkan mengikuti SUMBER (bukan urutan siapa yang gagal duluan)
  // supaya pesan peringatannya stabil antar-refresh; entri khusus Tim Media
  // (mis. kegagalan baca roster) ditambahkan di belakang tanpa menduplikasi
  // nama app yang sudah tercatat gagal dari pemanggilan insentif-bonus-nya.
  const gagalUtama = SUMBER.map((s) => s.nama).filter((nama) => gagal.includes(nama));
  const gagalSemua = new Set(gagalUtama);
  for (const g of timMedia.gagal) gagalSemua.add(g);

  return { bulan, groups, gagal: [...gagalSemua] };
}
