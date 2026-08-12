import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../shared/api";

interface DashboardData {
  counts: { total: number; active: number; inactive: number; new_recent: number };
  recentBatches: {
    id: number;
    file_name: string;
    uploaded_at: string;
    status: string;
    total_rows: number;
    new_count: number;
    updated_count: number;
    inactive_count: number;
    error_count: number;
  }[];
  recentChanges: { member_id: string; action: string; created_at: string }[];
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
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.get<DashboardData>("/admin/members/dashboard").then(setData);
  }, []);

  if (!data) return <p className="text-slate-400">불러오는 중...</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-6">대시보드</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="전체 회원 수" value={data.counts.total} />
        <StatCard label="정상 회원 수" value={data.counts.active} />
        <StatCard label="비활성 회원 수" value={data.counts.inactive} />
        <StatCard label="최근 30일 신규" value={data.counts.new_recent} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">최근 Excel 업로드</h2>
            <Link to="/admin/excel/history" className="text-xs text-blue-600">
              전체 보기
            </Link>
          </div>
          {data.recentBatches.length === 0 ? (
            <p className="text-sm text-slate-400">업로드 이력이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {data.recentBatches.map((b) => (
                <li key={b.id} className="text-sm border-b border-slate-100 pb-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-700">{b.file_name}</span>
                    <span className="text-slate-400">{new Date(b.uploaded_at).toLocaleString("ko-KR")}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    총 {b.total_rows} · 신규 {b.new_count} · 변경 {b.updated_count} · 비활성 {b.inactive_count} · 오류{" "}
                    {b.error_count} · 상태 {b.status}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">최근 변경사항</h2>
            <Link to="/admin/audit-logs" className="text-xs text-blue-600">
              전체 보기
            </Link>
          </div>
          {data.recentChanges.length === 0 ? (
            <p className="text-sm text-slate-400">변경 이력이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {data.recentChanges.map((c, i) => (
                <li key={i} className="text-sm flex justify-between border-b border-slate-100 pb-2">
                  <span>
                    <span className="font-medium text-slate-700">{c.member_id}</span>{" "}
                    <span className="text-slate-500">{ACTION_LABEL[c.action] ?? c.action}</span>
                  </span>
                  <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleString("ko-KR")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value.toLocaleString()}</p>
    </div>
  );
}
