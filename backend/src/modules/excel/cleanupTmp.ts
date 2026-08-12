import fs from "fs";
import path from "path";
import { env } from "../../config/env";

const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2시간

/**
 * /headers 호출 후 /validate로 이어지지 않고 방치된 토큰 파일이나,
 * 업로드 검증 후 커밋/취소되지 않은 사진 추출 디렉터리가 무한히 쌓이는 것을 방지한다.
 * 서버 시작 시 1회 정리한다.
 */
export function cleanupStaleUploadTmp() {
  if (!fs.existsSync(env.uploadTmpDir)) return;

  const now = Date.now();
  const entries = fs.readdirSync(env.uploadTmpDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(env.uploadTmpDir, entry.name);
    try {
      const stat = fs.statSync(fullPath);
      if (now - stat.mtimeMs > MAX_AGE_MS) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`[cleanup] 만료된 임시 업로드 파일 삭제: ${entry.name}`);
      }
    } catch {
      // 삭제 실패는 다음 재시작 때 재시도되므로 무시
    }
  }
}
