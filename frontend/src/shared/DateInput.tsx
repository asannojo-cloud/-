import { useEffect, useRef, useState } from "react";

interface DateInputProps {
  value: string; // "YYYY-MM-DD" 형식, 미완성이면 ""
  onChange: (value: string) => void;
  required?: boolean;
}

/**
 * 연/월/일을 별도 칸으로 입력받는 날짜 입력 컴포넌트.
 * 네이티브 <input type="date">는 브라우저/OS에 따라 연도(4자리) 입력 후
 * 자동으로 월 입력으로 넘어가는 동작이 제각각이라, 이를 직접 제어하기 위해 만들었다.
 * - 연도 4자리를 입력하면 자동으로 월 칸으로 이동
 * - 월 2자리를 입력하면 자동으로 일 칸으로 이동
 * - Backspace는 항상 현재 칸(연/월/일) 안에서만 지우고, 다른 칸으로 넘어가지 않음
 *
 * 주의: 날짜가 아직 완성되지 않은 동안에는 onChange("")로 상위에 알리는데,
 * 이 값이 그대로 value prop으로 되돌아오면서 아직 다 안 지운 다른 칸까지
 * 초기화되는 문제가 있었다. lastEmitted로 "내가 방금 emit한 값"을 기억해두고,
 * 그 값이 그대로 되돌아온 경우에는 로컬 입력 상태를 건드리지 않는다.
 */
export default function DateInput({ value, onChange, required }: DateInputProps) {
  const parts = value ? value.split("-") : ["", "", ""];
  const [year, setYear] = useState(parts[0] ?? "");
  const [month, setMonth] = useState(parts[1] ?? "");
  const [day, setDay] = useState(parts[2] ?? "");
  const lastEmitted = useRef(value);

  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);

  // 상위에서 값을 "외부에서" 새로 불러온 경우(예: 회원 상세 조회)에만 동기화한다.
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    const p = value ? value.split("-") : ["", "", ""];
    setYear(p[0] ?? "");
    setMonth(p[1] ?? "");
    setDay(p[2] ?? "");
  }, [value]);

  function commit(y: string, m: string, d: string) {
    const next = y.length === 4 && m.length >= 1 && d.length >= 1 ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : "";
    lastEmitted.current = next;
    onChange(next);
  }

  const inputClass =
    "rounded-lg border border-slate-300 px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="YYYY"
        maxLength={4}
        value={year}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 4);
          setYear(v);
          commit(v, month, day);
          if (v.length === 4) monthRef.current?.focus();
        }}
        className={`${inputClass} w-16`}
        required={required}
      />
      <span className="text-slate-400">년</span>
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="MM"
        maxLength={2}
        value={month}
        onChange={(e) => {
          let v = e.target.value.replace(/\D/g, "").slice(0, 2);
          if (v.length === 2 && parseInt(v, 10) > 12) v = "12";
          setMonth(v);
          commit(year, v, day);
          if (v.length === 2) dayRef.current?.focus();
        }}
        className={`${inputClass} w-12`}
        required={required}
      />
      <span className="text-slate-400">월</span>
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD"
        maxLength={2}
        value={day}
        onChange={(e) => {
          let v = e.target.value.replace(/\D/g, "").slice(0, 2);
          if (v.length === 2 && parseInt(v, 10) > 31) v = "31";
          setDay(v);
          commit(year, month, v);
        }}
        className={`${inputClass} w-12`}
        required={required}
      />
      <span className="text-slate-400">일</span>
    </div>
  );
}
