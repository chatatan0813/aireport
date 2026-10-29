import { NextResponse, type NextRequest } from "next/server";
import { fetchLiveDivisi, rentangBulan, rentangBulanBerjalan } from "@/lib/server/live";

// ?bulan=YYYY-MM (opsional, dipakai Kalkulator Gaji untuk bulan yang sudah lewat).
// Tanpa parameter = bulan berjalan s.d. hari ini, seperti tab Live.
export async function GET(request: NextRequest) {
  const bulan = request.nextUrl.searchParams.get("bulan");
  const rentang = bulan ? rentangBulan(bulan) : rentangBulanBerjalan();
  if (!rentang) {
    return NextResponse.json({ error: "Parameter bulan tidak valid" }, { status: 400 });
  }
  try {
    const { divisi, gagal } = await fetchLiveDivisi(rentang);
    return NextResponse.json({ divisi, gagal, awal: rentang.awal, akhir: rentang.akhir });
  } catch (err) {
    console.error("GET /api/live failed:", err);
    return NextResponse.json({ error: "Gagal memuat data live, hubungi admin" }, { status: 500 });
  }
}
