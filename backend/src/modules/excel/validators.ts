import { parseFlexibleDate } from "../../utils/dateUtils";
import { parsePhone } from "../../utils/phoneUtils";
import { FieldKey, FIELD_LABELS } from "./columnMapping";

export type ChangeType = "new" | "update" | "unchanged" | "inactive" | "error";

export interface StagedRow {
  rowNumber: number;
  memberId: string | null;
  name: string | null;
  birthDate: string | null;
  issueDate: string | null;
  photoFile: string | null;
  phone: string | null; // 정규화된 숫자만 (로그인에 사용)
  targetStatus: "active" | "inactive" | null;
  errors: string[];
  changeType: ChangeType;
  diff: Record<string, { before: unknown; after: unknown }>;
  photoAvailable: boolean | null; // null = 사진파일명 지정 안됨
  memberIdAssigned: boolean; // true면 회원번호가 비어 있어 시스템이 자동으로 채번함
  issueDateDefaulted: boolean; // true면 발급일이 비어 있어 업로드일로 채움
}

const INACTIVE_STATUS_VALUES = new Set(["탈퇴", "자격상실", "삭제", "비활성", "inactive"]);
const ACTIVE_STATUS_VALUES = new Set(["정상", "재직", "active", ""]);

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function extractSerial(memberId: string, year: number): number | null {
  const m = memberId.match(new RegExp(`^${year}-([0-9]+)$`));
  return m ? parseInt(m[1], 10) : null;
}

export interface ExistingMember {
  member_id: string;
  name: string;
  birth_date: string; // ISO (YYYY-MM-DD)
  issue_date: string;
  status: "active" | "inactive";
  photo_path: string | null;
  phone: string | null;
}

/**
 * 필수 항목: 이름, 휴대폰번호, 생년월일.
 * 선택 항목: 회원번호(비어 있으면 "발급연도-일련번호"로 자동 채번), 발급일(비어 있으면 업로드일),
 *            사진파일명, 상태(비어 있으면 정상 처리).
 */
