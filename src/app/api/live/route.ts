import { NextResponse } from "next/server";
import { fetchLiveDivisi, rentangBulanBerjalan } from "@/lib/server/live";

export async function GET() {
  try {
    const { divisi, gagal } = await fetchLiveDivisi();
    const { awal, akhir } = rentangBulanBerjalan();
    return NextResponse.json({ divisi, gagal, awal, akhir });
  } catch (err) {
    console.error("GET /api/live failed:", err);
    return NextResponse.json({ error: "Gagal memuat data live, hubungi admin" }, { status: 500 });
  }
}
