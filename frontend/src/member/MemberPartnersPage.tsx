const PARTNERS_URL = "https://asan-union-partners.onrender.com/search";

export default function MemberPartnersPage() {
  return (
    <div className="px-6 pt-8 max-w-sm mx-auto text-sm text-slate-600 leading-relaxed">
      <h2 className="text-lg font-bold text-slate-900 mb-4">협약기관</h2>
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3 mb-3">
        <p>아산시공무원노동조합과 협약을 맺은 기관/업체를 검색하고 할인 혜택을 확인할 수 있습니다.</p>
      </div>

      <a
        href={PARTNERS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 bg-white rounded-2xl shadow-sm p-5 active:bg-slate-50"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 21H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.5V7h3.5M14 22l7-7M14 22h5.5M14 22v-5.5" />
          </svg>
        </span>
        <span className="flex-1 text-base font-semibold text-slate-900">협약기관 검색</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-slate-300 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
        </svg>
      </a>
    </div>
  );
}
