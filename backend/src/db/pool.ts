import { Pool, types } from "pg";
import { env } from "../config/env";

// PostgreSQL DATE 타입(OID 1082)을 JS Date 객체로 자동 변환하면 서버 타임존에 따라
// 날짜가 하루 밀리는 문제가 생긴다. "YYYY-MM-DD" 문자열 그대로 사용한다.
types.setTypeParser(1082, (val: string) => val);

export const pool = new Pool({
  connectionString: env.databaseUrl,
  // Render 등 대부분의 매니지드 PostgreSQL은 SSL 연결을 요구한다.
  // rejectUnauthorized:false는 Render가 자체 발급한 인증서 체인을 로컬에서 검증할 수 없기 때문
  // (Render 공식 가이드에서 권장하는 설정) — 로컬 개발(NODE_ENV=development)에서는 비활성화.
  ssl: env.isProduction ? { rejectUnauthorized: false } : undefined,
});

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("[db] 예기치 않은 유휴 클라이언트 오류", err);
});
