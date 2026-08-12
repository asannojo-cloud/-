export default function MemberHelpPage() {
  return (
    <div className="px-6 pt-8 max-w-sm mx-auto text-sm text-slate-600 leading-relaxed">
      <h2 className="text-lg font-bold text-slate-900 mb-4">안내</h2>
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <p>본 모바일 조합원증은 아산시공무원노동조합 조합원 본인만 조회할 수 있습니다.</p>
        <p>회원정보(이름, 생년월일, 사진 등)에 변경이 필요하거나 로그인이 되지 않는 경우 아래 번호로 문의해주세요.</p>
      </div>

      <a
        href="tel:540-2667"
        className="mt-3 flex items-center gap-3 bg-white rounded-2xl shadow-sm p-5 active:bg-slate-50"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2Z" />
          </svg>
        </span>
        <span>
          <span className="block text-xs text-slate-400">문의전화</span>
          <span className="block text-base font-semibold text-slate-900">540-2667</span>
        </span>
      </a>
    </div>
  );
}
