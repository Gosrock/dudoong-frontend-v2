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

/** 규정 목록 ↔ 중개자 문장 — GUI는 같은 글자 상자 안 빈 줄 하나(줄 높이 18.2 → 토큰 16) */
export const notice = style({ marginTop: vars.space[4] });
