import type { Divisi } from "@/lib/transform";

type RawDivision = {
  name: string;
  omzet: number;
  laba?: number | null;
  target: number;
  jumlahTransaksi?: number | null;
  jumlahPcs?: number | null;
};

type DailyReportResponse = { from: string; to: string; divisions: RawDivision[] };

const SUMBER: { nama: string; url: string }[] = [
  { nama: "CBCST", url: "https://cbcst.chatatangroup.com/api/external/daily-report" },
  { nama: "CHTTN", url: "https://chttn.chatatangroup.com/daftar-laporan-eksternal-harian" },
  { nama: "ChatBox", url: "https://chatbox.chatatangroup.com/api/external/daily-report" },
];

// Rentang bulan berjalan (month-to-date) dalam WIB (UTC+7), sama seperti
// perhitungan "Dekade"-nya AI Reporting n8n workflow.
export function rentangBulanBerjalan(): { awal: string; akhir: string } {
  const jkt = new Date(Date.now() + 7 * 3600 * 1000);
  const y = jkt.getUTCFullYear();
  const m = jkt.getUTCMonth() + 1;
  const d = jkt.getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return { awal: `${y}-${pad(m)}-01`, akhir: `${y}-${pad(m)}-${pad(d)}` };
}

function satuanDanCapaian(name: string, d: RawDivision): { satuan: string; capaian: number } {
  if (name.startsWith("ChatBarber")) return { satuan: "kepala", capaian: Number(d.jumlahTransaksi) || 0 };
  if (name.startsWith("ChatShoeTreatment")) return { satuan: "pekerjaan", capaian: Number(d.jumlahTransaksi) || 0 };
  if (name === "KONVEKSI") return { satuan: "pcs", capaian: Number(d.jumlahPcs) || 0 };
  return { satuan: "Rupiah", capaian: Number(d.omzet) || 0 };
}

function statusDari(capaian: number, target: number): string {
  if (target <= 0) return "Target belum diatur";
  return capaian >= target ? "Tercapai" : "Belum Tercapai";
}

export async function fetchLiveDivisi(): Promise<{ divisi: Divisi[]; gagal: string[] }> {
  const token = process.env.AIREPORT_LIVE_TOKEN;
  if (!token) throw new Error("AIREPORT_LIVE_TOKEN is not set");

  const { awal, akhir } = rentangBulanBerjalan();
  const gagal: string[] = [];

  const hasil = await Promise.all(
    SUMBER.map(async (s) => {
      try {
        const res = await fetch(`${s.url}?from=${awal}&to=${akhir}`, {
          headers: { "X-API-Key": token },
          cache: "no-store",
        });
        if (!res.ok) {
          gagal.push(s.nama);
          return [];
        }
        const json: DailyReportResponse = await res.json();
        return Array.isArray(json.divisions) ? json.divisions : [];
      } catch {
        gagal.push(s.nama);
        return [];
      }
    })
  );

  const divisi: Divisi[] = hasil.flat().map((d) => {
    const { satuan, capaian } = satuanDanCapaian(d.name, d);
    const target = Number(d.target) || 0;
    return {
      nama: d.name,
      omzet: Number(d.omzet) || 0,
      laba: d.laba === undefined || d.laba === null ? null : Number(d.laba),
      capaian,
      target,
      satuanTarget: satuan,
      status: statusDari(capaian, target),
      laporanAi: "",
      sumberAi: "live",
    };
  });

  return { divisi, gagal };
}
