import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/**
 * 상단 바 고정(fix-qa-1101, 사용자 요청 2026-11-01) — PC `TopBar` · 모바일 로고 헤더 · 하위 화면 헤더 · 공연 모바일 헤더.
 * 서비스 배너는 고정하지 않는다(위로 스크롤돼 사라진다 — 🤖 판단). z-index는 `header` 토큰 — 오버레이(Radix 포털, `sheet` 이상)보다 아래.
 * 바 자체(`Header`·`TopBar`)가 흰 배경을 갖는다. 부모가 `overflow`를 걸면 고정이 풀린다 — 셸·페이지 바깥 틀에 걸지 않는다.
 */
export const stickyBar = style({
  position: 'sticky',
  top: 0,
  zIndex: vars.zIndex.header,
});
