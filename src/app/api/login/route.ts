import { NextRequest, NextResponse } from "next/server";
import { isValidPassword, createSessionToken } from "@/lib/server/auth";

// Rate limit login SEDERHANA, in-memory per-instance -- aireport gak punya DB
// sendiri (cuma baca Google Sheets), jadi gak ada tempat nyimpen counter
// lintas-instance kayak cbcst/kopisabrina-app (yang punya DB). Trade-off
// yang disadari: Map ini direset tiap cold start Vercel dan gak dibagi
// antar instance serverless yang jalan paralel -- bukan proteksi sempurna,
// tapi tetap jauh lebih baik dari TANPA batas sama sekali (temuan HIGH audit
// security 2026-10-01: tanpa ini, satu-satunya gerbang akses ke seluruh data
// omzet+payroll perusahaan bisa di-brute-force password tunggal tanpa batas).
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 menit
const attemptLog = new Map<string, { count: number; windowStart: number }>();

function clientIp(req: NextRequest): string {
  // Di belakang edge Vercel, header ini diisi Vercel sendiri (bukan bisa
  // dipalsukan klien langsung ke origin -- beda kasus dari app yang
  // menerima koneksi langsung tanpa proxy tepercaya di depannya).
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function tooManyAttempts(ip: string): boolean {
  const entry = attemptLog.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > WINDOW_MS) {
    attemptLog.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip: string): void {
  const entry = attemptLog.get(ip);
  if (!entry || Date.now() - entry.windowStart > WINDOW_MS) {
    attemptLog.set(ip, { count: 1, windowStart: Date.now() });
    return;
  }
  entry.count += 1;
}

function clearAttempts(ip: string): void {
  attemptLog.delete(ip);
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  if (tooManyAttempts(ip)) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const password = body?.password;

  if (!isValidPassword(process.env.DASHBOARD_PASSWORD, password)) {
    recordFailedAttempt(ip);
    // Log minimal (timestamp+IP, BUKAN password) -- biar ada jejak kalau
    // ada lonjakan percobaan gagal yang perlu diinvestigasi lewat Vercel Logs.
    console.warn(`[login] percobaan gagal dari IP ${ip} pada ${new Date().toISOString()}`);
    // Delay buatan biar brute-force terskrip gak bisa nembak ratusan
    // percobaan per detik dari satu instance warm yang sama.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }

  clearAttempts(ip);
  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("aireport_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
