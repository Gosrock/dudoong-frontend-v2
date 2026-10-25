import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../theme/tokens.css';
import { typography, typographySpecs } from '../../theme/typography.css';

/** Figma tab(`271:1234`): 탭 사이 24 */
export const list = style({
  display: 'flex',
  gap: vars.space[5],
});

const selectedWeight = (spec: { weight: number; lineHeight: string }) => ({
  fontWeight: spec.weight,
  lineHeight: spec.lineHeight,
});

/**
 * Figma tab item(`271:1227`, 2026-10-25 판).
 * - 미선택 `interaction/inactive` Regular, 선택 `text/primary-label`(검정) Bold + 아래 2px 같은 색.
 * - `md` = `type=모바일`: 16(`Label/lg` / `Label/lg-emphasized`), 44h(`271:1225`·`271:1226`).
 * - `lg` = `type=데스크탑`: 20(`Heading/md` / `Heading/md - emphasized`). Figma는 선택 48h·미선택 44h인데
 *   한 줄에서 밑줄 높이가 달라지지 않게 48 하나로 맞춘다(`657:2012`·`657:2014`).
 * - 미선택 대비(#B8B7B3 on 흰색 2.01:1)는 디자이너 확인 중(design-system §5) — Figma 값대로 둔다.
 */
export const tab = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: 0,
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'transparent',
    color: vars.color.interaction.inactive,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    selectors: {
      '&[data-state="active"]': {
        color: vars.color.text.primaryLabel,
        borderBottomColor: vars.color.text.primaryLabel,
      },
      '&:focus-visible': { outline: `2px solid ${vars.color.brand.primary}`, outlineOffset: 2 },
      '&:disabled': { cursor: 'not-allowed', color: vars.color.interaction.disabledText },
    },
  },
  variants: {
    size: {
      md: [
        typography.labelLg,
        {
          height: 44,
          selectors: {
            '&[data-state="active"]': selectedWeight(typographySpecs.labelLgEmphasized),
          },
        },
      ],
      lg: [
        typography.headingMd,
        {
          height: 48,
          selectors: {
            '&[data-state="active"]': selectedWeight(typographySpecs.headingMdEmphasized),
          },
        },
      ],
    },
  },
  defaultVariants: { size: 'md' },
});

export const panel = style({ outline: 'none' });
