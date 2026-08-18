import { useEffect } from "react";

/**
 * 카카오톡 등 인앱브라우저에서 앱을 열었을 때, 브라우저 히스토리가 하나뿐인 상태로
 * 시스템 뒤로가기(또는 스와이프)를 누르면 앱 내 이전 화면이 아니라 인앱브라우저
 * 자체가 닫히며 카카오톡 채팅화면 등으로 튕겨나가는 문제가 있다 (2026-08-19 보고).
 *
 * 해결책: 항상 현재 URL과 동일한 "가짜" 히스토리 항목을 하나 더 쌓아둔다.
 * - 사용자가 뒤로가기를 누르면 이 가짜 항목이 소비되며 popstate가 발생하는데,
 *   URL이 바뀌지 않았으므로(같은 화면을 가리킴) 화면상 아무 변화 없이 뒤로가기가
 *   "흡수"된다.
 * - 그 popstate 이벤트 자체를 감지해서 가짜 항목을 즉시 다시 쌓아두므로,
 *   같은 화면에서 반복적으로 뒤로가기를 눌러도 계속 흡수되어 앱을 벗어나지 않는다.
 * - 탭 이동 등 앱 내부 네비게이션(React Router의 pushState)은 popstate가 아니라
 *   pushState 호출이므로 이 로직의 영향을 받지 않고 평소처럼 동작한다.
 */
export function useBackExitGuard() {
  useEffect(() => {
    const rearm = () => {
      window.history.pushState(null, "", window.location.href);
    };

    rearm();
    window.addEventListener("popstate", rearm);
    return () => window.removeEventListener("popstate", rearm);
  }, []);
}
