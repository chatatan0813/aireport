"use client";

import { useEffect, useState } from "react";

/**
 * State+efek untuk cetak SATU kartu: kartu lain diberi `print:hidden` lewat
 * `cetakId` yang dikembalikan (bandingkan id kartu terhadapnya), chrome
 * halaman (header/nav/filter) sudah `print:hidden` statis di tempat lain.
 * Begitu dialog print ditutup/dibatalkan (`afterprint`), state direset
 * otomatis supaya tampilan layar balik normal tanpa aksi tambahan.
 */
export function useCetakKartu() {
  const [cetakId, setCetakId] = useState<string | null>(null);

  useEffect(() => {
    if (cetakId === null) return;
    const reset = () => setCetakId(null);
    window.addEventListener("afterprint", reset);
    // Tunggu 1 frame (kartu lain sudah dapat print:hidden lewat re-render)
    // sebelum dialog print dibuka, supaya browser sempat re-layout dulu.
    const frame = window.requestAnimationFrame(() => window.print());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", reset);
    };
  }, [cetakId]);

  return { cetakId, setCetakId };
}
