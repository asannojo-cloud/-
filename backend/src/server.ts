import { createApp } from "./app";
import { env } from "./config/env";
import { ensureStorageDir } from "./modules/photos/photos.service";
import { cleanupStaleUploadTmp } from "./modules/excel/cleanupTmp";

// 요청 처리 흐름(express-async-errors가 커버하는 범위) 밖에서 발생하는 처리되지 않은
// 오류로 인해 서버 프로세스 전체가 조용히 죽는 것을 막기 위한 최후의 방어선. 로그만
// 남기고 프로세스는 계속 살려둔다 (죽이는 것보다 서비스가 계속 응답하는 편이 안전하다).
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

ensureStorageDir();
cleanupStaleUploadTmp();

const app = createApp();
app.listen(env.port, () => {
  console.log(`[server] 아공노 모바일회원증 백엔드 실행 중 — http://localhost:${env.port}`);
});
