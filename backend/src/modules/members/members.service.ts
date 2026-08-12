import { pool } from "../../db/pool";

export interface MemberSearchParams {
  query?: string;
  status?: "active" | "inactive";
  hasPhoto?: boolean;
  page: number;
  pageSize: number;
}

export async function searchMembers(params: MemberSearchParams) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.query) {
    values.push(`%${params.query}%`);
    conditions.push(`(member_id ILIKE $${values.length} OR name ILIKE $${values.length} OR phone ILIKE $${values.length})`);
  }
  if (params.status) {
    values.push(params.status);
    conditions.push(`status = $${values.length}`);
  }
  if (params.hasPhoto === true) {
    conditions.push(`photo_path IS NOT NULL`);
  } else if (params.hasPhoto === false) {
    conditions.push(`photo_path IS NULL`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (params.page - 1) * params.pageSize;

  values.push(params.pageSize);
  const limitIdx = values.length;
  values.push(offset);
  const offsetIdx = values.length;

  const { rows } = await pool.query(
    `SELECT member_id, name, status, issue_date, phone, (photo_path IS NOT NULL) AS has_photo
     FROM members
     ${where}
     ORDER BY member_id
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    values
  );

  const countValues = values.slice(0, conditions.length);
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM members ${where}`,
    countValues
  );

  return { rows, total: countRows[0]?.total ?? 0 };
}

export async function getMemberDetail(memberId: string) {
  const { rows } = await pool.query(
    `SELECT member_id, name, birth_date, issue_date, status, phone, created_at, updated_at,
            (photo_path IS NOT NULL) AS has_photo
     FROM members WHERE member_id = $1`,
    [memberId]
  );
  const member = rows[0];
  if (!member) return null;

  const { rows: lastChange } = await pool.query(
    `SELECT action, old_value, new_value, created_at
     FROM audit_logs WHERE member_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [memberId]
  );

  return { ...member, lastChange: lastChange[0] ?? null };
}

/**
 * 회원번호 권장 양식 "발급연도-일련번호" (예: 2026-1) 기준으로
 * 해당 연도의 다음 일련번호를 제안한다. 강제 규칙은 아니며 신규 등록 화면의 기본값으로만 사용된다.
 */
export async function suggestNextMemberId(year: number): Promise<string> {
  const { rows } = await pool.query(
    `SELECT member_id FROM members WHERE member_id ~ ('^' || $1::text || '-[0-9]+$')`,
    [String(year)]
  );
  let maxSerial = 0;
  for (const row of rows) {
    const serial = parseInt(String(row.member_id).split("-")[1], 10);
    if (Number.isFinite(serial) && serial > maxSerial) maxSerial = serial;
  }
  return `${year}-${maxSerial + 1}`;
}

export async function getDashboardStats() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE status = 'inactive')::int AS inactive,
      COUNT(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS new_recent
    FROM members
  `);
  const { rows: batches } = await pool.query(`
    SELECT id, file_name, uploaded_at, status, total_rows, new_count, updated_count, inactive_count, error_count
    FROM upload_batches ORDER BY uploaded_at DESC LIMIT 5
  `);
  const { rows: changes } = await pool.query(`
    SELECT member_id, action, created_at FROM audit_logs
    WHERE action NOT IN ('member_login_success','member_login_fail','admin_login_success','admin_login_fail')
    ORDER BY created_at DESC LIMIT 10
  `);
  return { counts: rows[0], recentBatches: batches, recentChanges: changes };
}
