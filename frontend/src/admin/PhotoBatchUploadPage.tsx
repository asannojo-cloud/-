import { useState } from "react";
import type { ReactNode } from "react";
import { api, ApiError } from "../shared/api";
import { saveUnmatchedFolderHandle } from "../shared/unmatchedFolder";

interface MemberRow {
  member_id: string;
  name: string;
  status: "active" | "inactive";
  has_photo: boolean;
  phone: string | null;
}

type MatchStatus = "matched" | "ambiguous" | "no_match" | "skipped_has_photo";
type FilterKey = "all" | MatchStatus;

interface AmbiguousCandidate {
  memberId: string;
  phone: string | null;
}

interface FileMatch {
  file: File;
  displayPath: string;
  candidateName: string;
  status: MatchStatus;
  memberId: string | null;
  matchedName: string | null;
  candidates?: AmbiguousCandidate[]; // 동명이인일 때 후보 회원 목록 (구분용 전화번호 뒷자리 포함)
}

// 010-1234-5678 형태에서 뒷자리 4자리만 노출 (동명이인 구분용, 전체 번호는 굳이 안 보여줌)
function maskPhone(phone: string | null): string {
  if (!phone || phone.length < 4) return "번호없음";
  return `...${phone.slice(-4)}`;
}

type UploadResult = { path: string; ok: boolean; message: string };

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

// 파일명에서 회원번호 패턴(예: 2026-15)을 찾아낸다.
function extractMemberIdToken(stem: string): string | null {
  const m = stem.match(/(20\d{2}-\d{1,5})/);
  return m ? m[1] : null;
}

// 파일명에서 한글 이름으로 보이는 가장 긴 한글 연속 구간을 뽑아낸다.
// "2026-15_홍길동.jpg", "홍길동(2026-15).jpg", "홍길동 사진.jpg" 등을 모두 커버하기 위함.
function extractNameToken(stem: string): string {
  const matches = stem.match(/[가-힣]{2,5}/g);
  if (!matches || matches.length === 0) return stem.trim();
  return matches.reduce((a, b) => (b.length > a.length ? b : a));
}

async function fetchAllMembers(onProgress: (loaded: number, total: number) => void): Promise<MemberRow[]> {
  const pageSize = 100;
  let page = 1;
  let total = Infinity;
  const all: MemberRow[] = [];
  while ((page - 1) * pageSize < total) {
    const res = await api.get<{ items: MemberRow[]; total: number }>(
      `/admin/members?page=${page}&pageSize=${pageSize}&status=active`
    );
    all.push(...res.items);
    total = res.total;
    onProgress(all.length, total);
    page++;
  }
  return all;
}

