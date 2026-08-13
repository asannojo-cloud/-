import { Router } from "express";
import { z } from "zod";
import { pool } from "../../db/pool";
import { memberGuard } from "../../middleware/guards";
import { streamPhotoOrDefault } from "../photos/photos.service";
import { recordAudit } from "../audit/audit.service";
import { parsePhone } from "../../utils/phoneUtils";

export const memberAuthRouter = Router();

const loginSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요.").max(50),
  phone: z.string().min(1, "휴대폰번호를 입력해주세요.").max(30),
});

/**
 * 회원 로그인: 이름 + 휴대폰번호.
 * 이름만으로는 동명이인을 구분할 수 없으므로(설계 원칙), 반드시 휴대폰번호와 함께 조회한다.
 * 휴대폰번호는 DB에서 UNIQUE 제약이 걸려 있어 (이름, 휴대폰번호) 조합은 최대 1건만 일치한다.
 */
memberAuthRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "이름과 휴대폰번호를 입력해주세요." });
  }
  const { name } = parsed.data;
  const phoneParsed = parsePhone(parsed.data.phone);

  const genericError = { error: "입력하신 정보와 일치하는 회원을 찾을 수 없습니다." };

  if (!phoneParsed.ok) {
    return res.status(401).json(genericError);
  }

  // 휴대폰번호는 UNIQUE라 최대 1건만 일치한다. 먼저 휴대폰번호로 조회한 뒤,
  // 이름은 애플리케이션 단에서 비교한다 — 동명이인 구분을 위해 명부에 "이아영c"처럼
  // 끝에 소문자 알파벳 한 글자가 붙어 있는 경우가 있는데, 회원이 그 알파벳까지
  // 외워서 입력하긴 어려우므로 뒤의 소문자 한 글자는 생략해도 인식하도록 한다
  // (2026-08-13). 어차피 휴대폰번호가 실제 신원 확인의 핵심이라 안전하다.
  const inputName = name.trim();
  const { rows } = await pool.query(
    `SELECT id, member_id, name, status FROM members WHERE phone = $1`,
    [phoneParsed.normalized]
  );
  const candidate = rows[0];
  const nameMatches =
    candidate && (candidate.name === inputName || candidate.name.replace(/[a-z]$/, "") === inputName);
  const member = nameMatches ? candidate : undefined;

  if (!member) {
    // 계정 존재 여부를 노출하지 않도록 이름 불일치/휴대폰 불일치를 구분하지 않는다.
    await recordAudit({ action: "member_login_fail", newValue: { name } });
    return res.status(401).json(genericError);
  }

  if (member.status !== "active") {
    // 비활성 회원 로그인 차단 (PRD 12, 40)
    return res.status(403).json({ error: "탈퇴 또는 자격상실 처리된 회원입니다. 관리자에게 문의하세요." });
  }

  await recordAudit({ memberId: member.member_id, action: "member_login_success" });

  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ error: "로그인 처리 중 오류가 발생했습니다." });
    }
    req.session.auth = { role: "member", id: member.id };
    res.json({ ok: true });
  });
});

memberAuthRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("agongno.sid");
    res.json({ ok: true });
  });
});

memberAuthRouter.get("/me", memberGuard, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT name, birth_date, issue_date, photo_path FROM members WHERE id = $1 AND status = 'active'`,
    [req.session.auth!.id]
  );
  const member = rows[0];
  if (!member) {
    return res.status(401).json({ error: "세션이 만료되었거나 계정을 사용할 수 없습니다." });
  }
  res.json({
    name: member.name,
    birthDate: member.birth_date,
    issueDate: member.issue_date,
    hasPhoto: !!member.photo_path,
  });
});

memberAuthRouter.get("/me/photo", memberGuard, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT photo_path FROM members WHERE id = $1 AND status = 'active'`,
    [req.session.auth!.id]
  );
  const member = rows[0];
  if (!member) return res.status(401).json({ error: "세션이 만료되었습니다." });
  return streamPhotoOrDefault(res, member.photo_path);
});
