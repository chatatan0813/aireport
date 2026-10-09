import { NextRequest, NextResponse } from "next/server";
import { bulanBerjalanWib, fetchInsentif } from "@/lib/server/insentif";
import { bulanValid } from "@/lib/insentif";

// Insentif & bonus semua karyawan untuk tab "Insentif": ?bulan=YYYY-MM
// (bulan manapun yang dipilih di dropdown). Kalau tidak dikirim, fallback ke
// bulan berjalan dalam WIB (server jalan di UTC, jadi tidak boleh pakai jam
// lokal server untuk default-nya).
export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get("bulan");
  const bulan = param ?? bulanBerjalanWib();
  if (!bulanValid(bulan)) {
    return NextResponse.json({ error: "bulan harus format YYYY-MM" }, { status: 400 });
  }

  try {
    return NextResponse.json(await fetchInsentif(bulan));
  } catch (err) {
    console.error("GET /api/insentif failed:", err);
    return NextResponse.json({ error: "Gagal memuat data insentif, hubungi admin" }, { status: 500 });
  }
}
