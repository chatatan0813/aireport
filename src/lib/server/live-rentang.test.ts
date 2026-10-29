import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rentangBulan } from "./live";

describe("rentangBulan", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T05:00:00Z")); // 29-10-2026 12:00 WIB
  });
  afterEach(() => vi.useRealTimers());

  it("bulan berjalan s.d. hari ini", () => {
    expect(rentangBulan("2026-10")).toEqual({ awal: "2026-10-01", akhir: "2026-10-29" });
  });
  it("bulan lalu satu bulan penuh, termasuk Februari", () => {
    expect(rentangBulan("2026-09")).toEqual({ awal: "2026-09-01", akhir: "2026-09-30" });
    expect(rentangBulan("2026-02")).toEqual({ awal: "2026-02-01", akhir: "2026-02-28" });
  });
  it("bulan depan atau format salah ditolak", () => {
    expect(rentangBulan("2026-11")).toBeNull();
    expect(rentangBulan("2026-13")).toBeNull();
    expect(rentangBulan("abc")).toBeNull();
  });
});
