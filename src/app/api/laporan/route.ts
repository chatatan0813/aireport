import { NextResponse } from "next/server";
import { getAiReportingRows, getPayrollRows } from "@/lib/server/sheets";
import { groupSnapshotDanRiwayat, mapPayrollRows } from "@/lib/transform";

export async function GET() {
  try {
    const [ai, payroll] = await Promise.all([getAiReportingRows(), getPayrollRows()]);
    const { snapshotTerbaru, riwayat } = groupSnapshotDanRiwayat(ai.data);

    return NextResponse.json({
      snapshotTerbaru,
      riwayat,
      payroll: mapPayrollRows(payroll.data),
      stale: ai.stale || payroll.stale,
    });
  } catch (err) {
    console.error("GET /api/laporan failed:", err);
    return NextResponse.json({ error: "Gagal memuat data, hubungi admin" }, { status: 500 });
  }
}
