import { google } from "googleapis";

export type SheetRow = Record<string, string>;

type CacheEntry = { data: SheetRow[]; fetchedAt: number };
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

async function readTab(range: string): Promise<SheetRow[]> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  }
  if (!process.env.GOOGLE_SHEET_ID) {
    throw new Error("GOOGLE_SHEET_ID is not set");
  }

  let credentials;
  try {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const values = res.data.values ?? [];
  if (values.length === 0) return [];

  const header = values[0];
  const dataRows = values.slice(1);

  return dataRows.map((row) => {
    const obj: SheetRow = {};
    header.forEach((col, i) => {
      obj[col] = String(row[i] ?? "");
    });
    return obj;
  });
}

export type SheetReadResult = { data: SheetRow[]; stale: boolean };

async function readCached(cacheKey: string, range: string, forceRefresh?: boolean): Promise<SheetReadResult> {
  const cached = cache.get(cacheKey);
  if (!forceRefresh && cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    return { data: cached.data, stale: false };
  }
  try {
    const data = await readTab(range);
    cache.set(cacheKey, { data, fetchedAt: Date.now() });
    return { data, stale: false };
  } catch (err) {
    // Spec section 8: Sheets API gagal/timeout -> serve last-known-good data
    // (even if past its 5-minute freshness window) instead of failing the
    // whole page. Only propagates the error when there is truly nothing
    // cached yet (e.g. very first request after a cold deploy).
    if (cached) {
      console.error(`Sheets fetch for "${cacheKey}" failed, serving stale cache:`, err);
      return { data: cached.data, stale: true };
    }
    throw err;
  }
}

export async function getAiReportingRows(opts?: { forceRefresh?: boolean }): Promise<SheetReadResult> {
  return readCached("ai-reporting", "Untitled!A:Z", opts?.forceRefresh);
}

export async function getPayrollRows(opts?: { forceRefresh?: boolean }): Promise<SheetReadResult> {
  return readCached("payroll", "Payroll!A:G", opts?.forceRefresh);
}
