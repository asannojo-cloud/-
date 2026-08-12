import { Router } from "express";
import { pool } from "../../db/pool";
import { adminGuard } from "../../middleware/guards";

export const auditRouter = Router();
auditRouter.use(adminGuard);

auditRouter.get("/", async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "30"), 10) || 30));
  const memberId = typeof req.query.memberId === "string" ? req.query.memberId : undefined;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const values: unknown[] = [];
  if (memberId) {
    values.push(memberId);
    conditions.push(`al.member_id = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  values.push(pageSize);
  const limitIdx = values.length;
  values.push(offset);
  const offsetIdx = values.length;

  const { rows } = await pool.query(
    `SELECT al.id, al.member_id, al.action, al.old_value, al.new_value, al.created_at,
            a.name AS admin_name
     FROM audit_logs al
     LEFT JOIN admins a ON a.id = al.admin_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    values
  );

  res.json({ items: rows, page, pageSize });
});
