import { globalStyle, style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';

import { contactType, contactValue, removeButton } from './CreateHostView.css';

/**
 * 호스트 홈 설정(GUI `1452:40541`) — 모바일은 상단 바 · 하단 [저장] 바가 화면 폭 가득이다(셸 본문 좌우 24를 되돌림 — ← 가 화면 끝에서 16,
 * [저장]은 좌우 24). PC는 그대로
 */
export const bleed = style({
  marginLeft: -24,
  marginRight: -24,
  '@media': { [media.desktop]: { marginLeft: 0, marginRight: 0 } },
});

/**
 * PC 본문 — 가운데 960(GUI `1496:12747` 안쪽 240 · `1496:12748` 960, Design Sync #294). 제목 줄(DS Top app bar)도 이 칸 안이다.
 * 1024~1279는 셸 여백 안에서 줄어든다
 */
export const column = style({
  '@media': {
    [media.desktop]: { width: '100%', maxWidth: 960, marginLeft: 'auto', marginRight: 'auto' },
  },
});

/** PC 폼 — 칸이 960 가득(`1496:12758` 960). 모바일은 그대로 */
export const form = style({
  '@media': { [media.desktop]: { selectors: { '&&': { maxWidth: 'none' } } } },
});

/**
 * PC 연락처 — 유형 116 + 8 + 값 358 + 8 + ✕ 24 = 514(`1586:15641`, Design Sync #312). 제목 · 줄 · [문의처 추가] 사이 10(`1586:15537`).
 * ✕는 누르는 칸 44를 두고 좌우 −10으로 그림 24 자리에 맞춘다
 */
export const contacts = style({
  '@media': { [media.desktop]: { maxWidth: 116 + 8 + 358 + 8 + 24, gap: 10 } },
});
globalStyle(`${contacts} ${contactType}${contactType}`, {
  '@media': { [media.desktop]: { flexBasis: 116 } },
});
// 값 칸 358 고정 — ✕가 없는 한 줄(연락처 1개 · `1496:12771`)도 358
globalStyle(`${contacts} ${contactValue}${contactValue}`, {
  '@media': { [media.desktop]: { flex: '0 1 358px' } },
});
globalStyle(`${contacts} ${removeButton}`, {
  '@media': { [media.desktop]: { marginLeft: -10, marginRight: -10 } },
});

/**
 * 하단 바 자리 — 바(sticky)가 화면 아래에 붙도록 남은 높이 끝에 둔다. PC는 바 배경 · 위 테두리가 화면 폭 가득이다
 * (`1584:19829` 1440×105 — 버튼은 가운데 960 칸 오른쪽 끝, #311). 칸 밖으로는 `border-image` outset으로 칠한다(가로 스크롤 없음)
 */
export const bottom = style([
  bleed,
  {
    position: 'sticky',
    bottom: 0,
    marginTop: 'auto',
    '@media': {
      [media.desktop]: {
        borderImage: `linear-gradient(to bottom, ${vars.color.surface.defaultBorder} 1px, ${vars.color.background.normal} 1px) fill 0 / 0 / 0 100vw`,
      },
    },
  },
]);

/**
 * PC 바 안 좌우 여백 0 — [저장하기] 오른쪽 끝이 960 칸 끝(`1584:19829` 좌우 240 = 칸 밖). 위아래 24는 바 기본값 그대로.
 * 세기를 올린다(`.bottom.bottom > *`) — 바 기본 여백(`EditorParts.css` `bottomBar`)과 같은 세기면 CSS 청크 순서에 따라 진다
 */
globalStyle(`${bottom}${bottom} > *`, {
  '@media': { [media.desktop]: { paddingLeft: 0, paddingRight: 0 } },
});

/**
 * "호스트 삭제하기" 영역(`741:31204`) — 위 1px 선(모바일은 화면 폭 가득, PC는 960 칸 — `1556:15836`) 아래 빨간 글자 버튼.
 * FIGMA-CUSTOM: 화면이 직접 그린 글자 버튼(DS Button에 글자만 있는 Warning 변형이 없다) → 커스텀 HostSettingsView.css.ts
 */
export const deleteSection = style([
  bleed,
  {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: vars.space[2],
    marginTop: vars.space[8],
    padding: `${vars.space[6]} 24px`,
    borderTop: `1px solid ${vars.color.surface.defaultBorder}`,
    '@media': { [media.desktop]: { paddingLeft: 0, paddingRight: 0 } },
  },
]);

export const deleteButton = style({
  padding: 0,
  border: 0,
  background: 'none',
  color: vars.color.text.dangerLabel,
  cursor: 'pointer',
  selectors: {
    '&:disabled': { cursor: 'not-allowed', color: vars.color.interaction.disabledText },
    '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
  },
});
