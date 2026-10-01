import { timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";

export function isValidPassword(expected: string | undefined | null, actual: string | undefined | null): boolean {
  if (!expected || !actual) return false;
  if (typeof expected !== "string" || typeof actual !== "string") return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ dashboard: "aireport" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secret());
    // Cek claim juga, bukan cuma tanda tangan -- defense-in-depth kalau
    // SESSION_SECRET suatu saat gak sengaja kepake ulang di konteks lain.
    return payload.dashboard === "aireport";
  } catch {
    return false;
  }
}
