import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';
import { typography } from '@/ui/theme/typography.css';

/** 취소 기한 줄 — `Label/md-emphasized` 14 · `text/secondary-label`, 양끝(GUI `1952:50158`) */
export const deadlineRow = style([
  typography.labelMdEmphasized,
  {
    display: 'flex',
    justifyContent: 'space-between',
    gap: vars.space[2],
    color: vars.color.text.secondaryLabel,
  },
]);

/** 접히는 규정 상자 — 아래 상자(중개자 문장)와 한 판으로 보이게 아래 안쪽 없음 */
export const boxHead = style({ paddingBottom: 0 });

/** 늘 보이는 아래 상자(중개자 문장 · 링크). 펼치면 목록 아래 16(GUI 빈 줄)로 이어진다 */
export const boxTail = style({ paddingTop: vars.space[4] });
