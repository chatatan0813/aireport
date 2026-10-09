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
    expect(hasil.map((a) => a.nama)).toEqual(["Alpri Andrian", "Muhammad Reza", "Muhammad Bahrul Fahmi"]);
  });

  it("excludes a same-jabatan row whose cabang is a toko, not Creative (the real Ery Rusadi case)", () => {
    const rows = [
      baris("Ery Rusadi", "CHTTN", "Content creator & Desain grafis"),
      baris("Muhammad Reza", "Creative", "Content creator & Desain grafis"),
    ];
    const hasil = filterTimMedia(rows);
    expect(hasil.map((a) => a.nama)).toEqual(["Alpri Andrian", "Muhammad Reza"]);
  });

  it("always puts Alpri Andrian first as Head even with an empty or unrelated sheet", () => {
    expect(filterTimMedia([]).map((a) => a.nama)).toEqual(["Alpri Andrian"]);
    expect(filterTimMedia([baris("Someone Else", "CHTTN", "Kasir")]).map((a) => a.nama)).toEqual(["Alpri Andrian"]);
  });

  it("does not add Alpri Andrian twice if the sheet itself also lists him under the filter", () => {
    const rows = [baris("Alpri Andrian", "Creative", "Content creator & Desain grafis")];
    const hasil = filterTimMedia(rows);
    expect(hasil.filter((a) => a.nama === "Alpri Andrian")).toHaveLength(1);
  });
});
