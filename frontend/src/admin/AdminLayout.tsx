import { NavLink, Outlet, Navigate, useNavigate } from "react-router-dom";
import { useAdminSessionContext } from "./AdminSessionContext";

const links = [
  { to: "/admin/dashboard", label: "대시보드" },
  { to: "/admin/members", label: "회원관리" },
  { to: "/admin/excel", label: "Excel 관리" },
  { to: "/admin/audit-logs", label: "변경 이력" },
];

export default function AdminLayout() {
  const { admin, loading, logout } = useAdminSessionContext();
  const navigate = useNavigate();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">불러오는 중...</div>;
  }
  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  async function handleLogout() {
    await logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-56 bg-slate-900 text-slate-200 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-700">
          <p className="text-xs text-slate-400">아산시공무원노동조합</p>
          <p className="font-bold text-white">아공노 관리자</p>
        </div>
        <nav className="flex-1 py-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `block px-5 py-2.5 text-sm ${
                  isActive ? "bg-slate-800 text-white font-medium" : "text-slate-300 hover:bg-slate-800/60"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <p className="text-xs text-slate-400 mb-2">{admin.name}</p>
          <button onClick={handleLogout} className="text-xs text-slate-300 underline">
            로그아웃
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-8">
        <Outlet />
      </main>
    </div>
  );
}
