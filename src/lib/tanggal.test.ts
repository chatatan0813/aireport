import { describe, expect, it } from "vitest";
import { formatTanggal, formatTanggalIso } from "./tanggal";

describe("formatTanggal", () => {
  it("dd-mm-yyyy dengan nol di depan", () => {
    expect(formatTanggal(new Date(2026, 9, 5))).toBe("05-10-2026");
  });
});

describe("formatTanggalIso", () => {
  it("tanggal saja", () => {
    expect(formatTanggalIso("2026-10-01")).toBe("01-10-2026");
  });
  it("tanggal + jam jadi 24h tanpa detik", () => {
    expect(formatTanggalIso("2026-10-12 8:01:08")).toBe("12-10-2026 08:01");
    expect(formatTanggalIso("2026-10-12T14:05:00")).toBe("12-10-2026 14:05");
  });
  it("teks bukan tanggal ISO dikembalikan apa adanya", () => {
    expect(formatTanggalIso("Oktober 2026")).toBe("Oktober 2026");
  });
});
