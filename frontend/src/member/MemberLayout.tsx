import { NavLink, Outlet, Navigate, Link } from "react-router-dom";
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
      <header className="relative bg-blue-800 text-white py-3 font-semibold tracking-wide flex items-center justify-center gap-2">
        <img src="/union-logo.png" alt="" className="h-8 w-8 object-contain" />
        <span>아산시공무원노동조합</span>
        <Link
          to="/member/card"
          aria-label="홈으로 이동"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full active:bg-blue-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />
          </svg>
        </Link>
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
