// Insentif & bonus semua karyawan, ditarik dari endpoint insentif di tiga
// aplikasi (CHTTN, CBCST, pos-chatbox). Ketiganya sengaja mengembalikan
// bentuk group yang sama, jadi file ini cuma menormalkan + menjumlah --
// TIDAK ada rumus insentif di sini (rumusnya tetap hidup di tiap aplikasi).

export type InsentifPegawai = {
  nama: string;
  peran: string | null;
  basis: string | null;
  insentif: number;
  bonus: number;
  total: number;
};

// Kontribusi satu divisi ke pool insentif/bonus sebelum dibagi rata ke
// pegawai -- cuma dipakai grup "Tim Media" (lihat tim-media.ts), grup dari
// 3 aplikasi eksternal tidak pernah mengisi field ini.
export type InsentifRincianDivisi = {
  divisi: string;
  omzet: number;
  status: string; // "Tercapai" | "Belum Tercapai" | "Target belum diatur" -- lihat statusDivisi() di lib/server/live.ts
  insentif: number;
  bonus: number;
};

export type InsentifGroup = {
  sumber: string; // aplikasi asal: "CHTTN" | "CBCST" | "ChatBox" | "Media"
  divisi: string;
  targetTercapai: boolean | null; // null = target belum diset
  keterangan: string;
  catatan: string | null;
  pegawai: InsentifPegawai[];
  rincianDivisi?: InsentifRincianDivisi[];
};

export type InsentifResponse = {
  bulan: string; // YYYY-MM
  groups: InsentifGroup[];
  gagal: string[];
};

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function bulanValid(bulan: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(bulan);
}

/** "2026-10" -> "Oktober 2026". Input yang tidak valid dikembalikan apa adanya. */
export function labelBulan(bulan: string): string {
  if (!bulanValid(bulan)) return bulan;
  const [tahun, bulanAngka] = bulan.split("-").map(Number);
  return `${NAMA_BULAN[bulanAngka - 1]} ${tahun}`;
}

/** Bulan sebelum `bulan` (YYYY-MM), aman melewati pergantian tahun. */
export function bulanSebelum(bulan: string): string {
  const [tahun, bulanAngka] = bulan.split("-").map(Number);
  const y = bulanAngka === 1 ? tahun - 1 : tahun;
  const m = bulanAngka === 1 ? 12 : bulanAngka - 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * Bulan kalender "sekarang" (YYYY-MM) dari jam PERANGKAT PEMBUKA (browser) --
 * dipakai di client untuk nilai awal & batas atas dropdown bulan. Sengaja
 * pakai getter lokal (bukan toISOString/UTC): ini kode browser, jadi jam
 * lokalnya sudah benar WIB, beda dengan server yang jalan di UTC (lihat
 * bulanBerjalanWib() di lib/server/insentif.ts untuk default sisi server).
 */
export function bulanIni(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function angka(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function teksAtauNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/**
 * Menormalkan respons satu aplikasi jadi daftar group. Respons datang dari
 * jaringan, jadi tidak dipercaya begitu saja: field yang hilang/aneh diberi
 * nilai aman, dan `total` SELALU dihitung ulang dari insentif + bonus supaya
 * angka di layar tidak pernah bisa tidak klop dengan penjumlahannya sendiri.
 * Mengembalikan null kalau bentuknya bukan respons insentif sama sekali
 * (pemanggil memperlakukannya sebagai "gagal ambil").
 */
export function normalisasiGroups(raw: unknown, sumber: string): InsentifGroup[] | null {
  if (!raw || typeof raw !== "object") return null;
  const groups = (raw as { groups?: unknown }).groups;
  if (!Array.isArray(groups)) return null;

  return groups
    .filter((g): g is Record<string, unknown> => !!g && typeof g === "object")
    .map((g) => {
      const pegawaiRaw = Array.isArray(g.pegawai) ? g.pegawai : [];
      const pegawai: InsentifPegawai[] = pegawaiRaw
        .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
        .map((p) => {
          const insentif = angka(p.insentif);
          const bonus = angka(p.bonus);
          return {
            nama: teksAtauNull(p.nama) ?? "-",
            peran: teksAtauNull(p.peran),
            basis: teksAtauNull(p.basis),
            insentif,
            bonus,
            total: insentif + bonus,
          };
        });
      return {
        sumber,
        divisi: teksAtauNull(g.divisi) ?? sumber,
        targetTercapai: typeof g.targetTercapai === "boolean" ? g.targetTercapai : null,
        keterangan: teksAtauNull(g.keterangan) ?? "",
        catatan: teksAtauNull(g.catatan),
        pegawai,
      };
    });
}

export type InsentifTotal = { insentif: number; bonus: number; total: number; jumlahPegawai: number };

export function totalGroup(group: InsentifGroup): InsentifTotal {
  return group.pegawai.reduce(
    (acc, p) => ({
      insentif: acc.insentif + p.insentif,
      bonus: acc.bonus + p.bonus,
      total: acc.total + p.total,
      jumlahPegawai: acc.jumlahPegawai + 1,
    }),
    { insentif: 0, bonus: 0, total: 0, jumlahPegawai: 0 },
  );
}

/**
 * Total lintas divisi. jumlahPegawai menghitung BARIS penerima, bukan orang
 * unik: nama yang sama di dua divisi (mis. dua cabang) sengaja dihitung dua
 * kali karena tiap aplikasi menulis nama dengan caranya sendiri dan tidak
 * ada ID karyawan bersama untuk mencocokkannya dengan aman.
 */
export function totalSemua(groups: InsentifGroup[]): InsentifTotal {
  return groups.map(totalGroup).reduce(
    (acc, t) => ({
      insentif: acc.insentif + t.insentif,
      bonus: acc.bonus + t.bonus,
      total: acc.total + t.total,
      jumlahPegawai: acc.jumlahPegawai + t.jumlahPegawai,
    }),
    { insentif: 0, bonus: 0, total: 0, jumlahPegawai: 0 },
  );
}
