import { style } from '@vanilla-extract/css';

import { vars } from '@/ui/theme/tokens.css';
import { typography } from '@/ui/theme/typography.css';

export const refundPolicyLinks = style([
  typography.labelMd,
  {
    padding: `0 ${vars.space[5]} ${vars.space[4]}`,
    color: vars.color.text.secondaryLabel,
  },
]);
