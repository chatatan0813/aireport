import { NextResponse } from "next/server";
import { fetchGoogleRating } from "@/lib/server/google-rating";

export async function GET() {
  try {
    return NextResponse.json(await fetchGoogleRating());
  } catch (err) {
    console.error("GET /api/google-rating failed:", err);
    return NextResponse.json({ error: "Gagal memuat rating Google, hubungi admin" }, { status: 500 });
  }
}
