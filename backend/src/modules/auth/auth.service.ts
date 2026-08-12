import bcrypt from "bcrypt";
import { pool } from "../../db/pool";
import { env } from "../../config/env";

type AuthTable = "members" | "admins";

export interface LockableAccount {
  id: number;
  password_hash: string | null;
  failed_login_count: number;
  locked_until: string | null;
}

export function isLocked(account: Pick<LockableAccount, "locked_until">): boolean {
  if (!account.locked_until) return false;
  return new Date(account.locked_until).getTime() > Date.now();
}

export async function registerFailedAttempt(table: AuthTable, id: number, currentCount: number) {
  const nextCount = currentCount + 1;
  const shouldLock = nextCount >= env.loginMaxAttempts;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + env.loginLockMinutes * 60 * 1000)
    : null;

  await pool.query(
    `UPDATE ${table}
     SET failed_login_count = $1, locked_until = COALESCE($2, locked_until)
     WHERE id = $3`,
    [nextCount, lockedUntil, id]
  );
  return { locked: shouldLock, lockedUntil };
}

export async function resetFailedAttempts(table: AuthTable, id: number) {
  await pool.query(
    `UPDATE ${table} SET failed_login_count = 0, locked_until = NULL WHERE id = $1`,
    [id]
  );
}

export async function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

/** 임시 비밀번호 생성 (관리자가 신규/재발급 시 사용, 안전한 난수 기반) */
export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = require("crypto").randomBytes(10) as Buffer;
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}
