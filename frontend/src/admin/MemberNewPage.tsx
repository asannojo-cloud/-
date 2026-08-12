import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../shared/api";
import DateInput from "../shared/DateInput";

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
          <div className="flex items-center gap-3">
            {photoPreviewUrl && (
              <img
                src={photoPreviewUrl}
                alt="사진 미리보기"
                className="w-16 aspect-[3/4] object-cover rounded-lg border border-slate-200"
              />
            )}
            <label className="rounded-lg border border-slate-300 text-sm font-medium text-slate-600 px-4 py-2 cursor-pointer hover:bg-slate-50">
              {photo ? "다른 파일 선택" : "파일 선택"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
            {photo && <span className="text-xs text-slate-500 truncate max-w-[10rem]">{photo.name}</span>}
          </div>
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
