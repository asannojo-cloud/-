// "매칭실패 사진 폴더" (사진 일괄 업로드 화면에서 내보낸 폴더) 위치를 기억해뒀다가,
// 회원 상세/신규 등록 화면의 "사진 등록"에서 그 폴더를 기본 위치로 열어주기 위한 유틸.
// FileSystemDirectoryHandle은 구조적 복제가 가능해 IndexedDB에 그대로 저장할 수 있다
// (localStorage는 불가능 — 객체를 저장할 수 없음).

const DB_NAME = "agongno-admin";
const STORE_NAME = "handles";
const KEY = "unmatchedPhotoFolder";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function supportsFileSystemAccess(): boolean {
  return typeof (window as any).showOpenFilePicker === "function" && typeof (window as any).showDirectoryPicker === "function";
}

export async function saveUnmatchedFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(handle, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 저장 실패해도 내보내기 자체는 이미 끝난 뒤라 사용자에게 굳이 오류를 보여주지 않는다.
  }
}

// 저장된 폴더 핸들을 가져오고, 읽기 권한이 없으면 사용자에게 재요청한다
// (브라우저 재시작 등으로 권한이 풀렸을 수 있음).
export async function getUnmatchedFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDb();
    const handle = await new Promise<FileSystemDirectoryHandle | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (!handle) return null;

    const h = handle as any;
    const perm = await h.queryPermission?.({ mode: "read" });
    if (perm === "granted") return handle;
    const requested = await h.requestPermission?.({ mode: "read" });
    if (requested === "granted") return handle;
    return null;
  } catch {
    return null;
  }
}

const IMAGE_TYPES = {
  description: "사진",
  accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
};

// 매칭실패 사진 폴더가 기억되어 있으면 그 폴더를 기본 위치로 열어 사진을 고르게 한다.
// supported:false면 이 브라우저에서 못 쓰는 것이니 호출부는 기존 <input type="file">로
// 대체(fallback)해야 하고, supported:true인데 file이 null이면 사용자가 취소한 것이라
// 아무것도 하지 않으면 된다 (fallback으로 이어서 또 다른 창을 띄우면 안 됨).
export async function pickPhotoFromUnmatchedFolder(): Promise<{ supported: false } | { supported: true; file: File | null }> {
  if (!supportsFileSystemAccess()) return { supported: false };
  const dirHandle = await getUnmatchedFolderHandle();

  try {
    const opts: any = { types: [IMAGE_TYPES], excludeAcceptAllOption: false, multiple: false };
    if (dirHandle) opts.startIn = dirHandle;
    const [fileHandle] = await (window as any).showOpenFilePicker(opts);
    const file = await fileHandle.getFile();
    return { supported: true, file };
  } catch (e) {
    // 사용자가 선택을 취소한 경우도 여기로 온다 — 오류가 아니라 "선택 안 함"으로 처리한다.
    if (e instanceof DOMException && e.name === "AbortError") {
      return { supported: true, file: null };
    }
    throw e;
  }
}
