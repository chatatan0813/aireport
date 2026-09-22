export function formatRupiah(n: number): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}
