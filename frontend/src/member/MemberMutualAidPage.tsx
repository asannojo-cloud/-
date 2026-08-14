import { useState } from "react";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}

const FUNERAL_STEPS = [
  { title: "장례발생", desc: "365일 24시간 상황실 세부사항 접수" },
  { title: "장례접수", desc: "대표번호 1800-4446" },
  { title: "장례지도사 출동", desc: "2시간 이내 출동 및 조사용품 배송" },
  { title: "장례상담", desc: "장례진행 절차안내, 예법 상세안내" },
  { title: "장례진행", desc: "장례진행 임직원과 협의" },
  { title: "장례종료", desc: "장례비용 정산, 행정절차 안내" },
];

function CityFuneralServiceDetail() {
  return (
    <div className="mt-3 pt-3 border-t border-slate-100 space-y-4 text-xs">
      <p className="text-center font-bold text-slate-800 text-sm">장례 무료서비스 지원 안내문</p>

      <div className="space-y-2">
        <InfoLine label="서비스대상" value="아산시 소속 임직원 본인, 배우자, 자녀, 부모(배우자 부모 포함)" />
        <InfoLine label="지원내용" value="접객용품 및 장례도우미, 장례용품, 상조서비스 제공" />
        <InfoLine label="이용방법" value="아산시청 직원임을 밝히고 접수" />
      </div>

      <a
        href="tel:1800-4446"
        className="block text-center bg-amber-50 border border-amber-200 rounded-lg py-2 text-amber-700 font-semibold"
      >
        대표번호 1800-4446
      </a>

      <div>
        <p className="font-bold text-slate-700 mb-2">진행 절차</p>
        <div className="space-y-2">
          {FUNERAL_STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold">
                {i + 1}
              </span>
              <p>
                <span className="font-medium text-slate-800">{step.title}</span>
                <span className="text-slate-500"> — {step.desc}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="font-bold text-slate-700 mb-1.5">비용절감 혜택</p>
        <ul className="list-disc pl-4 space-y-1 text-slate-600">
          <li>협력 장례식장 감면</li>
          <li>아산시청 상조 제휴가 진행</li>
        </ul>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium mr-1.5">{label}</span>
      <span className="text-slate-600">{value}</span>
    </p>
  );
}

export default function MemberMutualAidPage() {
  const [cityServiceOpen, setCityServiceOpen] = useState(false);

  return (
    <div className="px-6 pt-8 max-w-sm mx-auto text-sm text-slate-600 leading-relaxed">
      <h2 className="text-lg font-bold text-slate-900 mb-4">상조서비스</h2>

      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-1.5">지원대상</h3>
          <p>본인, 배우자, 자녀, 부모(배우자의 부모 포함)</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          단, 단일 지원대상 장례에 지원대상자가 복수일 경우 중복 지원은 불가합니다.
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-2">지원 내용</h3>
          <div className="space-y-3">
            <div>
              <button
                type="button"
                onClick={() => setCityServiceOpen((v) => !v)}
                className="w-full flex items-center justify-between text-left"
              >
                <span className="font-medium text-slate-800">가. 아산시청 직원장례서비스</span>
                <ChevronIcon open={cityServiceOpen} />
              </button>
              {cityServiceOpen && <CityFuneralServiceDetail />}
            </div>
            <div>
              <p className="font-medium text-slate-800">나. 아공노 상조지원서비스</p>
              <p className="mt-1 pl-3 text-slate-600">1) 10만원 또는 상조물품 2박스 중 선택</p>
            </div>
          </div>
        </div>
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
