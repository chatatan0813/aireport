/** Tanggal format dd-mm-yyyy (aturan owner untuk semua app), mis. 29-10-2026. */
export function formatTanggal(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}
