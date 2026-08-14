// 로그인한 조합원에게만 안내하는 제휴/서비스 링크. 추가하려면 이 배열에 항목만 더하면 된다.
const MEMBER_SERVICES = [
  {
    label: "협약기관 검색",
    url: "https://asan-union-partners.onrender.com/search",
  },
  {
    label: "아산시공무원노동조합 차량대여사업",
    url: "https://asanvehicle-fwznm5ba.manus.space/",
  },
];

export default function MemberHelpPage() {
  return (
    <div className="px-6 pt-8 max-w-sm mx-auto text-sm text-slate-600 leading-relaxed">
      <h2 className="text-lg font-bold text-slate-900 mb-4">협약기관 및 차량대여</h2>

      <div className="space-y-2">
        {MEMBER_SERVICES.map((service) => (
          <a
            key={service.url}
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white rounded-2xl shadow-sm p-5 active:bg-slate-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H12a6 6 0 0 0 0 12h1.5M10.5 18H12a6 6 0 0 0 0-12h-1.5M8 12h8" />
              </svg>
            </span>
            <span className="flex-1 text-base font-semibold text-slate-900">{service.label}</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-slate-300 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
            </svg>
          </a>
        ))}
      </div>

      <h3 className="text-sm font-bold text-slate-700 mt-6 mb-2 px-1">문의</h3>
      <a
        href="tel:041-540-2667"
        className="flex items-center gap-3 bg-white rounded-2xl shadow-sm p-5 active:bg-slate-50"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2Z" />
          </svg>
        </span>
        <span>
          <span className="block text-xs text-slate-400">문의전화</span>
          <span className="block text-base font-semibold text-slate-900">041-540-2667</span>
        </span>
      </a>
    </div>
  );
}
