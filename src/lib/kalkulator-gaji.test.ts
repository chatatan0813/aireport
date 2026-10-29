import { describe, expect, it } from "vitest";
import type { Divisi } from "./transform";
import { PENERIMA_GAJI, divisiDipegang, hitungTransferSisaGaji } from "./kalkulator-gaji";

const d = (nama: string, laba: number | null): Divisi => ({
  nama, laba, omzet: 0, capaian: 0, target: 0, satuanTarget: "Rupiah", status: "", laporanAi: "", sumberAi: "",
});

const live = [
  d("ChatBarber Cempaka", 20_000_000),
  d("Pomade Cempaka", 500_000),
  d("ChatBarber Pinus", 19_500_000),
  d("ChatShoeTreatment Cempaka", 5_000_000),
  d("ChatShoeTreatment Pinus", -1_000_000),
  d("CHTTN", 30_000_000),
  d("ChatBox", 10_000_000),
  d("KONVEKSI", 10_000_000),
];
const awalan = (nama: string) => PENERIMA_GAJI.find((p) => p.nama === nama)!.divisi;

describe("kalkulator sisa gaji", () => {
  it("Tisma hanya ChatBarber/Pomade + ChatBox -> BSI & BTN", () => {
    expect(divisiDipegang(awalan("Tisma H."), live).map((x) => x.nama)).toEqual([
      "ChatBarber Cempaka", "Pomade Cempaka", "ChatBarber Pinus", "ChatBox",
    ]);
    const t = hitungTransferSisaGaji(awalan("Tisma H."), live, 1_000_000);
    expect(t).toEqual([
      { bank: "BSI", persen: 0.8, nominal: 800_000 },
      { bank: "BTN", persen: 0.2, nominal: 200_000 },
    ]);
  });

  it("Alpri hanya CHTTN + KONVEKSI -> 100% Mandiri", () => {
    expect(hitungTransferSisaGaji(awalan("Alpri Andrian"), live, 2_500_000)).toEqual([
      { bank: "Mandiri", persen: 1, nominal: 2_500_000 },
    ]);
  });

  it("divisi rugi dihitung 0% dan total selalu pas", () => {
    const t = hitungTransferSisaGaji(awalan("Fitri Isnawati"), live, 1_234_567);
    expect(t.map((b) => b.bank)).toEqual(["BSI", "Mandiri"]);
    expect(t.reduce((s, b) => s + b.nominal, 0)).toBe(1_234_567);
  });

  it("sisa gaji kosong/0 -> tidak ada transfer", () => {
    expect(hitungTransferSisaGaji(awalan("Rizki"), live, 0)).toEqual([]);
  });
});
