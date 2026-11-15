import { button } from './Button.css';

/**
 * 카카오 말풍선 심볼 18 — 카카오 로그인 버튼(`Button variant="kakao"`)에 꼭 들어간다(가이드: 심볼 없이 버튼을 만들 수 없고
 * 형태 · 비율 · 색을 바꿀 수 없다).
 * 근거: 카카오 공식 디자인 가이드 Figma(`V17DxZkTnrhtUnUvAceCAP` "카카오·네이버 로그인 디자인 가이드", 노드 `124:973`)의
 * `카카오 로고` 18×18(`I124:932;122:102`)을 REST로 SVG 내보낸 그대로 — 사용자 결정 2026-11-16. clipPath만 뺐다(18 틀과 같아 그림이 같다).
 */
export function KakaoSymbol() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M9.00002 0.599976C4.02917 0.599976 0 3.71293 0 7.55226C0 9.94 1.5584 12.0449 3.93152 13.2969L2.93303 16.9445C2.84481 17.2668 3.21341 17.5237 3.49646 17.3369L7.87334 14.4482C8.2427 14.4838 8.61808 14.5046 9.00002 14.5046C13.9705 14.5046 17.9999 11.3918 17.9999 7.55226C17.9999 3.71293 13.9705 0.599976 9.00002 0.599976"
        fillRule="evenodd"
        clipRule="evenodd"
        fill="#000000"
      />
    </svg>
  );
}

/**
 * `<Link>` 등 `<Button>`이 아닌 요소에 카카오 로그인 버튼 모양을 입힐 때 — 클래스와 내용(심볼 + 문구)을 한 곳에서 맞춘다.
 * `<Button variant="kakao">`는 심볼을 스스로 넣으니 쓰지 않는다
 */
export function kakaoLoginLinkClass({ fullWidth = true }: { fullWidth?: boolean } = {}) {
  return button({ variant: 'kakao', fullWidth, iconText: true });
}

/** 카카오 로그인 링크 내용 — 심볼 + 가이드 완성형 문구 "카카오 로그인" */
export function KakaoLoginLabel() {
  return (
    <>
      <KakaoSymbol />
      카카오 로그인
    </>
  );
}
