import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../shared/api";

type FieldKey = "memberId" | "name" | "birthDate" | "issueDate" | "photoFile" | "status" | "phone";

const FIELD_LABELS: Record<FieldKey, string> = {
  memberId: "회원번호",
  name: "이름",
  birthDate: "생년월일",
  issueDate: "발급일",
  photoFile: "사진파일명",
  status: "상태",
  phone: "휴대폰번호",
};
const REQUIRED_FIELDS: FieldKey[] = ["name", "phone", "birthDate"];
const ALL_FIELDS: FieldKey[] = ["memberId", "name", "phone", "birthDate", "issueDate", "photoFile", "status"];

interface HeadersResponse {
  token: string;
  fileName: string;
  headers: string[];
  suggestedMapping: Partial<Record<FieldKey, string>>;
  totalRows: number;
}

interface StagedRow {
  rowNumber: number;
  memberId: string | null;
  name: string | null;
  birthDate: string | null;
  issueDate: string | null;
  photoFile: string | null;
  phone: string | null;
  targetStatus: "active" | "inactive" | null;
  errors: string[];
  changeType: "new" | "update" | "unchanged" | "inactive" | "error";
  diff: Record<string, { before: unknown; after: unknown }>;
  photoAvailable: boolean | null;
  memberIdAssigned: boolean;
  issueDateDefaulted: boolean;
}

interface ValidateResponse {
  batchId: number;
  summary: {
    totalRows: number;
    newCount: number;
    updatedCount: number;
    unchangedCount: number;
    inactiveCount: number;
    errorCount: number;
  };
  rows: StagedRow[];
  zipErrors: string[];
}

const CHANGE_LABEL: Record<StagedRow["changeType"], string> = {
  new: "신규 등록",
  update: "정보 변경",
  unchanged: "변경 없음",
  inactive: "비활성화",
  error: "오류",
};
const CHANGE_COLOR: Record<StagedRow["changeType"], string> = {
  new: "bg-blue-100 text-blue-700",
  update: "bg-amber-100 text-amber-700",
  unchanged: "bg-slate-100 text-slate-500",
  inactive: "bg-slate-300 text-slate-700",
  error: "bg-red-100 text-red-700",
};

