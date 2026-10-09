import { NextRequest, NextResponse } from "next/server";
import { fetchInsentif } from "@/lib/server/insentif";
import type { Periode } from "@/lib/insentif";

// Insentif & bonus semua karyawan untuk tab "Insentif": ?periode=ini (bulan
// berjalan, default) atau ?periode=lalu. Bulan kalendernya ditentukan server
// (WIB), bukan jam perangkat yang membuka dashboard.
export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get("periode") ?? "ini";
  if (param !== "ini" && param !== "lalu") {
    return NextResponse.json({ error: "periode harus 'ini' atau 'lalu'" }, { status: 400 });
  }
  const periode: Periode = param;

  try {
    return NextResponse.json(await fetchInsentif(periode));
  } catch (err) {
    console.error("GET /api/insentif failed:", err);
    return NextResponse.json({ error: "Gagal memuat data insentif, hubungi admin" }, { status: 500 });
  }
}
