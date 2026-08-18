/**
 * 카카오톡 인앱브라우저(채팅창에서 링크를 눌러 열리는 내장 브라우저)로 이 페이지에
 * 접속하면, 시스템 뒤로가기 등으로 카톡 화면에 "갇혀서" 크롬/사파리처럼 자유롭게
 * 쓸 수 없다는 불편 신고가 있었다 (2026-08-19).
 *
 * 카카오톡이 공식 지원하는 kakaotalk://web/openExternal?url=... 스킴으로 리다이렉트하면,
 * 카카오톡이 iOS/Android 상관없이 기기 기본 브라우저에서 같은 주소를 대신 열어준다.
 * main.tsx에서 React 렌더링 전에 가장 먼저 호출해, 인앱브라우저 화면이 잠깐이라도
 * 보이기 전에 바로 빠져나가도록 한다.
 */
export function escapeKakaoInAppBrowser() {
  const ua = navigator.userAgent || "";
  if (!/KAKAOTALK/i.test(ua)) return;

  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`;
}
