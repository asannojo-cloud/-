import fs from "fs";
import path from "path";
import sharp from "sharp";
import { Response } from "express";
import { env } from "../../config/env";

/**
 * photo_path(DB에 저장된 storage 내부 상대경로)를 실제 절대경로로 변환한다.
 * path traversal(../ 등)을 차단하기 위해 반드시 photoStorageDir 하위인지 확인한다.
 */
export function resolvePhotoPath(photoRelativePath: string): string | null {
  const resolved = path.resolve(env.photoStorageDir, photoRelativePath);
  if (!resolved.startsWith(env.photoStorageDir + path.sep) && resolved !== env.photoStorageDir) {
    return null;
  }
  if (!fs.existsSync(resolved)) return null;
  return resolved;
}

export function streamPhotoOrDefault(res: Response, photoRelativePath: string | null) {
  if (photoRelativePath) {
    const abs = resolvePhotoPath(photoRelativePath);
    if (abs) {
      res.setHeader("Cache-Control", "private, max-age=300");
      return res.sendFile(abs);
    }
  }
  return res.status(404).json({ error: "사진이 등록되어 있지 않습니다." });
}

export function ensureStorageDir() {
  fs.mkdirSync(env.photoStorageDir, { recursive: true });
}

/** 회원 완전 삭제 시 저장된 사진 파일도 함께 정리한다. */
export function deletePhotoFile(photoRelativePath: string | null) {
  if (!photoRelativePath) return;
  const abs = resolvePhotoPath(photoRelativePath);
  if (abs) {
    fs.rmSync(abs, { force: true });
  }
}

/**
 * 추출된 원본 사진을 회원번호 기준 파일명으로 정규화하여 저장한다.
 * 원본 사진의 얼굴 형태를 임의로 변형하지 않고(자르기/변형 없음), 용량만 최적화한다.
 * 반환값은 DB에 저장할 "storage 내부 상대경로"이다.
 */
export async function processAndStorePhoto(src: string | Buffer, memberId: string): Promise<string> {
  ensureStorageDir();
  const safeMemberId = memberId.replace(/[^A-Za-z0-9_-]/g, "_");
  const fileName = `${safeMemberId}.webp`;
  const destPath = path.join(env.photoStorageDir, fileName);

  await sharp(src)
    .rotate() // EXIF 방향 정보 반영
    .resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(destPath);

  return fileName;
}