export default function ExcelUploadPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"select" | "mapping" | "preview">("select");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [headersData, setHeadersData] = useState<HeadersResponse | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>({});
  const [result, setResult] = useState<ValidateResponse | null>(null);
  const [filter, setFilter] = useState<StagedRow["changeType"] | "all">("all");
  const [committed, setCommitted] = useState(false);

  async function handleAnalyze() {
    if (!excelFile) return;
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("excelFile", excelFile);
      const data = await api.post<HeadersResponse>("/admin/excel/headers", form);
      setHeadersData(data);
      setMapping(data.suggestedMapping);
      setStep("mapping");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "분석 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleValidate() {
    if (!headersData) return;
    const missing = REQUIRED_FIELDS.filter((f) => !mapping[f]);
    if (missing.length > 0) {
      setError(`필수 컬럼 매핑이 필요합니다: ${missing.map((f) => FIELD_LABELS[f]).join(", ")}`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("token", headersData.token);
      form.append("mapping", JSON.stringify(mapping));
      if (zipFile) form.append("zipFile", zipFile);
      const data = await api.post<ValidateResponse>("/admin/excel/validate", form);
      setResult(data);
      setCommitted(false);
      setStep("preview");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "검증 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    if (!result) return;
    setError(null);
    setBusy(true);
    try {
      await api.post(`/admin/excel/batches/${result.batchId}/commit`);
      setCommitted(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "반영 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!result) return;
    setBusy(true);
    try {
      await api.post(`/admin/excel/batches/${result.batchId}/cancel`);
    } finally {
      setBusy(false);
      resetAll();
    }
  }

  function resetAll() {
    setStep("select");
    setExcelFile(null);
    setZipFile(null);
    setHeadersData(null);
    setMapping({});
    setResult(null);
    setError(null);
    setCommitted(false);
  }

  const filteredRows = result ? result.rows.filter((r) => filter === "all" || r.changeType === filter) : [];

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">회원명부 업데이트</h1>
        <button onClick={() => navigate("/admin/excel/history")} className="text-sm text-blue-600">
          업로드 이력 보기
        </button>
      </div>

      {step === "select" && <ExcelFormatGuide />}

      {step === "select" && (
        <div className="bg-white rounded-xl shadow-sm p-6 max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Excel 파일 선택 (.xlsx)</label>
            <div className="flex items-center gap-3">
              <label className="rounded-lg border border-slate-300 text-sm font-medium text-slate-600 px-4 py-2 cursor-pointer hover:bg-slate-50">
                파일 선택
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>
              {excelFile && <span className="text-xs text-slate-500 truncate">{excelFile.name}</span>}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleAnalyze}
            disabled={!excelFile || busy}
            className="w-full rounded-lg bg-blue-700 text-white font-semibold py-2.5 disabled:opacity-60"
          >
            {busy ? "분석 중..." : "데이터 분석"}
          </button>
        </div>
      )}

      {step === "mapping" && headersData && (
        <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl space-y-5">
          <p className="text-sm text-slate-500">
            {headersData.fileName} · 총 {headersData.totalRows}행 · 컬럼 매핑을 확인해주세요.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ALL_FIELDS.map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {FIELD_LABELS[field]} {REQUIRED_FIELDS.includes(field) && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={mapping[field] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value || undefined }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">(사용 안 함)</option>
                  {headersData.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">사진 ZIP 선택 (선택 사항)</label>
            <div className="flex items-center gap-3">
              <label className="rounded-lg border border-slate-300 text-sm font-medium text-slate-600 px-4 py-2 cursor-pointer hover:bg-slate-50">
                파일 선택
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>
              {zipFile && <span className="text-xs text-slate-500 truncate">{zipFile.name}</span>}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button onClick={handleValidate} disabled={busy} className="rounded-lg bg-blue-700 text-white font-semibold px-5 py-2.5 disabled:opacity-60">
              {busy ? "검증 중..." : "데이터 검증"}
            </button>
            <button onClick={resetAll} className="rounded-lg border border-slate-300 px-5 py-2.5">
              취소
            </button>
          </div>
        </div>
      )}

      {step === "preview" && result && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-slate-800 mb-4">회원명부 검증 결과</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
              <SummaryCell label="전체" value={result.summary.totalRows} onClick={() => setFilter("all")} active={filter === "all"} />
              <SummaryCell label="신규 등록" value={result.summary.newCount} onClick={() => setFilter("new")} active={filter === "new"} />
              <SummaryCell label="정보 변경" value={result.summary.updatedCount} onClick={() => setFilter("update")} active={filter === "update"} />
              <SummaryCell label="변경 없음" value={result.summary.unchangedCount} onClick={() => setFilter("unchanged")} active={filter === "unchanged"} />
              <SummaryCell label="비활성화" value={result.summary.inactiveCount} onClick={() => setFilter("inactive")} active={filter === "inactive"} />
              <SummaryCell label="오류" value={result.summary.errorCount} onClick={() => setFilter("error")} active={filter === "error"} danger />
            </div>

            {result.zipErrors.length > 0 && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-medium text-amber-700 mb-1">사진 관련 경고 ({result.zipErrors.length}건)</p>
                <ul className="text-xs text-amber-700 list-disc pl-4 space-y-0.5 max-h-24 overflow-y-auto">
                  {result.zipErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-3 py-2">행</th>
                  <th className="px-3 py-2">회원번호</th>
                  <th className="px-3 py-2">이름</th>
                  <th className="px-3 py-2">구분</th>
                  <th className="px-3 py-2">상세</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 300).map((row) => (
                  <tr key={row.rowNumber} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-400">{row.rowNumber}</td>
                    <td className="px-3 py-2 font-medium">
                      {row.memberId ?? "-"}
                      {row.memberIdAssigned && (
                        <span className="ml-1 text-[10px] text-blue-500 font-normal align-middle">자동채번</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{row.name ?? "-"}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${CHANGE_COLOR[row.changeType]}`}>
                        {CHANGE_LABEL[row.changeType]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {row.changeType === "error"
                        ? row.errors.join(", ")
                        : [
                            ...Object.entries(row.diff).map(([k, v]) => `${k}: ${v.before ?? "-"} → ${v.after ?? "-"}`),
                            row.issueDateDefaulted ? `발급일: 업로드일(${row.issueDate})로 채움` : null,
                          ]
                            .filter(Boolean)
                            .join(", ") || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length > 300 && (
              <p className="text-xs text-slate-400 px-3 py-2">상위 300건만 표시됩니다.</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {committed ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700 font-medium">반영이 완료되었습니다.</p>
              <div className="flex gap-2 mt-3">
                <button onClick={resetAll} className="rounded-lg bg-slate-900 text-white text-sm px-4 py-2">
                  새 업로드
                </button>
                <button onClick={() => navigate("/admin/members")} className="rounded-lg border border-slate-300 text-sm px-4 py-2">
                  회원목록 보기
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCommit}
                disabled={busy || result.summary.errorCount > 0}
                className="rounded-lg bg-blue-700 text-white font-semibold px-5 py-2.5 disabled:opacity-40"
                title={result.summary.errorCount > 0 ? "오류가 있는 데이터는 반영할 수 없습니다" : ""}
              >
                {busy ? "반영 중..." : "최종 반영"}
              </button>
              <button onClick={handleCancel} disabled={busy} className="rounded-lg border border-slate-300 px-5 py-2.5">
                취소
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const EXAMPLE_ROWS = [
  ["2026-1", "홍길동", "010-1234-5678", "1985-03-15", "2026-08-11", "2026-1.jpg", "정상"],
  ["", "김철수", "010-2345-6789", "1987-04-20", "", "", ""],
];

function ExcelFormatGuide() {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-4 max-w-2xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-800">Excel 파일은 이렇게 준비해주세요</h2>
        <a
          href="/api/admin/excel/template"
          download
          className="rounded-lg bg-white border border-blue-300 text-blue-700 text-sm font-medium px-4 py-2 hover:bg-blue-100 shrink-0"
        >
          엑셀 양식 다운로드
        </a>
      </div>

      <p className="text-sm text-slate-600 mb-3">
        아래와 같은 컬럼으로 구성된 Excel(.xlsx)을 준비해주세요. 컬럼명이 다르더라도 업로드 후 화면에서 직접
        매핑할 수 있어 그대로 사용해도 괜찮습니다.
      </p>

      <div className="overflow-x-auto bg-white rounded-lg border border-blue-100 mb-3">
        <table className="w-full text-xs">
          <thead className="bg-blue-100/60 text-slate-600 text-left">
            <tr>
              {ALL_FIELDS.map((f) => (
                <th key={f} className="px-3 py-2 whitespace-nowrap">
                  {FIELD_LABELS[f]}
                  {REQUIRED_FIELDS.includes(f) && <span className="text-red-500"> *</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EXAMPLE_ROWS.map((row, i) => (
              <tr key={i} className="border-t border-blue-50">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 whitespace-nowrap text-slate-700">
                    {cell || <span className="text-slate-300">(비움)</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
        <li>
          <span className="text-red-500">*</span> 표시된 이름·휴대폰번호·생년월일만 필수입니다. 회원번호·발급일·사진파일명·상태는 비워두고 올려도 됩니다.
        </li>
        <li>회원번호를 비워두면 "발급연도-일련번호"(예: 2026-15) 형식으로 자동으로 채번됩니다.</li>
        <li>발급일을 비워두면 업로드한 날짜로 채워집니다 (단, 이미 등록된 회원의 발급일은 임의로 바꾸지 않습니다).</li>
        <li>생년월일·발급일은 2026-08-11 / 2026.08.11 / 2026/08/11 / 20260811 형식을 모두 인식합니다.</li>
        <li>상태 값: 비워두거나 "정상"이면 정상 처리, "탈퇴·자격상실·삭제·비활성" 중 하나면 비활성 처리됩니다.</li>
        <li>이미 등록된 회원번호는 정보가 갱신되고, 없는 회원번호는 신규로 등록됩니다.</li>
        <li>휴대폰번호는 회원 로그인에 사용되므로 정확히 입력해주세요. 한 번호는 한 명에게만 등록할 수 있습니다.</li>
        <li>사진을 함께 등록하려면 "사진파일명" 칸에 파일명을 적고, 같은 이름의 사진이 담긴 ZIP 파일을 다음 단계에서 함께 첨부해주세요.</li>
      </ul>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  onClick,
  active,
  danger,
}: {
  label: string;
  value: number;
  onClick: () => void;
  active: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg p-3 border ${
        active ? "border-blue-500 bg-blue-50" : "border-slate-200"
      } ${danger && value > 0 ? "text-red-600" : ""}`}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-bold">{value.toLocaleString()}</div>
    </button>
  );
}
