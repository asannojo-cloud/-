import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMemberSessionContext } from "./MemberSessionContext";
import { getErrorMessage } from "./useMemberSession";

export default function MemberLoginPage() {
  const { login } = useMemberSessionContext();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(name.trim(), phone.trim());
      navigate("/member/card", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/union-logo.png" alt="아산시공무원노동조합 로고" className="h-16 w-16 object-contain mx-auto mb-0.5" />
          <p className="text-slate-500 text-2xl">아산시공무원노동조합</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-4">모바일 조합원증</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl shadow-sm p-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">휴대폰번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="tel"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-700 text-white font-semibold py-2.5 disabled:opacity-60"
          >
            {submitting ? "로그인 중..." : "로그인"}
          </button>

          <p className="text-xs text-slate-400 text-center pt-1">
            등록하신 이름과 휴대폰번호로 본인 확인 후 로그인됩니다.
          </p>
        </form>
      </div>
    </div>
  );
}
