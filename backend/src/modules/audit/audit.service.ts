import { Pool, PoolClient } from "pg";
import { pool } from "../../db/pool";

export interface AuditEntry {
  adminId?: number | null;
  memberId?: string | null;
  batchId?: number | null;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export async function recordAudit(entry: AuditEntry, client: Pool | PoolClient = pool) {
  await client.query(
    `INSERT INTO audit_logs (admin_id, member_id, batch_id, action, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      entry.adminId ?? null,
      entry.memberId ?? null,
      entry.batchId ?? null,
      entry.action,
      entry.oldValue ? JSON.stringify(entry.oldValue) : null,
      entry.newValue ? JSON.stringify(entry.newValue) : null,
    ]
  );
}
