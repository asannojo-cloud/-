import { createApp } from "./app";
import { env } from "./config/env";
import { ensureStorageDir } from "./modules/photos/photos.service";
import { cleanupStaleUploadTmp } from "./modules/excel/cleanupTmp";

ensureStorageDir();
cleanupStaleUploadTmp();

const app = createApp();
app.listen(env.port, () => {
  console.log(`[server] 아공노 모바일회원증 백엔드 실행 중 — http://localhost:${env.port}`);
});
