import { describe, expect, it } from "vitest";
import { hitungSorotan, rupiahRingkas } from "./sorotan";
import type { Divisi } from "./transform";

const dv = (p: Partial<Divisi>): Divisi => ({
  nama: "X", omzet: 0, laba: null, capaian: 0, target: 0, satuanTarget: "rupiah", status: "Belum Tercapai", laporanAi: "", sumberAi: "", ...p,
});

describe("hitungSorotan", () => {
  it("menjumlah omzet & laba, menghitung tercapai dan rata-rata capaian (maks 100%)", () => {
    const s = hitungSorotan([
      dv({ omzet: 100, laba: 30, capaian: 50, target: 100 }),
      dv({ omzet: 200, laba: -10, capaian: 300, target: 100, status: "Tercapai" }),
      dv({ omzet: 50, laba: null, capaian: 5, target: 0 }),
    ]);
    expect(s).toEqual({ totalOmzet: 350, totalLaba: 20, tercapai: 1, jumlahDivisi: 3, rataCapaian: 75 });
  });

  it("laba & rata-rata null kalau tidak ada data", () => {
    const s = hitungSorotan([dv({ omzet: 10 })]);
    expect(s.totalLaba).toBeNull();
    expect(s.rataCapaian).toBeNull();
  });
});

describe("rupiahRingkas", () => {
  it("memakai jt / M dengan koma desimal", () => {
    expect(rupiahRingkas(191_950_000)).toBe("Rp 192 jt");
    expect(rupiahRingkas(48_250_000)).toBe("Rp 48,3 jt");
    expect(rupiahRingkas(1_250_000_000)).toBe("Rp 1,25 M");
    expect(rupiahRingkas(-1_200_000)).toBe("-Rp 1,2 jt");
    expect(rupiahRingkas(950_000)).toBe("Rp 950.000");
  });
});
