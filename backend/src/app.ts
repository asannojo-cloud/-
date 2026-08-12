import express from "express";
import helmet from "helmet";
import cors from "cors";
import fs from "fs";
import path from "path";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db/pool";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiRateLimiter, loginRateLimiter } from "./middleware/rateLimit";
import { memberAuthRouter } from "./modules/auth/member.routes";
import { adminAuthRouter } from "./modules/auth/admin.routes";
import { membersRouter } from "./modules/members/members.routes";
import { excelRouter } from "./modules/excel/excel.routes";
import { auditRouter } from "./modules/audit/audit.routes";

const PgSession = connectPgSimple(session);

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  // 프론트엔드를 같은 서버에서 함께 서빙하므로 대부분의 요청은 동일 출처(same-origin)라
  // CORS 자체가 필요 없다. FRONTEND_ORIGIN이 실제로 설정된 경우(별도 프론트엔드 서비스를
  // 운영하는 경우 등)에만 CORS를 켠다 — 빈 문자열을 그대로 넘기면 헤더 값 오류로 서버가
  // 죽는 문제가 있었다 (2026-08-12 수정).
  if (env.frontendOrigin) {
    app.use(
      cors({
        origin: env.frontendOrigin,
        credentials: true,
      })
    );
  }
  app.use(express.json({ limit: "1mb" }));

  app.use(
    session({
      store: new PgSession({ pool, tableName: "session", createTableIfMissing: true }),
      name: "agongno.sid",
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: env.isProduction, // 운영 배포(HTTPS)에서는 true로 강제
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 8, // 8시간
      },
    })
  );

  app.use("/api", apiRateLimiter);

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  app.use("/api/member/login", loginRateLimiter);
  app.use("/api/member", memberAuthRouter);

  app.use("/api/admin/auth/login", loginRateLimiter);
  app.use("/api/admin/auth", adminAuthRouter);
  app.use("/api/admin/members", membersRouter);
  app.use("/api/admin/excel", excelRouter);
  app.use("/api/admin/audit-logs", auditRouter);

  app.use("/api", notFoundHandler);

  // 운영 배포: 프론트엔드 정적 빌드(frontend/dist)를 같은 서버에서 함께 서빙한다.
  // (별도 서비스로 나누지 않아 CORS·환경변수 관리가 단순해진다)
  if (fs.existsSync(env.frontendDistDir)) {
    app.use(
      express.static(env.frontendDistDir, {
        // index.html은 항상 최신을 받아야 하므로(배포마다 해시가 바뀐 자산을 참조) 캐시하지 않는다.
        index: false,
      })
    );
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(env.frontendDistDir, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}
