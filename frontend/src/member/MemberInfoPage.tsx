import { useNavigate } from "react-router-dom";
import { useMemberSessionContext } from "./MemberSessionContext";

function formatDate(iso: string): string {
  return iso.replaceAll("-", ".");
}

export default function MemberInfoPage() {
  const { member, logout } = useMemberSessionContext();
  const navigate = useNavigate();
  if (!member) return null;

  async function handleLogout() {
    await logout();
    navigate("/member/login", { replace: true });
  }

  return (
    <div className="px-6 pt-8 max-w-sm mx-auto">
      <h2 className="text-lg font-bold text-slate-900 mb-4">내 정보</h2>
      <div className="bg-white rounded-2xl shadow-sm divide-y divide-slate-100">
        <Row label="이름" value={member.name} />
        <Row label="생년월일" value={formatDate(member.birthDate)} />
        <Row label="조합원증 발급일" value={formatDate(member.issueDate)} />
      </div>

      <p className="mt-4 text-xs text-slate-400 text-center">
        정보가 변경되었거나 로그인이 되지 않으면 노동조합 담당자에게 문의해주세요.
      </p>

      <button
        onClick={handleLogout}
        className="mt-6 w-full rounded-lg border border-slate-300 text-slate-600 font-medium py-2.5"
      >
        로그아웃
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-3">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className="text-slate-900 text-sm font-medium">{value}</span>
    </div>
  );
}
