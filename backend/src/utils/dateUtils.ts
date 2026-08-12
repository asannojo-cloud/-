/**
 * PRD 11번: 생년월일/발급일 형식을 안전하게 처리한다.
 * 허용 입력: YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD, YYYYMMDD, Date 객체, Excel serial number
 * 출력: 항상 YYYY-MM-DD 로 표준화. 존재하지 않는 날짜(2026-02-31 등)는 오류 처리.
 */
export type DateParseResult = { ok: true; iso: string } | { ok: false; error: string };

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function isValidCalendarDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Excel(Windows)의 날짜 직렬값 기준일: 1899-12-30
function excelSerialToDate(serial: number): { y: number; m: number; d: number } | null {
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const epoch = Date.UTC(1899, 11, 30);
  const ms = epoch + Math.round(serial) * 86400000;
  const date = new Date(ms);
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

export function parseFlexibleDate(raw: unknown): DateParseResult {
  if (raw === null || raw === undefined || raw === "") {
    return { ok: false, error: "값이 비어 있습니다." };
  }

  // Excel이 날짜 서식 셀을 JS Date 객체로 넘겨주는 경우 (SheetJS cellDates:true)
  if (raw instanceof Date) {
    const y = raw.getFullYear();
    const m = raw.getMonth() + 1;
    const d = raw.getDate();
    if (!isValidCalendarDate(y, m, d)) return { ok: false, error: "존재하지 않는 날짜입니다." };
    return { ok: true, iso: `${y}-${pad2(m)}-${pad2(d)}` };
  }

  if (typeof raw === "number") {
    const parsed = excelSerialToDate(raw);
    if (!parsed || !isValidCalendarDate(parsed.y, parsed.m, parsed.d)) {
      return { ok: false, error: "존재하지 않는 날짜입니다." };
    }
    return { ok: true, iso: `${parsed.y}-${pad2(parsed.m)}-${pad2(parsed.d)}` };
  }

  const str = String(raw).trim();

  // YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD
  let m = str.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    if (!isValidCalendarDate(y, mo, d)) return { ok: false, error: "존재하지 않는 날짜입니다." };
    return { ok: true, iso: `${y}-${pad2(mo)}-${pad2(d)}` };
  }

  // YYYYMMDD
  m = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    if (!isValidCalendarDate(y, mo, d)) return { ok: false, error: "존재하지 않는 날짜입니다." };
    return { ok: true, iso: `${y}-${pad2(mo)}-${pad2(d)}` };
  }

  return { ok: false, error: `인식할 수 없는 날짜 형식입니다: "${str}"` };
}
