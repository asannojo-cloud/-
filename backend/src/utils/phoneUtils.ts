/**
 * 휴대폰번호를 숫자만 남긴 정규 형식으로 표준화한다.
 * 입력 형식이 010-1234-5678 / 010 1234 5678 / 01012345678 등 무엇이든
 * 동일하게 매칭되도록 하기 위함 (로그인 시 정확 일치 비교에 사용).
 */
export type PhoneParseResult = { ok: true; normalized: string } | { ok: false; error: string };

export function parsePhone(raw: unknown): PhoneParseResult {
  if (raw === null || raw === undefined || raw === "") {
    return { ok: false, error: "값이 비어 있습니다." };
  }
  const digits = String(raw).replace(/\D/g, "");
  if (!/^01[016789]\d{7,8}$/.test(digits)) {
    return { ok: false, error: `휴대폰번호 형식이 올바르지 않습니다: "${raw}"` };
  }
  return { ok: true, normalized: digits };
}

/** 화면 표시용으로 010-1234-5678 형태로 되돌린다. */
export function formatPhoneDisplay(normalized: string): string {
  if (normalized.length === 11) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`;
  }
  if (normalized.length === 10) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  return normalized;
}
