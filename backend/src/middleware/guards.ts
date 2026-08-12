import { Request, Response, NextFunction } from "express";

/**
 * 일반 회원 전용 API 보호.
 * 원칙 8, 9: 회원은 자신의 회원증만 볼 수 있어야 하며 관리자 권한과 완전히 분리한다.
 */
export function memberGuard(req: Request, res: Response, next: NextFunction) {
  if (req.session.auth?.role !== "member") {
    return res.status(401).json({ error: "로그인이 필요합니다." });
  }
  next();
}

/**
 * 관리자 전용 API 보호.
 */
export function adminGuard(req: Request, res: Response, next: NextFunction) {
  if (req.session.auth?.role !== "admin") {
    return res.status(401).json({ error: "관리자 로그인이 필요합니다." });
  }
  next();
}
