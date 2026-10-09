import { describe, it, expect } from "vitest";
import { hitungTimMedia, type DivisiOmzet, type AnggotaTimMedia } from "./tim-media";

const divisi6 = (overrides: Partial<Record<string, Partial<DivisiOmzet>>> = {}): DivisiOmzet[] => {
  const dasar: DivisiOmzet[] = [
    { nama: "ChatBarber Cempaka", omzet: 1_000_000, target: 2_000_000 },
    { nama: "ChatBarber Pinus", omzet: 1_000_000, target: 2_000_000 },
    { nama: "ChatShoeTreatment Cempaka", omzet: 1_000_000, target: 2_000_000 },
    { nama: "ChatShoeTreatment Pinus", omzet: 1_000_000, target: 2_000_000 },
    { nama: "CHTTN", omzet: 1_000_000, target: 2_000_000 },
    { nama: "ChatBox", omzet: 1_000_000, target: 2_000_000 },
  ];
  return dasar.map((d) => ({ ...d, ...overrides[d.nama] }));
};

const tigaOrang: AnggotaTimMedia[] = [
  { nama: "Alpri Andrian", peran: "Head" },
  { nama: "Muhammad Reza", peran: null },
  { nama: "Muhammad Bahrul Fahmi", peran: null },
];

describe("hitungTimMedia", () => {
  it("computes 0.1% insentif from every divisi's omzet even when no target is hit", () => {
    const hasil = hitungTimMedia(divisi6(), tigaOrang);
    // Total omzet 6 divisi x Rp1.000.000 = Rp6.000.000 -> pool insentif 0,1% = Rp6.000
    expect(hasil.pegawai).toHaveLength(3);
    const total = hasil.pegawai.reduce((s, p) => s + p.insentif, 0);
    expect(total).toBe(6_000);
  });

  it("adds 0.3% bonus only for divisions that reached their own target", () => {
    const hasil = hitungTimMedia(
      divisi6({ CHTTN: { omzet: 3_000_000, target: 2_000_000 } }), // hits target, the other 5 don't
      tigaOrang,
    );
    // Pool bonus = hanya CHTTN: 3.000.000 x 0,3% = 9.000
    const totalBonus = hasil.pegawai.reduce((s, p) => s + p.bonus, 0);
    expect(totalBonus).toBe(9_000);
  });

  it("splits both pools evenly across however many people are given", () => {
    const hasil = hitungTimMedia(
      divisi6({ CHTTN: { omzet: 3_000_000, target: 2_000_000 } }),
      tigaOrang,
    );
    // Pool bonus = 9.000, habis dibagi 3 -> pas Rp3.000 masing-masing.
    for (const p of hasil.pegawai) {
      expect(p.bonus).toBe(3_000);
    }
    // Pool insentif = 8jt x 0,1% = Rp8.000, tidak habis dibagi 3 orang --
    // jumlah baris harus tetap persis Rp8.000 (tidak ada rupiah yang hilang
    // atau nambah gara-gara pembulatan), dan tidak ada orang yang bedanya
    // lebih dari Rp1 dari yang lain.
    const insentif = hasil.pegawai.map((p) => p.insentif);
    expect(insentif.reduce((a, b) => a + b, 0)).toBe(8_000);
    expect(Math.max(...insentif) - Math.min(...insentif)).toBeLessThanOrEqual(1);
  });

  it("treats an unset target (<=0) as not reached, never a free bonus", () => {
    const hasil = hitungTimMedia(divisi6({ CHTTN: { omzet: 5_000_000, target: 0 } }), tigaOrang);
    const totalBonus = hasil.pegawai.reduce((s, p) => s + p.bonus, 0);
    expect(totalBonus).toBe(0);
  });

  it("ignores a divisi name that isn't one of the 6 (e.g. KONVEKSI leaking through)", () => {
    const hasil = hitungTimMedia([...divisi6(), { nama: "KONVEKSI", omzet: 999_999_999, target: 1 }], tigaOrang);
    const total = hasil.pegawai.reduce((s, p) => s + p.insentif, 0);
    expect(total).toBe(6_000); // sama seperti tanpa KONVEKSI -- baris itu diabaikan
  });

  it("returns zero shares and an empty pegawai list when there are 0 recipients, instead of dividing by zero", () => {
    const hasil = hitungTimMedia(divisi6({ CHTTN: { omzet: 3_000_000, target: 2_000_000 } }), []);
    expect(hasil.pegawai).toEqual([]);
  });

  it("labels the group and reports how many of the 6 divisions hit target in keterangan", () => {
    const hasil = hitungTimMedia(divisi6({ CHTTN: { omzet: 3_000_000, target: 2_000_000 } }), tigaOrang);
    expect(hasil.divisi).toBe("Tim Media");
    expect(hasil.keterangan).toContain("1 dari 6 divisi");
    expect(hasil.targetTercapai).toBe(true); // minimal 1 divisi tercapai -> ada bonus cair
  });

  it("marks targetTercapai false when not a single division hit its target this period", () => {
    const hasil = hitungTimMedia(divisi6(), tigaOrang); // semua di bawah target
    expect(hasil.targetTercapai).toBe(false);
    expect(hasil.keterangan).toContain("0 dari 6 divisi");
  });

  it("carries each recipient's own nama and peran through to the output row", () => {
    const hasil = hitungTimMedia(divisi6(), tigaOrang);
    expect(hasil.pegawai.map((p) => [p.nama, p.peran])).toEqual([
      ["Alpri Andrian", "Head"],
      ["Muhammad Reza", null],
      ["Muhammad Bahrul Fahmi", null],
    ]);
  });
});
