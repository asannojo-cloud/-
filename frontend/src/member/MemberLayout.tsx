import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useMemberSessionContext } from "./MemberSessionContext";

const tabs = [
  { to: "/member/card", label: "조합원증" },
  { to: "/member/help", label: "조합원복지사업" },
  { to: "/member/mutual-aid", label: "상조서비스" },
];

export default function MemberLayout() {
  const { member, loading } = useMemberSessionContext();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">불러오는 중...</div>;
  }
  if (!member) {
    return <Navigate to="/member/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-blue-800 text-white py-3 font-semibold tracking-wide flex items-center justify-center gap-2">
        <img src="/union-logo.png" alt="" className="h-8 w-8 object-contain" />
        <span>아산시공무원노동조합</span>
      </header>

      <main className="flex-1 pb-16">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex-1 text-center py-3 text-sm font-medium ${
                isActive ? "text-blue-700" : "text-slate-500"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
