import rateLimit from "express-rate-limit";

// 로그인 엔드포인트에 대한 IP 단위 요청 제한 (계정 잠금과는 별개의 보호막).
// 아산시청처럼 사무실 전체가 같은 공인 IP를 공유하는 실사용 환경에서는, 홍보 직후처럼
// 여러 명이 동시에 로그인을 시도하면(2단계 로그인이라 1인당 최소 2회 요청) 기존 20회로는
// 금방 소진되어 정상 사용자가 429를 받는다(2026-08-19 실제 신고). 브루트포스 방어는
// 계정 단위 잠금(isLocked/registerFailedAttempt)이 1차로 담당하므로, 이 IP 제한은
// 여유 있게 올린다.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요." },
});

// 업로드/일반 API에 대한 완만한 제한.
// 로그인된 사용자(회원/관리자)는 이미 인증을 통과한 신뢰 주체이고, 세션으로 개별 식별되므로
// IP 기준 제한에서 제외한다 — 안 그러면 사무실처럼 여러 명이 같은 공인 IP를 쓰는 환경에서
// 정상 사용자들이 서로의 요청 때문에 429를 받는다(2026-08-19 실제 신고로 확인).
// 로그인 자체는 loginRateLimiter가, 로그인 전 익명 사용자의 남용은 이 제한이 막아준다.
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.session?.auth?.role === "admin" || req.session?.auth?.role === "member",
});
