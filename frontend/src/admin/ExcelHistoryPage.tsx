import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../shared/api";

interface BatchRow {
  id: number;
  file_name: string;
  uploaded_at: string;
  committed_at: string | null;
  status: string;
  total_rows: number;
  new_count: number;
  updated_count: number;
  unchanged_count: number;
  inactive_count: number;
  error_count: number;
  uploaded_by_name: string;
}

const STATUS_LABEL: Record<string, string> = {
  validated: "검증 완료 (미반영)",
  committed: "반영 완료",
  cancelled: "취소됨",
  failed: "실패",
};

export default function ExcelHistoryPage() {
  const [items, setItems] = useState<BatchRow[]>([]);

  useEffect(() => {
    api.get<{ items: BatchRow[] }>("/admin/excel/batches").then((d) => setItems(d.items));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Excel 업로드 이력</h1>
        <Link to="/admin/excel" className="rounded-lg bg-blue-700 text-white text-sm font-medium px-4 py-2">
          새 업로드
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2.5">업로드 일시</th>
              <th className="px-4 py-2.5">파일명</th>
              <th className="px-4 py-2.5">업로더</th>
              <th className="px-4 py-2.5">상태</th>
              <th className="px-4 py-2.5">전체/신규/변경/비활성/오류</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="px-4 py-2.5 text-xs text-slate-500">{new Date(b.uploaded_at).toLocaleString("ko-KR")}</td>
                <td className="px-4 py-2.5">{b.file_name}</td>
                <td className="px-4 py-2.5">{b.uploaded_by_name}</td>
                <td className="px-4 py-2.5">{STATUS_LABEL[b.status] ?? b.status}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">
                  {b.total_rows} / {b.new_count} / {b.updated_count} / {b.inactive_count} / {b.error_count}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  업로드 이력이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
