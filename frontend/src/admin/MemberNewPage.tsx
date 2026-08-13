import { useState, useEffect, useRef, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError, photoUrl } from "../shared/api";
import DateInput from "../shared/DateInput";
import { pickPhotoFromUnmatchedFolder } from "../shared/unmatchedFolder";
import { usePasteImage } from "../shared/usePasteImage";

export default function MemberNewPage() {
  const navigate = useNavigate();
  const [memberId, setMemberId] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [phone, setPhone] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ photoWarning: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoCandidates, setPhotoCandidates] = useState<{ key: string }[] | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [applyingCandidateKey, setApplyingCandidateKey] = useState<string | null>(null);

  // 이 화면을 보고 있는 동안 클립보드에 복사된 이미지를 Ctrl+V로 바로 첨부할 수 있게 한다.
  usePasteImage((file) => {
    setPhoto(file);
    setPhotoCandidates(null);
  });

  // "파일 선택" 클릭 시, 사진 일괄 업로드 화면에서 내보낸 "매칭실패 사진 폴더"가 기억되어
  // 있으면 그 폴더를 기본 위치로 바로 열어준다. 지원 안 하는 브라우저면 기존 방식(숨겨진
  // <input type="file"> 클릭)으로 그대로 대체한다.
  async function handlePhotoButtonClick(e: React.MouseEvent) {
    e.preventDefault();
    setPhotoCandidates(null);
    try {
      const result = await pickPhotoFromUnmatchedFolder();
      if (!result.supported) {
        photoInputRef.current?.click();
        return;
      }
      if (result.file) setPhoto(result.file);
    } catch {
      photoInputRef.current?.click();
    }
  }

  // 입력한 이름으로, 이미 업로드되어 있는 사진 중 같은 이름의 파일을 검색해서 보여준다.
  async function handleSearchByName() {
    if (!name.trim()) return;
    setError(null);
    setPhotoCandidates([]);
    setLoadingCandidates(true);
    try {
      const res = await api.get<{ items: { key: string }[] }>(
        `/admin/members/photo-candidates?name=${encodeURIComponent(name.trim())}`
      );
      setPhotoCandidates(res.items);
    } catch {
      setPhotoCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }

  async function handleApplyCandidate(key: string) {
    setApplyingCandidateKey(key);
    setError(null);
    try {
      const res = await fetch(photoUrl(`/admin/members/photo-preview?key=${encodeURIComponent(key)}`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const filename = key.split("/").pop() ?? "photo.jpg";
      setPhoto(new File([blob], filename, { type: blob.type || "image/jpeg" }));
      setPhotoCandidates(null);
    } catch {
      setError("사진을 불러오지 못했습니다.");
    } finally {
      setApplyingCandidateKey(null);
    }
  }

  useEffect(() => {
    if (!photo) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // 회원번호 권장 양식: 발급연도-일련번호 (예: 2026-1). 자동으로 다음 번호를 제안하되 수정 가능하다.
  useEffect(() => {
    api
      .get<{ suggested: string }>("/admin/members/next-id")
      .then((res) => setMemberId(res.suggested))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("memberId", memberId.trim());
      form.append("name", name.trim());
      form.append("birthDate", birthDate);
      form.append("issueDate", issueDate);
      form.append("phone", phone.trim());
      if (photo) form.append("photo", photo);

      const res = await api.post<{ photoWarning: string | null }>("/admin/members", form);
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="max-w-md">
        <h1 className="text-xl font-bold text-slate-900 mb-4">회원 등록 완료</h1>
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-3">
          <p className="text-sm text-slate-600">
            <strong>{memberId}</strong> ({name}) 회원이 등록되었습니다.
          </p>
          {result.photoWarning && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              {result.photoWarning}
            </p>
          )}
          <p className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
            이 회원은 앞으로 모바일 조합원증 로그인 화면에서 <strong>이름 + 휴대폰번호({phone})</strong>로 로그인할 수 있습니다.
          </p>
          <button
            onClick={() => navigate(`/admin/members/${memberId}`)}
            className="w-full rounded-lg bg-slate-900 text-white font-medium py-2.5 mt-2"
          >
            회원 상세로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-bold text-slate-900 mb-6">회원 신규 등록</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <Field label="회원번호 (발급연도-일련번호)">
          <input
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            placeholder="예: 2026-1"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <p className="text-xs text-slate-400 mt-1">다음 번호가 자동으로 채워집니다. 필요하면 직접 수정할 수 있습니다.</p>
        </Field>
        <Field label="이름">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </Field>
        <Field label="휴대폰번호 (로그인에 사용됩니다)">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-1234-5678"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </Field>
        <Field label="생년월일">
          <DateInput value={birthDate} onChange={setBirthDate} required />
        </Field>
        <Field label="발급일">
          <DateInput value={issueDate} onChange={setIssueDate} required />
        </Field>
        <Field label="회원 사진 (선택, JPG/PNG/WEBP)">
          <div className="flex items-center gap-3 flex-wrap">
            {photoPreviewUrl && (
              <img
                src={photoPreviewUrl}
                alt="사진 미리보기"
                className="w-16 aspect-[3/4] object-cover rounded-lg border border-slate-200"
              />
            )}
            <button
              type="button"
              onClick={handlePhotoButtonClick}
              className="rounded-lg border border-slate-300 text-sm font-medium text-slate-600 px-4 py-2 cursor-pointer hover:bg-slate-50"
            >
              {photo ? "다른 파일 선택" : "파일 선택"}
            </button>
            <button
              type="button"
              onClick={handleSearchByName}
              disabled={!name.trim()}
              className="rounded-lg border border-slate-300 text-sm font-medium text-slate-600 px-4 py-2 cursor-pointer hover:bg-slate-50 disabled:opacity-40"
            >
              이름으로 검색
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            {photo && <span className="text-xs text-slate-500 truncate max-w-[10rem]">{photo.name}</span>}
          </div>

          {/* contentEditable이라 우클릭 시 브라우저가 "붙여넣기" 메뉴를 띄워준다.
              실제 텍스트 삽입은 onPaste에서 막고, 이미지 처리는 usePasteImage(document 리스너)가 담당한다. */}
          <div
            contentEditable
            suppressContentEditableWarning
            onPaste={(e) => e.preventDefault()}
            className="mt-2 text-[11px] text-slate-400 border border-dashed border-slate-300 rounded-md px-2 py-1.5 cursor-text outline-none focus:border-blue-400 inline-block"
          >
            여기를 우클릭하거나 Ctrl+V로 이미지 붙여넣기
          </div>

          {photoCandidates !== null && (
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
              {loadingCandidates ? (
                <p className="text-xs text-slate-400 text-center py-2">"{name}" 이름으로 검색 중...</p>
              ) : photoCandidates.length > 0 ? (
                <>
                  <p className="text-xs text-slate-500 mb-2">
                    "{name}" 이름의 업로드된 사진 {photoCandidates.length}개를 찾았습니다:
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {photoCandidates.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => handleApplyCandidate(c.key)}
                        disabled={applyingCandidateKey !== null}
                        className="relative aspect-[3/4] rounded-md overflow-hidden border border-slate-300 hover:border-blue-500 disabled:opacity-50"
                        title={c.key}
                      >
                        <img
                          src={photoUrl(`/admin/members/photo-preview?key=${encodeURIComponent(c.key)}`)}
                          className="w-full h-full object-cover"
                        />
                        {applyingCandidateKey === c.key && (
                          <span className="absolute inset-0 bg-white/70 flex items-center justify-center text-[10px] text-slate-600">
                            적용 중...
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">일치하는 사진을 못 찾았습니다.</p>
              )}
            </div>
          )}
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-700 text-white font-semibold py-2.5 disabled:opacity-60"
        >
          {submitting ? "등록 중..." : "등록"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
