import { colors } from './colors';
import { descriptionGap4 as gap4, descriptionGap8 as gap8 } from './overlay-text.css';
import type { Typography } from './typography.css';

/**
 * 오버레이(Modal · BottomSheet · Popup) 제목 · 설명 글자 — Ready 화면마다 달라 prop으로 고른다(2026-11-08 `fm-ds-overlays`).
 * 컴포넌트끼리 서로의 `.css.ts`를 import하지 않게 theme에 둔다(patterns §7).
 */
export type OverlayTitleSize = 'sm' | 'md2' | 'lg' | 'label';

export const overlayTitleTypography = {
  /** `Heading/sm - emphasized` 16/700 — 기본 */
  sm: 'headingSmEmphasized',
  /** `Heading/md2 - emphasized` 18/700 — 예매자 주문 · 티켓 상세(`994:1158` · `1029:6892`) */
  md2: 'headingMd2Emphasized',
  /** `Heading/lg-emphasized` 24/700 — 선물 확인 시트(`908:12096`) */
  lg: 'headingLgEmphasized',
  /** `Label/lg-emphasized` 16/700 — 입금 확인 창(`567:9756`) */
  label: 'labelLgEmphasized',
} as const satisfies Record<OverlayTitleSize, Typography>;

/**
 * 설명 글자.
 * - `default` — 컴포넌트 기본(시트 `Body/md` 보조색 · 제목 아래 4 / 모달 `Label/md` 진한색 · 8 / 확인 팝업 `Label/sm` 보조색 · 8)
 * - `body` — `Body/md` 14/400 진한색, 제목 아래 4(예매자 주문 · 티켓 상세 `994:1164` · `1029:6888`)
 * - `caption` — `Label/sm` 12/500 보조색, 제목 아래 8(옵션 추가 `931:1321` · `956:3394`)
 * - `label` — `Label/md` 14/500 보조색, 제목 아래 8(선물 확인 시트 `908:12096`)
 * - `labelPrimary` — `Label/md` 14/500 진한색, 제목 아래 8(입금 확인 창 `567:9756`)
 */
export type OverlayDescriptionStyle = 'default' | 'body' | 'caption' | 'label' | 'labelPrimary';

type DescriptionText = { typography: Typography; color: string; gap: string };

const DEFAULTS: Record<'sheet' | 'modal' | 'popup', DescriptionText> = {
  sheet: { typography: 'bodyMd', color: colors.textSecondary, gap: gap4 },
  modal: { typography: 'labelMd', color: colors.textPrimary, gap: gap8 },
  popup: { typography: 'labelSm', color: colors.textSecondaryLabel, gap: gap8 },
};

const STYLES: Record<Exclude<OverlayDescriptionStyle, 'default'>, DescriptionText> = {
  body: { typography: 'bodyMd', color: colors.textPrimary, gap: gap4 },
  caption: { typography: 'labelSm', color: colors.textSecondary, gap: gap8 },
  label: { typography: 'labelMd', color: colors.textSecondary, gap: gap8 },
  labelPrimary: { typography: 'labelMd', color: colors.textPrimary, gap: gap8 },
};

export function overlayDescriptionText(
  style: OverlayDescriptionStyle,
  kind: 'sheet' | 'modal' | 'popup',
): DescriptionText {
  return style === 'default' ? DEFAULTS[kind] : STYLES[style];
}
