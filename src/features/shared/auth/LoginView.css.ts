import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';

/**
 * 로그인·세션 만료(와이어 `218:4792`) — 셸 본문 높이를 채우고 가운데에 말풍선 + 캐릭터 + 버튼을 세운다.
 * 크기는 와이어 값: 캐릭터 자리 285(DS `img_login` 원래 크기), 버튼 폭 268(390 프레임 안).
 */
export const main = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.space[7],
  padding: `${vars.space[9]} ${vars.space[4]}`,
  // 낮은 화면(390×667 · 가로 모드)은 위아래 여백을 줄여 한 화면에 더 들어오게 — 넘치면 문서가 스크롤한다(고정 높이 없음)
  '@media': {
    '(max-height: 700px)': { gap: vars.space[5], padding: `${vars.space[5]} ${vars.space[4]}` },
  },
});

/**
 * 말풍선 + 캐릭터 한 묶음(흐름 안 세로 쌓기 — 이슈 #95). 간격 12(꼬리 5 포함 — Radix Tooltip `sideOffset` 6 + 꼬리와 비슷).
 * 캐릭터는 좁은 화면에서 줄어든다(전역 `img { max-width: 100% }`).
 */
export const hero = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space[3],
  width: '100%',
  maxWidth: 320,
});

export const action = style({
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
  maxWidth: 268,
});
