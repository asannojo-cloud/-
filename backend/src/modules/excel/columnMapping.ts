export type FieldKey = "memberId" | "name" | "birthDate" | "issueDate" | "photoFile" | "status" | "phone";

export const FIELD_LABELS: Record<FieldKey, string> = {
  memberId: "회원번호",
  name: "이름",
  birthDate: "생년월일",
  issueDate: "발급일",
  photoFile: "사진파일명",
  status: "상태",
  phone: "휴대폰번호",
};

// 회원번호·발급일·사진파일명·상태는 비어 있어도 업로드할 수 있다.
// (회원번호는 비어 있으면 시스템이 "발급연도-일련번호" 형식으로 자동 채번,
//  발급일은 비어 있으면 업로드일로 채운다 — PRD 35 "업로드일을 사용할 수 있다")
export const REQUIRED_FIELDS: FieldKey[] = ["name", "phone", "birthDate"];

// 실제 노조 명부 컬럼명이 달라도 자동 매핑을 시도하기 위한 별칭 테이블 (PRD 51)
const ALIASES: Record<FieldKey, string[]> = {
  memberId: ["회원번호", "조합원번호", "사번", "회원id", "회원 id", "memberid", "member_id"],
  name: ["이름", "성명", "name"],
  birthDate: ["생년월일", "생일", "birthdate", "birth_date"],
  issueDate: ["발급일", "발급일자", "카드발급일", "issuedate", "issue_date"],
  photoFile: ["사진파일명", "사진", "사진파일", "photo", "photofile"],
  status: ["상태", "회원상태", "자격상태", "status"],
  phone: ["휴대폰번호", "휴대폰", "핸드폰번호", "핸드폰", "전화번호", "연락처", "phone", "mobile", "phonenumber"],
};

function normalize(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, "");
}

export function suggestColumnMapping(headers: string[]): Partial<Record<FieldKey, string>> {
  const mapping: Partial<Record<FieldKey, string>> = {};
  const normalizedHeaders = headers.map((h) => ({ raw: h, norm: normalize(h) }));

  for (const field of Object.keys(ALIASES) as FieldKey[]) {
    const aliasSet = ALIASES[field].map(normalize);
    const match = normalizedHeaders.find((h) => aliasSet.includes(h.norm));
    if (match) mapping[field] = match.raw;
  }
  return mapping;
}
