import { describe, it, expect } from "vitest";
import { bankDivisi, hitungPembayaranBank } from "./payroll-bank";
import type { RincianDivisi } from "./payroll-rincian";

function divisi(nama: string, labaBersih: number | null, status = "Belum Tercapai"): RincianDivisi {
  return {
    divisi: nama,
    rugi: labaBersih === null,
    labaBersih,
    status: labaBersih === null ? "Rugi" : status,
    insentif: 0,
    insentifPersen: null,
    bonus: 0,
    bonusPersen: null,
  };
}

// Contoh asli dari owner: Rizki, September 2026, Total THP Rp3.141.719.
const RIZKI_SEPTEMBER: RincianDivisi[] = [
  divisi("ChatBarber Cempaka (+ Pomade Cempaka)", 1_432_624),
  divisi("ChatBarber Pinus (+ Pomade Pinus)", 16_380_512),
  divisi("ChatShoeTreatment Cempaka", 7_683_897),
  divisi("ChatShoeTreatment Pinus", 3_016_887),
  divisi("ChatBox", 6_016_456),
  divisi("CHTTN", 7_665_079, "Tercapai"),
  divisi("KONVEKSI", 12_973_843),
];

describe("bankDivisi", () => {
  it("memetakan divisi CBCST ke BSI, ChatBox ke BTN, CHTTN/KONVEKSI ke Mandiri", () => {
    expect(bankDivisi("ChatBarber Cempaka (+ Pomade Cempaka)")).toBe("BSI");
    expect(bankDivisi("ChatShoeTreatment Pinus")).toBe("BSI");
    expect(bankDivisi("Pomade Cempaka")).toBe("BSI");
    expect(bankDivisi("ChatBox")).toBe("BTN");
    expect(bankDivisi("CHTTN")).toBe("Mandiri");
    expect(bankDivisi("KONVEKSI")).toBe("Mandiri");
  });

  it("tidak peka huruf besar/kecil", () => {
    expect(bankDivisi("chatbox")).toBe("BTN");
    expect(bankDivisi("Konveksi")).toBe("Mandiri");
  });

  it("divisi tak dikenal mengembalikan null", () => {
    expect(bankDivisi("Divisi Baru")).toBeNull();
  });
});

describe("hitungPembayaranBank", () => {
  const hasil = hitungPembayaranBank(RIZKI_SEPTEMBER, 3_141_719);

  it("persentase divisi = laba bersih / total laba bersih (cocok dengan contoh owner, dibulatkan)", () => {
    expect(hasil.divisi.map((d) => Math.round(d.persen * 100))).toEqual([3, 30, 14, 5, 11, 14, 24]);
    expect(hasil.divisi.map((d) => d.bank)).toEqual(["BSI", "BSI", "BSI", "BSI", "BTN", "Mandiri", "Mandiri"]);
  });

  it("menjumlah per bank dengan urutan BSI, BTN, Mandiri dan persen 52/11/37", () => {
    expect(hasil.bank.map((b) => b.bank)).toEqual(["BSI", "BTN", "Mandiri"]);
    expect(hasil.bank.map((b) => Math.round(b.persen * 100))).toEqual([52, 11, 37]);
  });

  it("nominal per bank mendekati contoh owner (selisih pembulatan â‰¤ Rp3) dan totalnya TEPAT Total THP", () => {
    const [bsi, btn, bri] = hasil.bank.map((b) => b.nominal);
    expect(Math.abs(bsi - 1_623_779)).toBeLessThanOrEqual(3);
    expect(Math.abs(btn - 342_618)).toBeLessThanOrEqual(3);
    expect(Math.abs(bri - 1_175_322)).toBeLessThanOrEqual(3);
    expect(bsi + btn + bri).toBe(3_141_719);
  });

  it("divisi rugi dihitung 0% dan tidak ikut menambah penyebut", () => {
    const r = hitungPembayaranBank([divisi("ChatBox", 1_000_000), divisi("CHTTN", null), divisi("KONVEKSI", 3_000_000)], 100_000);
    expect(r.divisi.map((d) => d.persen)).toEqual([0.25, 0, 0.75]);
    expect(r.bank).toEqual([
      { bank: "BTN", persen: 0.25, nominal: 25_000 },
      { bank: "Mandiri", persen: 0.75, nominal: 75_000 },
    ]);
  });

  it("laba bersih negatif diperlakukan sebagai 0", () => {
    const r = hitungPembayaranBank([divisi("ChatBox", -500_000), divisi("CHTTN", 2_000_000)], 10_000);
    expect(r.divisi[0].persen).toBe(0);
    expect(r.bank).toEqual([{ bank: "Mandiri", persen: 1, nominal: 10_000 }]);
  });

  it("pembulatan sisa dibagi supaya total tetap sama (3 bank sepertiga)", () => {
    const r = hitungPembayaranBank(
      [divisi("ChatBox", 1), divisi("CHTTN", 1), divisi("ChatBarber Pinus", 1)],
      100
    );
    expect(r.bank.reduce((s, b) => s + b.nominal, 0)).toBe(100);
    expect(r.bank.map((b) => b.nominal).sort()).toEqual([33, 33, 34]);
  });

  it("semua divisi rugi / tanpa laba: tidak ada pembagian bank", () => {
    const r = hitungPembayaranBank([divisi("ChatBox", null), divisi("CHTTN", 0)], 50_000);
    expect(r.bank).toEqual([]);
    expect(r.divisi.every((d) => d.persen === 0)).toBe(true);
  });

  it("divisi tanpa bank yang dikenal masuk kelompok 'Lainnya' di akhir", () => {
    const r = hitungPembayaranBank([divisi("Divisi Baru", 1_000), divisi("ChatBox", 1_000)], 1_000);
    expect(r.bank.map((b) => b.bank)).toEqual(["BTN", "Lainnya"]);
    expect(r.divisi[0].bank).toBe("Lainnya");
  });
});
