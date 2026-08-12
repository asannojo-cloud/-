import { useEffect, useState } from "react";
import { api } from "../shared/api";

interface AuditRow {
  id: number;
  member_id: string | null;
  action: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  admin_name: string | null;
}

const ACTION_LABEL: Record<string, string> = {
  create: "신규 등록",
  update: "정보 변경",
  deactivate: "비활성화",
  reactivate: "재활성화",
  reset_password: "비밀번호 재발급",
  excel_create: "Excel 신규 등록",
  excel_update: "Excel 정보 변경",
  excel_deactivate: "Excel 비활성화",
  photo_update: "사진 변경",
  member_login_success: "회원 로그인 성공",
  member_login_fail: "회원 로그인 실패",
  admin_login_success: "관리자 로그인 성공",
  admin_login_fail: "관리자 로그인 실패",
};

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [memberId, setMemberId] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (memberId.trim()) params.set("memberId", memberId.trim());
    const data = await api.get<{ items: AuditRow[] }>(`/admin/audit-logs?${params}`);
    setItems(data.items);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-6">변경 이력</h1>

      <div className="flex gap-3 mb-4">
        <input
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="회원번호로 필터링"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-64"
        />
        <button onClick={load} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
          조회
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2.5">일시</th>
              <th className="px-4 py-2.5">관리자</th>
              <th className="px-4 py-2.5">회원번호</th>
              <th className="px-4 py-2.5">작업</th>
              <th className="px-4 py-2.5">변경 전</th>
              <th className="px-4 py-2.5">변경 후</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-2.5 text-xs text-slate-500">{new Date(row.created_at).toLocaleString("ko-KR")}</td>
                <td className="px-4 py-2.5">{row.admin_name ?? "-"}</td>
                <td className="px-4 py-2.5 font-medium">{row.member_id ?? "-"}</td>
                <td className="px-4 py-2.5">{ACTION_LABEL[row.action] ?? row.action}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs truncate">
                  {row.old_value ? JSON.stringify(row.old_value) : "-"}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs truncate">
                  {row.new_value ? JSON.stringify(row.new_value) : "-"}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  이력이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