export function validateRows(
  rawRows: Record<string, unknown>[],
  mapping: Partial<Record<FieldKey, string>>,
  existingMembers: Map<string, ExistingMember>,
  availablePhotoFiles: Set<string>
): StagedRow[] {
  const year = new Date().getFullYear();
  const seenMemberIds = new Map<string, number>(); // memberId -> first row number
  const seenPhones = new Map<string, number>(); // phone -> first row number
  // 회원번호가 다른 기존 회원이 이미 사용 중인 휴대폰번호인지 확인하기 위한 역인덱스
  const phoneOwnerMemberId = new Map<string, string>();
  for (const m of existingMembers.values()) {
    if (m.phone) phoneOwnerMemberId.set(m.phone, m.member_id);
  }

  // 회원번호가 비어 있는 행에 "발급연도-일련번호"를 자동 채번하기 위해,
  // 기존 DB 값과 이번 엑셀에 명시적으로 적힌 값 중 해당 연도의 최대 일련번호를 먼저 파악한다.
  let nextSerial = 1;
  for (const m of existingMembers.values()) {
    const s = extractSerial(m.member_id, year);
    if (s !== null && s >= nextSerial) nextSerial = s + 1;
  }
  if (mapping.memberId) {
    for (const raw of rawRows) {
      const v = cellToString(raw[mapping.memberId]);
      if (!v) continue;
      const s = extractSerial(v, year);
      if (s !== null && s >= nextSerial) nextSerial = s + 1;
    }
  }

  return rawRows.map((raw, idx) => {
    const rowNumber = idx + 2; // 1행은 헤더
    const errors: string[] = [];

    const get = (field: FieldKey): string => {
      const col = mapping[field];
      if (!col) return "";
      return cellToString(raw[col]);
    };

    const memberIdRaw = get("memberId");
    const nameRaw = get("name");
    const birthRaw = mapping.birthDate ? raw[mapping.birthDate] : "";
    const issueRaw = mapping.issueDate ? raw[mapping.issueDate] : "";
    const photoFileRaw = get("photoFile");
    const statusRaw = get("status");
    const phoneRaw = get("phone");

    if (!nameRaw) errors.push(`${FIELD_LABELS.name} 없음`);

    let birthIso: string | null = null;
    if (birthRaw === "" || birthRaw === undefined || birthRaw === null) {
      errors.push(`${FIELD_LABELS.birthDate} 없음`);
    } else {
      const r = parseFlexibleDate(birthRaw);
      if (!r.ok) errors.push(`${FIELD_LABELS.birthDate} 형식 오류: ${r.error}`);
      else birthIso = r.iso;
    }

    // 발급일이 비어 있으면 업로드일로 채운다 (PRD 35 — 임의로 다른 날짜를 지어내지 않고, 업로드 시점을 사용)
    let issueIso: string;
    let issueDateDefaulted = false;
    if (issueRaw === "" || issueRaw === undefined || issueRaw === null) {
      issueIso = todayIso();
      issueDateDefaulted = true;
    } else {
      const r = parseFlexibleDate(issueRaw);
      if (!r.ok) {
        errors.push(`${FIELD_LABELS.issueDate} 형식 오류: ${r.error}`);
        issueIso = "";
      } else {
        issueIso = r.iso;
      }
    }

    // 회원번호가 비어 있으면 "발급연도-일련번호" 형식으로 자동 채번한다.
    let memberId = memberIdRaw;
    let memberIdAssigned = false;
    if (!memberId) {
      memberId = `${year}-${nextSerial}`;
      nextSerial++;
      memberIdAssigned = true;
    }

    // 휴대폰번호 (필수, 회원 로그인 식별자로 사용되므로 형식·중복도 엄격히 검증)
    let phoneNormalized: string | null = null;
    if (!phoneRaw) {
      errors.push(`${FIELD_LABELS.phone} 없음`);
    } else {
      const r = parsePhone(phoneRaw);
      if (!r.ok) {
        errors.push(`${FIELD_LABELS.phone} 형식 오류: ${r.error}`);
      } else {
        phoneNormalized = r.normalized;
        const firstSeenRow = seenPhones.get(phoneNormalized);
        if (firstSeenRow) {
          errors.push(`휴대폰번호 중복 (${firstSeenRow}행과 중복)`);
        } else {
          seenPhones.set(phoneNormalized, rowNumber);
        }
        const owner = phoneOwnerMemberId.get(phoneNormalized);
        if (owner && owner !== memberId) {
          errors.push(`휴대폰번호가 이미 다른 회원(${owner})에게 등록되어 있음`);
        }
      }
    }

    // 회원번호 중복 (엑셀 내부) — 명시적으로 적은 값끼리만 해당 (자동 채번은 서로 겹치지 않도록 보장됨)
    if (memberIdRaw) {
      const firstSeenRow = seenMemberIds.get(memberId);
      if (firstSeenRow) {
        errors.push(`회원번호 중복 (${firstSeenRow}행과 중복)`);
      } else {
        seenMemberIds.set(memberId, rowNumber);
      }
    }

    let targetStatus: "active" | "inactive" | null = null;
    if (INACTIVE_STATUS_VALUES.has(statusRaw)) {
      targetStatus = "inactive";
    } else if (ACTIVE_STATUS_VALUES.has(statusRaw)) {
      targetStatus = "active";
    } else if (statusRaw) {
      errors.push(`상태 값을 인식할 수 없음: "${statusRaw}" (허용: 정상/탈퇴/자격상실/삭제/비활성)`);
    } else {
      targetStatus = "active";
    }

    let photoAvailable: boolean | null = null;
    if (photoFileRaw) {
      photoAvailable = availablePhotoFiles.has(photoFileRaw);
    }

    if (errors.length > 0) {
      return {
        rowNumber,
        memberId: memberId || null,
        name: nameRaw || null,
        birthDate: birthIso,
        issueDate: issueIso || null,
        photoFile: photoFileRaw || null,
        phone: phoneNormalized,
        targetStatus,
        errors,
        changeType: "error",
        diff: {},
        photoAvailable,
        memberIdAssigned,
        issueDateDefaulted,
      };
    }

    const existing = existingMembers.get(memberId);
    const diff: Record<string, { before: unknown; after: unknown }> = {};
    let changeType: ChangeType;

    if (!existing) {
      changeType = "new";
    } else {
      if (existing.name !== nameRaw) diff.name = { before: existing.name, after: nameRaw };
      if (existing.birth_date !== birthIso) diff.birthDate = { before: existing.birth_date, after: birthIso };
      if (!issueDateDefaulted && existing.issue_date !== issueIso) {
        diff.issueDate = { before: existing.issue_date, after: issueIso };
      }
      if (existing.status !== targetStatus) diff.status = { before: existing.status, after: targetStatus };
      if (phoneRaw && existing.phone !== phoneNormalized) diff.phone = { before: existing.phone, after: phoneNormalized };
      if (photoFileRaw && photoAvailable) diff.photo = { before: !!existing.photo_path, after: true };

      if (targetStatus === "inactive" && existing.status !== "inactive") {
        changeType = "inactive";
      } else if (Object.keys(diff).length > 0) {
        changeType = "update";
      } else {
        changeType = "unchanged";
      }
    }

    return {
      rowNumber,
      memberId,
      name: nameRaw,
      birthDate: birthIso,
      issueDate: issueDateDefaulted && existing ? existing.issue_date : issueIso,
      photoFile: photoFileRaw || null,
      phone: phoneNormalized,
      targetStatus,
      errors: [],
      changeType,
      diff,
      photoAvailable,
      memberIdAssigned,
      issueDateDefaulted,
    };
  });
}

export function summarize(rows: StagedRow[]) {
  return {
    totalRows: rows.length,
    newCount: rows.filter((r) => r.changeType === "new").length,
    updatedCount: rows.filter((r) => r.changeType === "update").length,
    unchangedCount: rows.filter((r) => r.changeType === "unchanged").length,
    inactiveCount: rows.filter((r) => r.changeType === "inactive").length,
    errorCount: rows.filter((r) => r.changeType === "error").length,
  };
}
