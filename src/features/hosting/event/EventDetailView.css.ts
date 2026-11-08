import { style } from '@vanilla-extract/css';

import { media } from '@/ui/theme/breakpoints';
import { vars } from '@/ui/theme/tokens.css';
import { typographySpecs } from '@/ui/theme/typography.css';

/**
 * 상세 정보 — 모바일(GUI `767:39585`, #190): 위 16 · 좌우 24 · 아래 28, 안내 2줄(`Body/md`) → 16 → 탭(44h) → 16 → 에디터 카드.
 * PC(`767:39645`): 위 28 · 좌우 24, 제목 `Heading/lg-emphasized` + 4 + 안내 한 줄(`Body/lg`) → 24 → 탭(48h, 아래 선 #F7F7F6) → 16 → 카드.
 */
export const page = style({ display: 'flex', flexDirection: 'column', flex: '1 0 auto' });

export const body = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
  padding: `${vars.space[4]} ${vars.space[5]} 28px`,
  '@media': {
    [media.desktop]: { gap: vars.space[5], padding: `28px ${vars.space[5]}` },
  },
});

/** PC만 보인다. 모바일은 헤더 제목("상세 정보 ▾")이 대신하고 h1은 화면 읽기 도구에만 남긴다(P14 접근성 — 기본 정보와 같다) */
export const desktopTitle = style({
  margin: 0,
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  '@media': {
    [media.desktop]: {
      position: 'static',
      width: 'auto',
      height: 'auto',
      overflow: 'visible',
      clip: 'auto',
      whiteSpace: 'normal',
      display: 'block',
    },
  },
});

/** 모바일 두 줄 `Body/md` · PC 한 줄 `Body/lg`(16) */
export const description = style({
  whiteSpace: 'pre-line',
  '@media': {
    [media.desktop]: {
      whiteSpace: 'normal',
      fontSize: typographySpecs.bodyLg.size,
      lineHeight: typographySpecs.bodyLg.lineHeight,
    },
  },
});

/** 탭 줄 + 추가(+) — 탭 사이 · (+) 앞 24, 아래 선 #F7F7F6(GUI `tab` 테두리 = `surface.container`). 탭이 많으면 가로 스크롤 */
export const tabRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[5],
  borderBottom: `1px solid ${vars.color.surface.container}`,
});

export const tabList = style({ minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none' });

export const panel = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  paddingTop: vars.space[4],
  // Radix가 고르지 않은 탭에 `hidden`을 단다 — display를 덮어쓰지 않게
  selectors: { '&[hidden]': { display: 'none' } },
});

/**
 * 탭 — PC 글자는 화면대로 `Heading/md2`(18 — DS `type=데스크탑` 20을 화면이 덮어씀, `767:40045`).
 * 메뉴가 열린 탭(`1316:497` · `1336:1013` "tab item (선택·이름 편집)"): 배경 `surface/container` · 좌우 10 · 위 모서리 8.
 * FIGMA-CUSTOM: tab item 열린 상태(gui 1316:497) — DS `tab item`에 없는 상태 → 이 파일. DS 후보(design-system §3)
 */
export const tab = style({
  '@media': {
    [media.desktop]: {
      // `&&` — Tabs 레시피의 데스크탑 글자 크기(같은 특이도)를 CSS 순서와 상관없이 이긴다
      selectors: {
        '&&': {
          fontSize: typographySpecs.headingMd2.size,
          lineHeight: typographySpecs.headingMd2.lineHeight,
        },
      },
    },
  },
  selectors: {
    '&[data-menu-open="true"]': {
      padding: '0 10px',
      background: vars.color.surface.container,
      borderRadius: `${vars.radius[2]} ${vars.radius[2]} 0 0`,
    },
  },
});

/** 고른 탭 + PC 탭 메뉴 자리. 메뉴는 탭 아래 왼쪽(`1318:385` — 탭 왼쪽 −15 · 아래 +6)에 붙는다 */
export const tabAnchor = style({ position: 'relative', display: 'inline-flex', flexShrink: 0 });

/** 드롭다운 트리거 자리(크기 0) — 여는 것은 탭 누르기가 맡는다 */
export const menuTrigger = style({
  position: 'absolute',
  left: 0,
  bottom: 0,
  width: 0,
  height: 0,
  pointerEvents: 'none',
});

export const preview = style({ minHeight: 240 });
