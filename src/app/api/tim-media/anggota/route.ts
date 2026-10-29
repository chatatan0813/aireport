import { NextResponse } from "next/server";
import { getTimMediaRoster } from "@/lib/server/hrd-sheet";

// Daftar nama anggota Tim Media (sheet HRD, cabang Creative) untuk Kalkulator Gaji.
export async function GET() {
  try {
    const anggota = await getTimMediaRoster();
    return NextResponse.json({ anggota: anggota.map((a) => a.nama) });
  } catch (err) {
    console.error("GET /api/tim-media/anggota failed:", err);
    return NextResponse.json({ error: "Gagal memuat anggota Tim Media" }, { status: 500 });
  }
}
