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
    // 엑셀 셀이 날짜 서식이 아니라 "19850315"처럼 YYYYMMDD 형태의 순수 숫자로
    // 입력된 경우가 있다. 이런 값을 Excel 일련값으로 해석하면 연도가 수만 년대로
    // 튀는 오류가 발생하므로(2026-08-12 발견), 8자리 정수는 먼저 YYYYMMDD로 시도한다.
    // 실제 Excel 날짜 일련값은 8자리(1000만 이상)에 도달하려면 서기 27000년대가
    // 되어야 하므로 이 둘은 자릿수로 명확히 구분된다.
    if (Number.isInteger(raw) && raw >= 10000101 && raw <= 99991231) {
      const y = Math.floor(raw / 10000);
      const mo = Math.floor((raw % 10000) / 100);
      const d = raw % 100;
      if (isValidCalendarDate(y, mo, d)) {
        return { ok: true, iso: `${y}-${pad2(mo)}-${pad2(d)}` };
      }
      // 8자리 숫자인데 달력상 존재하지 않는 날짜라면 오류로 처리한다.
      // (Excel 일련값은 이 범위에 도달할 수 없으므로 재해석 대상이 아니다.)
      return { ok: false, error: "존재하지 않는 날짜입니다." };
    }

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