export default function PhotoBatchUploadPage() {
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberLoadProgress, setMemberLoadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [matches, setMatches] = useState<FileMatch[]>([]);
  const [skipExisting, setSkipExisting] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentBatchTotal, setCurrentBatchTotal] = useState(0);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  async function ensureMembersLoaded(): Promise<MemberRow[]> {
    if (members) return members;
    setLoadingMembers(true);
    setError(null);
    try {
      const all = await fetchAllMembers((loaded, total) => setMemberLoadProgress({ loaded, total }));
      setMembers(all);
      return all;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "회원 목록을 불러오지 못했습니다.");
      throw e;
    } finally {
      setLoadingMembers(false);
    }
  }

  async function handleFolderSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setResults([]);
    setError(null);
    const files = Array.from(e.target.files ?? []).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      return ALLOWED_EXT.has(ext);
    });
    if (files.length === 0) {
      setError("선택한 폴더에서 이미지 파일(jpg/png/webp)을 찾지 못했습니다.");
      setMatches([]);
      return;
    }

    let allMembers: MemberRow[];
    try {
      allMembers = await ensureMembersLoaded();
    } catch {
      return;
    }

    const byName = new Map<string, MemberRow[]>();
    const byId = new Map<string, MemberRow>();
    for (const m of allMembers) {
      byId.set(m.member_id, m);
      const list = byName.get(m.name) ?? [];
      list.push(m);
      byName.set(m.name, list);
    }

    const built: FileMatch[] = files.map((file) => {
      const displayPath = (file as any).webkitRelativePath || file.name;
      const stem = file.name.replace(/\.[^.]+$/, "");
      const idToken = extractMemberIdToken(stem);
      const nameToken = extractNameToken(stem);

      // 1순위: 파일명에 회원번호가 포함되어 있으면 그걸로 확정 매칭
      if (idToken && byId.has(idToken)) {
        const m = byId.get(idToken)!;
        if (skipExisting && m.has_photo) {
          return { file, displayPath, candidateName: nameToken, status: "skipped_has_photo", memberId: m.member_id, matchedName: m.name };
        }
        return { file, displayPath, candidateName: nameToken, status: "matched", memberId: m.member_id, matchedName: m.name };
      }

      // 2순위: 이름으로 매칭 (동명이인이면 회원번호 토큰으로 좁혀본다)
      const nameMatches = byName.get(nameToken) ?? [];
      if (nameMatches.length === 1) {
        const m = nameMatches[0];
        if (skipExisting && m.has_photo) {
          return { file, displayPath, candidateName: nameToken, status: "skipped_has_photo", memberId: m.member_id, matchedName: m.name };
        }
        return { file, displayPath, candidateName: nameToken, status: "matched", memberId: m.member_id, matchedName: m.name };
      }
      if (nameMatches.length > 1) {
        return {
          file,
          displayPath,
          candidateName: nameToken,
          status: "ambiguous",
          memberId: null,
          matchedName: null,
          candidates: nameMatches.map((m) => ({ memberId: m.member_id, phone: m.phone })),
        };
      }
      return { file, displayPath, candidateName: nameToken, status: "no_match", memberId: null, matchedName: null };
    });

    setMatches(built);
    setFilter("all");
    setResults([]);
  }

  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // 결국 회원에게 반영되지 못한 사진(동명이인 + 매칭안됨 + 업로드 시도했지만 실패한 것)을
  // 실제 파일로 폴더에 모아준다. File System Access API를 지원하는 브라우저(Chrome/Edge)에서만
  // 동작한다 — 폴더 선택 화면과 동일한 브라우저 요구사항이라 이미 이 화면을 쓸 수 있다면 문제없다.
  function getUnresolvedTargets(): FileMatch[] {
    const uploadFailedPaths = new Set(results.filter((r) => !r.ok).map((r) => r.path));
    return matches.filter(
      (m) => m.status === "ambiguous" || m.status === "no_match" || uploadFailedPaths.has(m.displayPath)
    );
  }

  async function handleExportUnmatched() {
    const targets = getUnresolvedTargets();
    if (targets.length === 0) return;

    const picker = (window as any).showDirectoryPicker;
    if (typeof picker !== "function") {
      setExportNotice("이 기능은 Chrome 또는 Edge 브라우저에서만 사용할 수 있습니다.");
      setTimeout(() => setExportNotice(null), 5000);
      return;
    }

    setExporting(true);
    setExportNotice(null);
    try {
      const dirHandle = await picker();
      // 이 폴더 위치를 기억해뒀다가, 회원 상세/신규 등록 화면의 "사진 등록"에서
      // 기본으로 열리는 폴더로 다시 사용한다.
      await saveUnmatchedFolderHandle(dirHandle);
      const usedNames = new Set<string>();
      for (const m of targets) {
        let name = m.file.name;
        // 같은 이름의 파일이 이미 폴더에 있으면 뒤에 번호를 붙여 덮어쓰지 않도록 한다.
        if (usedNames.has(name)) {
          const dot = name.lastIndexOf(".");
          const base = dot > 0 ? name.slice(0, dot) : name;
          const ext = dot > 0 ? name.slice(dot) : "";
          let n = 2;
          while (usedNames.has(`${base}(${n})${ext}`)) n++;
          name = `${base}(${n})${ext}`;
        }
        usedNames.add(name);

        const fileHandle = await dirHandle.getFileHandle(name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(m.file);
        await writable.close();
      }
      setExportNotice(
        `반영되지 못한 사진 ${targets.length}장을 폴더에 저장했습니다. 이제 회원관리 > 사진 등록에서 이 폴더를 바로 열 수 있습니다.`
      );
    } catch (e) {
      // 사용자가 폴더 선택을 취소한 경우도 이 catch를 타는데, 그건 오류가 아니므로 조용히 넘어간다.
      if (e instanceof DOMException && e.name === "AbortError") {
        // 취소 — 아무 메시지도 띄우지 않는다.
      } else {
        setExportNotice("폴더에 저장하는 중 오류가 발생했습니다.");
      }
    } finally {
      setExporting(false);
      setTimeout(() => setExportNotice(null), 5000);
    }
  }

  function copyList(list: FileMatch[], label: string) {
    const text = list
      .map((m) => {
        if (m.status === "ambiguous") {
          const cands = (m.candidates ?? []).map((c) => `${c.memberId}(${maskPhone(c.phone)})`).join(", ");
          return `${m.displayPath}\t동명이인: ${cands}`;
        }
        return `${m.displayPath}\t매칭 회원 없음`;
      })
      .join("\n");
    navigator.clipboard
      .writeText(text)
      .then(() => setCopyNotice(`${label} ${list.length}건을 클립보드에 복사했습니다.`))
      .catch(() => setCopyNotice("복사에 실패했습니다. 브라우저 권한을 확인해주세요."));
    setTimeout(() => setCopyNotice(null), 4000);
  }

  const matchedCount = matches.filter((m) => m.status === "matched").length;
  const ambiguousCount = matches.filter((m) => m.status === "ambiguous").length;
  const noMatchCount = matches.filter((m) => m.status === "no_match").length;
  const skippedCount = matches.filter((m) => m.status === "skipped_has_photo").length;
  const unresolvedCount = getUnresolvedTargets().length;
  const filteredMatches = filter === "all" ? matches : matches.filter((m) => m.status === filter);

  async function runUpload(targets: FileMatch[], previousResults: UploadResult[]) {
    if (targets.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    setCurrentBatchTotal(targets.length);
    setError(null);

    // 재시도일 때는 이번에 다시 시도하는 항목의 이전 결과만 걷어내고, 나머지 결과는 그대로 유지한다.
    const retryPaths = new Set(targets.map((t) => t.displayPath));
    const kept = previousResults.filter((r) => !retryPaths.has(r.path));
    const out: UploadResult[] = [...kept];
    setResults(out);

    const CONCURRENCY = 3;
    let idx = 0;

    async function worker() {
      while (idx < targets.length) {
        const my = targets[idx];
        idx++;
        try {
          const fd = new FormData();
          fd.append("photo", my.file);
          await api.post(`/admin/members/${encodeURIComponent(my.memberId!)}/photo`, fd);
          out.push({ path: my.displayPath, ok: true, message: `${my.matchedName}(${my.memberId}) 업로드 완료` });
        } catch (e) {
          out.push({
            path: my.displayPath,
            ok: false,
            message: e instanceof ApiError ? e.message : "업로드 실패",
          });
        }
        setUploadProgress(out.length - kept.length);
        setResults([...out]);
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()));
    setUploading(false);
  }

  function handleUpload() {
    const targets = matches.filter((m) => m.status === "matched");
    void runUpload(targets, []);
  }

  function handleRetryFailed() {
    const failedPaths = new Set(results.filter((r) => !r.ok).map((r) => r.path));
    const targets = matches.filter((m) => failedPaths.has(m.displayPath));
    void runUpload(targets, results);
  }

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-bold text-slate-900 mb-1">사진 일괄 업로드</h2>
      <p className="text-sm text-slate-500 mb-6">
        회원 사진이 들어있는 폴더를 선택하면 파일명(이름 또는 회원번호)으로 회원을 자동 매칭합니다. 동명이인은 자동
        반영하지 않고 따로 표시하니 회원상세 화면에서 개별로 등록해주세요.
      </p>

      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={skipExisting}
            onChange={(e) => setSkipExisting(e.target.checked)}
            className="rounded"
          />
          이미 사진이 등록된 회원은 건너뛰기
        </label>

        <div>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-blue-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
            </svg>
            사진 폴더 선택
            <input
              type="file"
              // @ts-expect-error: webkitdirectory는 표준 타입에 없지만 Chrome/Edge에서 폴더 선택을 지원한다.
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={handleFolderSelect}
            />
          </label>
        </div>

        {loadingMembers && (
          <p className="text-xs text-slate-400">
            회원 목록 불러오는 중... {memberLoadProgress ? `${memberLoadProgress.loaded}/${memberLoadProgress.total}` : ""}
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {matches.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl shadow-sm p-5">
          <div className="flex flex-wrap gap-2 text-sm mb-4">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} className="bg-slate-100 text-slate-600">
              전체 {matches.length}
            </FilterChip>
            <FilterChip active={filter === "matched"} onClick={() => setFilter("matched")} className="bg-green-50 text-green-700">
              매칭됨 {matchedCount}
            </FilterChip>
            <FilterChip active={filter === "ambiguous"} onClick={() => setFilter("ambiguous")} className="bg-amber-50 text-amber-700">
              동명이인(수동 필요) {ambiguousCount}
            </FilterChip>
            <FilterChip active={filter === "no_match"} onClick={() => setFilter("no_match")} className="bg-slate-100 text-slate-600">
              매칭안됨 {noMatchCount}
            </FilterChip>
            {skippedCount > 0 && (
              <FilterChip
                active={filter === "skipped_has_photo"}
                onClick={() => setFilter("skipped_has_photo")}
                className="bg-slate-100 text-slate-400"
              >
                기존 사진 있어 건너뜀 {skippedCount}
              </FilterChip>
            )}
          </div>

          {(filter === "ambiguous" || filter === "no_match") && (
            <button
              onClick={() =>
                copyList(
                  matches.filter((m) => m.status === filter),
                  filter === "ambiguous" ? "동명이인 목록" : "매칭안됨 목록"
                )
              }
              className="mb-3 mr-4 text-xs text-blue-600 underline"
            >
              현재 목록 복사하기 (엑셀/메모장에 붙여넣기용)
            </button>
          )}
          {unresolvedCount > 0 && (
            <button
              onClick={handleExportUnmatched}
              disabled={exporting}
              className="mb-3 text-xs text-blue-600 underline disabled:opacity-50"
            >
              {exporting
                ? "폴더에 저장 중..."
                : `반영 안 된 사진 ${unresolvedCount}장 폴더로 저장하기 (동명이인·매칭안됨·업로드실패)`}
            </button>
          )}
          {copyNotice && <p className="mb-3 text-xs text-green-700">{copyNotice}</p>}
          {exportNotice && <p className="mb-3 text-xs text-slate-600">{exportNotice}</p>}

          <div className="max-h-80 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100 text-sm">
            {filteredMatches.length === 0 && <p className="px-3 py-4 text-slate-400 text-center">해당 항목이 없습니다.</p>}
            {filteredMatches.map((m, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2">
                <span className="truncate text-slate-600 mr-3">{m.displayPath}</span>
                {m.status === "matched" && (
                  <span className="text-green-700 shrink-0">
                    → {m.matchedName} ({m.memberId})
                  </span>
                )}
                {m.status === "ambiguous" && (
                  <span className="text-amber-700 shrink-0 text-right">
                    동명이인:{" "}
                    {(m.candidates ?? []).map((c) => `${c.memberId}(${maskPhone(c.phone)})`).join(", ")}
                  </span>
                )}
                {m.status === "no_match" && <span className="text-slate-400 shrink-0">매칭 회원 없음</span>}
                {m.status === "skipped_has_photo" && (
                  <span className="text-slate-400 shrink-0">
                    건너뜀 ({m.matchedName}, 사진 있음)
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading || matchedCount === 0}
              className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-40"
            >
              {uploading ? `업로드 중... (${uploadProgress}/${currentBatchTotal})` : `매칭된 ${matchedCount}건 업로드 시작`}
            </button>
            {!uploading && failCount > 0 && (
              <button
                onClick={handleRetryFailed}
                className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
              >
                실패한 {failCount}건 재시도
              </button>
            )}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl shadow-sm p-5">
          <p className="text-sm font-medium text-slate-700 mb-3">
            결과: 성공 {successCount}건 / 실패 {failCount}건
          </p>
          <div className="max-h-64 overflow-y-auto text-xs space-y-1">
            {results
              .filter((r) => !r.ok)
              .map((r, i) => (
                <p key={i} className="text-red-600">
                  {r.path}: {r.message}
                </p>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full transition ${className} ${
        active ? "ring-2 ring-offset-1 ring-blue-400" : "opacity-70 hover:opacity-100"
      }`}
    >
      {children}
    </button>
  );
}
