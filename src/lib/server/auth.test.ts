import { describe, it, expect, beforeEach } from "vitest";
import { isValidPassword, createSessionToken, verifySessionToken } from "./auth";

describe("isValidPassword", () => {
  it("returns true for matching passwords", () => {
    expect(isValidPassword("rahasia123", "rahasia123")).toBe(true);
  });

  it("returns false for non-matching passwords", () => {
    expect(isValidPassword("rahasia123", "salah")).toBe(false);
  });

  it("returns false when actual is empty", () => {
    expect(isValidPassword("rahasia123", "")).toBe(false);
  });

  it("returns false when expected is undefined", () => {
    expect(isValidPassword(undefined, "apapun")).toBe(false);
  });

  it("returns false for different-length strings without throwing", () => {
    expect(isValidPassword("panjang-sekali", "pendek")).toBe(false);
  });
});

describe("session token", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret-minimal-32-characters-long";
  });

  it("round-trips: a freshly created token verifies as valid", async () => {
    const token = await createSessionToken();
    const ok = await verifySessionToken(token);
    expect(ok).toBe(true);
  });

  it("rejects garbage tokens", async () => {
    const ok = await verifySessionToken("not-a-real-jwt");
    expect(ok).toBe(false);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken();
    process.env.SESSION_SECRET = "a-completely-different-secret-value";
    const ok = await verifySessionToken(token);
    expect(ok).toBe(false);
  });
});
