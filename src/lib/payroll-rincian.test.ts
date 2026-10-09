import { describe, it, expect } from "vitest";
import { parseRincianBaris, parseRincianPayroll } from "./payroll-rincian";

describe("parseRincianBaris", () => {
  it("parses a normal (non-rugi) line, extracting status/laba bersih/insentif/bonus with percentages", () => {
    const baris =
      "CHTTN: omzet Rp 190.459.785, laba gabungan Rp 8.081.755, pajak CV 10% Rp 808.176, laba bersih Rp 7.273.579, Tercapai -> insentif Rp 109.104 (1.5%), bonus Rp 181.839 (2.5%)";
    expect(parseRincianBaris(baris)).toEqual({
      divisi: "CHTTN",
      rugi: false,
      labaBersih: 7_273_579,
      status: "Tercapai",
      insentif: 109_104,
      insentifPersen: 1.5,
      bonus: 181_839,
      bonusPersen: 2.5,
    });
  });

  it("parses 'Belum Tercapai' status distinctly from 'Tercapai' (not matched as a substring)", () => {
    const baris =
      "KONVEKSI: omzet Rp 93.381.831, laba gabungan Rp 14.415.381, pajak CV 10% Rp 1.441.538, laba bersih Rp 12.973.843, Belum Tercapai -> insentif Rp 194.608 (1.5%), bonus Rp 0 (2.5%)";
    const hasil = parseRincianBaris(baris);
    expect(hasil?.status).toBe("Belum Tercapai");
    expect(hasil?.bonus).toBe(0);
  });

  it("keeps the Pomade-combined label intact (colon only appears once, before it)", () => {
    const baris =
      "ChatBarber Cempaka (+ Pomade Cempaka): omzet Rp 60.056.833 + omzet Pomade Rp 2.962.100, laba gabungan Rp 1.591.805, pajak CV 10% Rp 159.181, laba bersih Rp 1.432.624, Belum Tercapai -> insentif Rp 0 (0%), bonus Rp 0 (0.5%)";
    const hasil = parseRincianBaris(baris);
    expect(hasil?.divisi).toBe("ChatBarber Cempaka (+ Pomade Cempaka)");
    expect(hasil?.insentifPersen).toBe(0);
    expect(hasil?.bonusPersen).toBe(0.5);
  });

  it("parses a rugi line with no laba bersih/percentages (the workflow never computes them for a loss)", () => {
    const baris = "ChatBarber Pinus: omzet Rp 10.000.000, laba gabungan Rp -500.000 -> Rugi -> insentif Rp0, bonus Rp0";
    expect(parseRincianBaris(baris)).toEqual({
      divisi: "ChatBarber Pinus",
      rugi: true,
      labaBersih: null,
      status: "Rugi",
      insentif: 0,
      insentifPersen: null,
      bonus: 0,
      bonusPersen: null,
    });
  });

  it("returns null for a line that isn't shaped like a rincian entry at all", () => {
    expect(parseRincianBaris("baris sampah tanpa titik dua")).toBeNull();
    expect(parseRincianBaris("Divisi Aneh: tidak ada status atau angka di sini")).toBeNull();
  });
});

describe("parseRincianPayroll", () => {
  it("splits a multi-line rincianDivisi blob, skipping blank lines, dropping unparseable ones", () => {
    const teks = [
      "CHTTN: omzet Rp 190.459.785, laba gabungan Rp 8.081.755, pajak CV 10% Rp 808.176, laba bersih Rp 7.273.579, Tercapai -> insentif Rp 109.104 (1.5%), bonus Rp 181.839 (2.5%)",
      "",
      "KONVEKSI: omzet Rp 93.381.831, laba gabungan Rp 14.415.381, pajak CV 10% Rp 1.441.538, laba bersih Rp 12.973.843, Belum Tercapai -> insentif Rp 194.608 (1.5%), bonus Rp 0 (2.5%)",
    ].join("\n");
    const hasil = parseRincianPayroll(teks);
    expect(hasil.map((r) => r.divisi)).toEqual(["CHTTN", "KONVEKSI"]);
  });

  it("returns an empty array for an empty blob", () => {
    expect(parseRincianPayroll("")).toEqual([]);
  });
});
