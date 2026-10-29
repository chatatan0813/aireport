/** Tanggal format dd-mm-yyyy (aturan owner untuk semua app), mis. 29-10-2026. */
export function formatTanggal(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

/**
 * Teks tanggal dari sheet/API ("2026-10-01" atau "2026-10-12 8:01:08") jadi
 * "01-10-2026" / "12-10-2026 08:01" (jam 24h, tanpa detik). Teks yang tidak
 * berbentuk tanggal ISO dikembalikan apa adanya.
 */
export function formatTanggalIso(teks: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(teks.trim());
  if (!m) return teks;
  const [, yyyy, mm, dd, jam, menit] = m;
  const tanggal = `${dd}-${mm}-${yyyy}`;
  return jam ? `${tanggal} ${jam.padStart(2, "0")}:${menit}` : tanggal;
}
