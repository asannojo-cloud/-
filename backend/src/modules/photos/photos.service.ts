import fs from "fs";
import path from "path";
import sharp from "sharp";
import { Response } from "express";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../../config/env";

// Render 무료 플랜은 배포/재시작 때마다 로컬 디스크가 초기화되어, 로컬 파일로만 사진을
// 저장하면 배포할 때마다 사진이 전부 사라지는 문제가 있었다 (2026-08-12 발견). R2 환경변수
// 4개가 모두 설정되어 있으면 Cloudflare R2(S3 호환, 영구 저장)를 쓰고, 없으면(로컬 개발 등)
// 기존처럼 로컬 디스크에 저장한다.
const r2Configured = !!(env.r2.accountId && env.r2.accessKeyId && env.r2.secretAccessKey && env.r2.bucketName);

const s3 = r2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2.accessKeyId!,
        secretAccessKey: env.r2.secretAccessKey!,
      },
    })
  : null;

export function ensureStorageDir() {
  if (!r2Configured) fs.mkdirSync(env.photoStorageDir, { recursive: true });
}

/**
 * photo_path(DB에 저장된 상대경로/키)를 로컬 폴백 저장소의 실제 절대경로로 변환한다.
 * path traversal(../ 등)을 차단하기 위해 반드시 photoStorageDir 하위인지 확인한다.
 * (R2 사용 시에는 쓰이지 않는다 — 로컬 폴백 전용.)
 */
export function resolvePhotoPath(photoRelativePath: string): string | null {
  const resolved = path.resolve(env.photoStorageDir, photoRelativePath);
  if (!resolved.startsWith(env.photoStorageDir + path.sep) && resolved !== env.photoStorageDir) {
    return null;
  }
  if (!fs.existsSync(resolved)) return null;
  return resolved;
}

export async function streamPhotoOrDefault(res: Response, photoRelativePath: string | null) {
  if (!photoRelativePath) {
    return res.status(404).json({ error: "사진이 등록되어 있지 않습니다." });
  }

  if (r2Configured) {
    try {
      const obj = await s3!.send(new GetObjectCommand({ Bucket: env.r2.bucketName!, Key: photoRelativePath }));
      res.setHeader("Cache-Control", "private, max-age=300");
      res.setHeader("Content-Type", obj.ContentType ?? "image/webp");
      const body = obj.Body as NodeJS.ReadableStream | undefined;
      if (!body) return res.status(404).json({ error: "사진이 등록되어 있지 않습니다." });
      return body.pipe(res);
    } catch {
      return res.status(404).json({ error: "사진이 등록되어 있지 않습니다." });
    }
  }

  const abs = resolvePhotoPath(photoRelativePath);
  if (abs) {
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.sendFile(abs);
  }
  return res.status(404).json({ error: "사진이 등록되어 있지 않습니다." });
}

/** 회원 완전 삭제 시 저장된 사진 파일도 함께 정리한다. */
export async function deletePhotoFile(photoRelativePath: string | null) {
  if (!photoRelativePath) return;

  if (r2Configured) {
    try {
      await s3!.send(new DeleteObjectCommand({ Bucket: env.r2.bucketName!, Key: photoRelativePath }));
    } catch {
      // 이미 지워져 있거나 삭제에 실패해도 회원 삭제 자체를 막지는 않는다 (최선 시도).
    }
    return;
  }

  const abs = resolvePhotoPath(photoRelativePath);
  if (abs) {
    try {
      fs.rmSync(abs, { force: true });
    } catch {
      // 위와 동일한 이유로 조용히 넘어간다.
    }
  }
}

/**
 * 추출된 원본 사진을 회원번호 기준 파일명으로 정규화하여 저장한다.
 * 원본 사진의 얼굴 형태를 임의로 변형하지 않고(자르기/변형 없음), 용량만 최적화한다.
 * 반환값은 DB에 저장할 "저장소 내부 키(경로)"이다.
 */
export async function processAndStorePhoto(src: string | Buffer, memberId: string): Promise<string> {
  const safeMemberId = memberId.replace(/[^A-Za-z0-9_-]/g, "_");
  const fileName = `${safeMemberId}.webp`;

  const buffer = await sharp(src)
    .rotate() // EXIF 방향 정보 반영
    .resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer();

  if (r2Configured) {
    await s3!.send(
      new PutObjectCommand({
        Bucket: env.r2.bucketName!,
        Key: fileName,
        Body: buffer,
        ContentType: "image/webp",
      })
    );
    return fileName;
  }

  ensureStorageDir();
  const destPath = path.join(env.photoStorageDir, fileName);
  fs.writeFileSync(destPath, buffer);
  return fileName;
}
