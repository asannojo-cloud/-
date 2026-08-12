import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../shared/api";

interface MemberRow {
  member_id: string;
  name: string;
  status: "active" | "inactive";
  issue_date: string;
  phone: string | null;
  has_photo: boolean;
}

function formatPhone(digits: string | null): string {
  if (!digits) return "-";
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

export default function MembersListPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | "active" | "inactive">("");
  const [items, setItems] = useState<MemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResultMessage, setBulkResultMessage] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (status) params.set("status", status);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    const data = await api.get<{ items: MemberRow[]; total: number }>(`/admin/members?${params}`);
    setItems(data.items);
    setTotal(data.total);
    // 목록이 바뀌면 더 이상 화면에 없는 선택 항목은 정리한다
    setSelected((prev) => new Set([...prev].filter((id) => data.items.some((m) => m.member_id === id))));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  // 입력할 때마다 자동으로 검색한다 (한글 입력기 조합 중 Enter가 "글자 확정"으로
  // 소비되어 검색이 트리거되지 않는 문제를 근본적으로 피하기 위함).
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allOnPageSelected = items.length > 0 && items.every((m) => selected.has(m.member_id));
  const selectedItems = items.filter((m) => selected.has(m.member_id));
  const selectedInactiveCount = selectedItems.filter((m) => m.status === "inactive").length;
  const selectedActiveCount = selectedItems.length - selectedInactiveCount;

  function toggleSelectAll() {
    setSelected((prev) => {
      if (allOnPageSelected) {
        const next = new Set(prev);
        items.forEach((m) => next.delete(m.member_id));
        return next;
      }
      const next = new Set(prev);
      items.forEach((m) => next.add(m.member_id));
      return next;
    });
  }

  function toggleOne(memberId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  function handleBulkEdit() {
    if (selected.size !== 1) return;
    navigate(`/admin/members/${[...selected][0]}`);
  }

  async function handleBulkDelete() {
    setBulkError(null);
    setBulkDeleting(true);
    try {
      const res = await api.post<{ deleted: string[]; skipped: { memberId: string; reason: string }[] }>(
        "/admin/members/bulk-delete",
        { memberIds: [...selected] }
      );
      let msg = `${res.deleted.length}명 삭제되었습니다.`;
      if (res.skipped.length > 0) {
        msg += ` (${res.skipped.length}명은 건너뜀: 활성 회원은 먼저 비활성화해야 삭제할 수 있습니다.)`;
      }
      setBulkResultMessage(msg);
      setSelected(new Set());
      setConfirmingBulkDelete(false);
      await load();
    } catch (e) {
      setBulkError(e instanceof ApiError ? e.message : "삭제 중 오류가 발생했습니다.");
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">회원관리</h1>
        <Link to="/admin/members/new" className="rounded-lg bg-blue-700 text-white text-sm font-medium px-4 py-2">
          회원 신규 등록
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              load();
            }
          }}
          placeholder="회원번호, 이름 또는 휴대폰번호 검색"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as "" | "active" | "inactive");
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">전체 상태</option>
          <option value="active">정상</option>
          <option value="inactive">비활성</option>
        </select>
        <button
          onClick={() => {
            setPage(1);
            load();
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
        >
          검색
        </button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5">
          <span className="text-sm text-slate-600">{selected.size}명 선택됨</span>
          <button
            onClick={handleBulkEdit}
            disabled={selected.size !== 1}
            title={selected.size !== 1 ? "수정은 한 명만 선택했을 때 가능합니다" : ""}
            className="rounded-lg border border-slate-300 bg-white text-sm px-3 py-1.5 disabled:opacity-40"
          >
            선택 수정
          </button>
          <button
            onClick={() => {
              setConfirmingBulkDelete(true);
              setBulkResultMessage(null);
            }}
            className="rounded-lg border border-red-300 bg-white text-red-600 text-sm px-3 py-1.5 hover:bg-red-50"
          >
            선택 삭제
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-slate-400 ml-auto">
            선택 해제
          </button>
        </div>
      )}

      {confirmingBulkDelete && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3 space-y-3">
          <p className="text-sm text-red-700">
            선택한 {selectedItems.length}명 중 <strong>비활성 회원 {selectedInactiveCount}명만</strong> 완전히 삭제됩니다.
            {selectedActiveCount > 0 && (
              <> 활성 회원 {selectedActiveCount}명은 삭제되지 않고 건너뜁니다 (먼저 비활성화가 필요합니다).</>
            )}{" "}
            <strong>삭제된 정보는 되돌릴 수 없습니다.</strong>
          </p>
          {bulkError && <p className="text-sm text-red-700">{bulkError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting || selectedInactiveCount === 0}
              className="rounded-lg bg-red-600 text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
            >
              {bulkDeleting ? "삭제 중..." : `예, ${selectedInactiveCount}명 삭제합니다`}
            </button>
            <button
              onClick={() => setConfirmingBulkDelete(false)}
              disabled={bulkDeleting}
              className="rounded-lg border border-slate-300 text-sm px-4 py-2"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {bulkResultMessage && <p className="text-sm text-green-600 mb-3">{bulkResultMessage}</p>}

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2.5 w-10">
                <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll} className="rounded" />
              </th>
              <th className="px-4 py-2.5">회원번호</th>
              <th className="px-4 py-2.5">이름</th>
              <th className="px-4 py-2.5">휴대폰번호</th>
              <th className="px-4 py-2.5">상태</th>
              <th className="px-4 py-2.5">발급일</th>
              <th className="px-4 py-2.5">사진</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr
                key={m.member_id}
                className={`border-t border-slate-100 hover:bg-slate-50 ${selected.has(m.member_id) ? "bg-blue-50/50" : ""}`}
              >
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(m.member_id)}
                    onChange={() => toggleOne(m.member_id)}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <Link to={`/admin/members/${m.member_id}`} className="text-blue-700 font-medium">
                    {m.member_id}
                  </Link>
                </td>
                <td className="px-4 py-2.5">{m.name}</td>
                <td className="px-4 py-2.5 text-slate-500">{formatPhone(m.phone)}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      m.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {m.status === "active" ? "정상" : "비활성"}
                  </span>
                </td>
                <td className="px-4 py-2.5">{m.issue_date}</td>
                <td className="px-4 py-2.5">{m.has_photo ? "있음" : "없음"}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
        <span>총 {total.toLocaleString()}명</span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40"
          >
            이전
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
