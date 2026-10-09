import { describe, it, expect } from "vitest";
import { filterTimMedia, type PegawaiHrd } from "./hrd-sheet";

describe("filterTimMedia", () => {
  const baris = (nama: string, cabang: string, jabatan: string): PegawaiHrd => ({ nama, cabang, jabatan });

  it("selects only cabang='Creative' rows with the combined content-creator/desain-grafis jabatan", () => {
    const rows = [
      baris("Muhammad Reza", "Creative", "Content creator & Desain grafis"),
      baris("Muhammad Bahrul Fahmi", "Creative", "Content creator & Desain grafis"),
    ];
    const hasil = filterTimMedia(rows);
    expect(hasil.map((a) => a.nama)).toEqual(["Muhammad Reza", "Muhammad Bahrul Fahmi"]);
  });

  it("excludes a same-jabatan row whose cabang is a toko, not Creative (the real Ery Rusadi case)", () => {
    const rows = [
      baris("Ery Rusadi", "CHTTN", "Content creator & Desain grafis"),
      baris("Muhammad Reza", "Creative", "Content creator & Desain grafis"),
    ];
    const hasil = filterTimMedia(rows);
    expect(hasil.map((a) => a.nama)).toEqual(["Muhammad Reza"]);
  });

  it("excludes a Creative-cabang row with a different jabatan", () => {
    const rows = [baris("Orang Lain", "Creative", "Admin & Accounting")];
    expect(filterTimMedia(rows)).toEqual([]);
  });

  it("returns an empty roster for an empty or unrelated sheet -- no manual head added anymore", () => {
    expect(filterTimMedia([])).toEqual([]);
    expect(filterTimMedia([baris("Someone Else", "CHTTN", "Kasir")])).toEqual([]);
  });
});
