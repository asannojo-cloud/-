import * as XLSX from "xlsx";

export interface ParsedWorkbook {
  headers: string[];
  rows: Record<string, unknown>[];
}

export function parseWorkbook(buffer: Buffer): ParsedWorkbook {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [] };
  }
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });

  const headers: string[] = XLSX.utils
    .sheet_to_json<string[]>(sheet, { header: 1, range: 0 })[0]
    ?.map((h) => String(h ?? "").trim())
    .filter((h) => h.length > 0) ?? [];

  return { headers, rows: json };
}
