import express from "express";
import helmet from "helmet";
import cors from "cors";
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
  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: true,
    })
  );
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
  app.use(errorHandler);

  return app;
}
