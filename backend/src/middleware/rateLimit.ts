import rateLimit from "express-rate-limit";

// 로그인 엔드포인트에 대한 IP 단위 요청 제한 (계정 잠금과는 별개의 보호막)
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요." },
});

// 업로드/일반 API에 대한 완만한 제한
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
