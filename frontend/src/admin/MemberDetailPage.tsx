import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, ApiError, photoUrl } from "../shared/api";
import DateInput from "../shared/DateInput";

interface MemberDetail {
  member_id: string;
  name: string;
  birth_date: string;
  issue_date: string;
  status: "active" | "inactive";
  phone: string | null;
  created_at: string;
  updated_at: string;
  has_photo: boolean;
  lastChange: { action: string; created_at: string } | null;
}

function formatPhone(digits: string | null): string {
  if (!digits) return "-";
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    if (!memberId) return;
    const data = await api.get<MemberDetail>(`/admin/members/${memberId}`);
    setDetail(data);
    setName(data.name);
    setBirthDate(data.birth_date);
    setIssueDate(data.issue_date);
    setPhone(data.phone ?? "");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  async function handleSave() {
    setError(null);
    setMessage(null);
    try {
      await api.put(`/admin/members/${memberId}`, { name, birthDate, issueDate, phone });
      setMessage("저장되었습니다.");
      setEditing(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "저장 중 오류가 발생했습니다.");
    }
  }

  async function handleToggleStatus() {
    if (!detail) return;
    setError(null);
    try {
      if (detail.status === "active") {
        await api.post(`/admin/members/${memberId}/deactivate`);
      } else {
        await api.post(`/admin/members/${memberId}/reactivate`);
      }
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "처리 중 오류가 발생했습니다.");
    }
  }

  async function handleDelete() {
    if (!memberId) return;
    setError(null);
    setDeleting(true);
    try {
      await api.delete(`/admin/members/${memberId}`);
      navigate("/admin/members", { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "삭제 중 오류가 발생했습니다.");
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handlePhotoSelect(file: File | null) {
    if (!file || !memberId) return;
    setError(null);
    setMessage(null);
    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      await api.post(`/admin/members/${memberId}/photo`, form);
      setPhotoVersion((v) => v + 1);
      setMessage("사진이 저장되었습니다.");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  if (!detail) return <p className="text-slate-400">불러오는 중...</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">회원 상세 — {detail.member_id}</h1>
        <span
          className={`px-2.5 py-1 rounded-full text-xs ${
            detail.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"
          }`}
        >
          {detail.status === "active" ? "정상" : "비활성"}
        </span>
      </div>

      {!detail.phone && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          휴대폰번호가 등록되지 않아 이 회원은 아직 로그인할 수 없습니다. "정보 수정"에서 휴대폰번호를 추가해주세요.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col items-center sm:max-w-none max-w-[10rem] mx-auto w-full">
          <div className="w-32 aspect-[3/4] rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
            {detail.has_photo ? (
              <img
                key={photoVersion}
                src={`${photoUrl(`/admin/members/${detail.member_id}/photo`)}?v=${photoVersion}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">사진 없음</div>
            )}
          </div>

          <label className="mt-3 w-full">
            <span className="block w-full text-center rounded-lg border border-slate-300 text-xs font-medium text-slate-600 px-3 py-2 cursor-pointer hover:bg-slate-50">
              {uploadingPhoto ? "업로드 중..." : detail.has_photo ? "사진 교체" : "사진 등록"}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploadingPhoto}
              onChange={(e) => {
                handlePhotoSelect(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <div className="col-span-2 bg-white rounded-xl shadow-sm p-5 space-y-4">
          {!editing ? (
            <>
              <InfoRow label="이름" value={detail.name} />
              <InfoRow label="휴대폰번호" value={formatPhone(detail.phone)} />
              <InfoRow label="생년월일" value={detail.birth_date} />
              <InfoRow label="발급일" value={detail.issue_date} />
              <InfoRow label="등록일" value={new Date(detail.created_at).toLocaleString("ko-KR")} />
              <InfoRow label="수정일" value={new Date(detail.updated_at).toLocaleString("ko-KR")} />
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg bg-blue-700 text-white text-sm font-medium px-4 py-2"
              >
                정보 수정
              </button>
            </>
          ) : (
            <>
              <Field label="이름">
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </Field>
              <Field label="휴대폰번호 (로그인에 사용)">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="생년월일">
                <DateInput value={birthDate} onChange={setBirthDate} />
              </Field>
              <Field label="발급일">
                <DateInput value={issueDate} onChange={setIssueDate} />
              </Field>
              <div className="flex gap-2">
                <button onClick={handleSave} className="rounded-lg bg-blue-700 text-white text-sm font-medium px-4 py-2">
                  저장
                </button>
                <button onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 text-sm px-4 py-2">
                  취소
                </button>
              </div>
            </>
          )}

          {message && <p className="text-sm text-green-600">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="pt-4 border-t border-slate-100 flex gap-2 flex-wrap">
            <button onClick={handleToggleStatus} className="rounded-lg border border-slate-300 text-sm px-4 py-2">
              {detail.status === "active" ? "회원 비활성화" : "회원 재활성화"}
            </button>
            {detail.status === "inactive" && !confirmingDelete && (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="rounded-lg border border-red-300 text-red-600 text-sm px-4 py-2 hover:bg-red-50"
              >
                회원정보 완전 삭제
              </button>
            )}
          </div>

          {detail.status === "inactive" && confirmingDelete && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-red-700">
                <strong>{detail.member_id}</strong> ({detail.name}) 회원 정보를 완전히 삭제합니다. 사진 파일도 함께
                삭제되며, <strong>이 작업은 되돌릴 수 없습니다.</strong>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
                >
                  {deleting ? "삭제 중..." : "예, 영구 삭제합니다"}
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="rounded-lg border border-slate-300 text-sm px-4 py-2"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-medium">{value}</span>
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
