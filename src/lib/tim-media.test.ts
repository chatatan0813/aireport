import { describe, it, expect } from "vitest";
import { hitungTimMedia, type DivisiOmzet, type AnggotaTimMedia } from "./tim-media";

const divisi6 = (overrides: Partial<Record<string, Partial<DivisiOmzet>>> = {}): DivisiOmzet[] => {
  const dasar: DivisiOmzet[] = [
    { nama: "ChatBarber Cempaka", omzet: 1_000_000, status: "Belum Tercapai" },
    { nama: "ChatBarber Pinus", omzet: 1_000_000, status: "Belum Tercapai" },
    { nama: "ChatShoeTreatment Cempaka", omzet: 1_000_000, status: "Belum Tercapai" },
    { nama: "ChatShoeTreatment Pinus", omzet: 1_000_000, status: "Belum Tercapai" },
    { nama: "CHTTN", omzet: 1_000_000, status: "Belum Tercapai" },
    { nama: "ChatBox", omzet: 1_000_000, status: "Belum Tercapai" },
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

  it("adds 0.3% bonus only for divisions whose OWN status is 'Tercapai'", () => {
    const hasil = hitungTimMedia(
      divisi6({ CHTTN: { omzet: 3_000_000, status: "Tercapai" } }), // hits target, the other 5 don't
      tigaOrang,
    );
    // Pool bonus = hanya CHTTN: 3.000.000 x 0,3% = 9.000
    const totalBonus = hasil.pegawai.reduce((s, p) => s + p.bonus, 0);
    expect(totalBonus).toBe(9_000);
  });

  it("uses the status given directly -- never re-derives it by comparing omzet (Rupiah) to a target in another unit", () => {
    // Kasus bug nyata: ChatBarber/ChatShoeTreatment target-nya kepala/pekerjaan,
    // BUKAN Rupiah -- omzet jutaan selalu >= target kepala yang cuma ratusan,
    // jadi membandingkan omzet ke target langsung SELALU salah bilang "Tercapai".
    // status di sini sudah dihitung benar oleh pemanggil (statusDivisi() di
    // lib/server/live.ts, satuan-aware), hitungTimMedia tidak boleh menghitung ulang.
    const hasil = hitungTimMedia(
      [{ nama: "ChatBarber Cempaka", omzet: 13_336_000, status: "Belum Tercapai" }],
      tigaOrang,
    );
    expect(hasil.rincianDivisi![0].status).toBe("Belum Tercapai");
    const totalBonus = hasil.pegawai.reduce((s, p) => s + p.bonus, 0);
    expect(totalBonus).toBe(0);
  });

  it("splits both pools evenly across however many people are given", () => {
    const hasil = hitungTimMedia(
      divisi6({ CHTTN: { omzet: 3_000_000, status: "Tercapai" } }),
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

  it("treats 'Target belum diatur' as not reached, never a free bonus", () => {
    const hasil = hitungTimMedia(divisi6({ CHTTN: { omzet: 5_000_000, status: "Target belum diatur" } }), tigaOrang);
    const totalBonus = hasil.pegawai.reduce((s, p) => s + p.bonus, 0);
    expect(totalBonus).toBe(0);
  });

  it("ignores a divisi name that isn't one of the 6 (e.g. KONVEKSI leaking through)", () => {
    const hasil = hitungTimMedia([...divisi6(), { nama: "KONVEKSI", omzet: 999_999_999, status: "Tercapai" }], tigaOrang);
    const total = hasil.pegawai.reduce((s, p) => s + p.insentif, 0);
    expect(total).toBe(6_000); // sama seperti tanpa KONVEKSI -- baris itu diabaikan
  });

  it("returns zero shares and an empty pegawai list when there are 0 recipients, instead of dividing by zero", () => {
    const hasil = hitungTimMedia(divisi6({ CHTTN: { omzet: 3_000_000, status: "Tercapai" } }), []);
    expect(hasil.pegawai).toEqual([]);
  });

  it("labels the group and reports how many of the 6 divisions hit target in keterangan", () => {
    const hasil = hitungTimMedia(divisi6({ CHTTN: { omzet: 3_000_000, status: "Tercapai" } }), tigaOrang);
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

  it("includes a per-divisi breakdown (rincianDivisi) with each divisi's own omzet/status and its pool contribution", () => {
    const hasil = hitungTimMedia(divisi6({ CHTTN: { omzet: 3_000_000, status: "Tercapai" } }), tigaOrang);
    expect(hasil.rincianDivisi).toHaveLength(6);
    const chttn = hasil.rincianDivisi!.find((r) => r.divisi === "CHTTN");
    expect(chttn).toEqual({ divisi: "CHTTN", omzet: 3_000_000, status: "Tercapai", insentif: 3_000, bonus: 9_000 });
    const cempaka = hasil.rincianDivisi!.find((r) => r.divisi === "ChatBarber Cempaka");
    expect(cempaka).toEqual({ divisi: "ChatBarber Cempaka", omzet: 1_000_000, status: "Belum Tercapai", insentif: 1_000, bonus: 0 });
  });

  it("rincianDivisi excludes a divisi name outside the 6, same as the pegawai totals", () => {
    const hasil = hitungTimMedia([...divisi6(), { nama: "KONVEKSI", omzet: 999_999_999, status: "Tercapai" }], tigaOrang);
    expect(hasil.rincianDivisi!.map((r) => r.divisi)).not.toContain("KONVEKSI");
  });
});
