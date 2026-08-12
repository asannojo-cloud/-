import rateLimit from "express-rate-limit";

// 로그인 엔드포인트에 대한 IP 단위 요청 제한 (계정 잠금과는 별개의 보호막)
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요." },
});

// 업로드/일반 API에 대한 완만한 제한.
// 로그인된 관리자는 이미 인증을 통과한 신뢰 주체이고, 사진 일괄 업로드처럼 짧은 시간에
// 수백 건씩 정상적으로 요청을 보내는 작업이 있으므로 이 제한에서 제외한다
// (2026-08-12 사진 일괄 업로드 중 관리자가 이 제한에 걸려 "요청실패"가 나는 문제 발견).
// 로그인 자체는 loginRateLimiter가, 익명 사용자의 남용은 이 제한이 계속 막아준다.
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.session?.auth?.role === "admin",
});
