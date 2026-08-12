import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { detectImageType, ALLOWED_PHOTO_EXT as ALLOWED_EXT } from "./imageValidation";

export interface ZipExtractResult {
  files: Map<string, string>; // 파일명(basename) -> 추출된 절대경로
  errors: string[]; // 관리자에게 보여줄 오류/경고 목록 (전체 업로드를 막지는 않음, PRD 17)
}

/**
 * 사진 ZIP을 안전하게 검증·추출한다.
 * - 파일명은 반드시 basename만 사용 (zip-slip / 경로 탈출 방지)
 * - 허용 확장자만 추출 (jpg/jpeg/png/webp)
 * - 매직바이트로 실제 이미지 형식 검증 (확장자 위장 차단)
 * - 개별 파일 크기 제한
 * - 파일명 중복 시 오류로 기록
 */
export function extractPhotoZip(
  zipBuffer: Buffer,
  destDir: string,
  maxPhotoSize: number
): ZipExtractResult {
  const files = new Map<string, string>();
  const errors: string[] = [];

  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch {
    return { files, errors: ["ZIP 파일을 열 수 없습니다. 파일이 손상되었을 수 있습니다."] };
  }

  fs.mkdirSync(destDir, { recursive: true });

  const entries = zip.getEntries();
  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const baseName = path.basename(entry.entryName.replace(/\\/g, "/"));
    if (!baseName) continue;

    const ext = path.extname(baseName).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      errors.push(`허용되지 않는 파일 형식 건너뜀: ${baseName}`);
      continue;
    }

    if (entry.header.size > maxPhotoSize) {
      errors.push(`파일 크기 초과로 건너뜀: ${baseName} (${Math.round(entry.header.size / 1024)}KB)`);
      continue;
    }

    if (files.has(baseName)) {
      errors.push(`중복된 사진 파일명 (덮어쓰지 않고 최초 파일 사용): ${baseName}`);
      continue;
    }

    let data: Buffer;
    try {
      data = entry.getData();
    } catch {
      errors.push(`압축 해제 실패: ${baseName}`);
      continue;
    }

    const detected = detectImageType(data);
    if (!detected) {
      errors.push(`이미지 파일 형식이 아니거나 손상됨(확장자 위장 의심): ${baseName}`);
      continue;
    }

    const destPath = path.join(destDir, baseName);
    // destDir 하위인지 최종 방어 확인
    if (!destPath.startsWith(destDir + path.sep)) {
      errors.push(`허용되지 않는 경로: ${baseName}`);
      continue;
    }

    fs.writeFileSync(destPath, data);
    files.set(baseName, destPath);
  }

  return { files, errors };
}
