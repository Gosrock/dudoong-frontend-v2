import { styleVariants } from '@vanilla-extract/css';

import { vars } from './tokens.css';

type Spec = {
  font: 'body' | 'display' | 'number';
  size: number;
  weight: number;
  lineHeight: string;
  letterSpacing: string;
};

/**
 * Figma 텍스트 스타일 21개(design-system.md §1). 키는 Figma 이름을 정리한 것 — `Heading/md - emphasized` → `headingMdEmphasized`.
 * 크기·행간이 프리셋에 없으면 프리셋을 추가할지 먼저 본다(patterns §2).
 */
export const typographySpecs = {
  title: { font: 'display', size: 28, weight: 800, lineHeight: '130%', letterSpacing: '-0.01em' },
  titleNumber: {
    font: 'number',
    size: 28,
    weight: 700,
    lineHeight: '130%',
    letterSpacing: '-0.01em',
  },
  heading2xl: { font: 'body', size: 32, weight: 600, lineHeight: '130%', letterSpacing: '-0.01em' },
  headingXl: { font: 'body', size: 28, weight: 800, lineHeight: '130%', letterSpacing: '-0.01em' },
  headingLg: { font: 'body', size: 24, weight: 600, lineHeight: '130%', letterSpacing: '-0.01em' },
  headingLgEmphasized: {
    font: 'body',
    size: 24,
    weight: 700,
    lineHeight: '130%',
    letterSpacing: '-0.01em',
  },
  headingMd: { font: 'body', size: 20, weight: 400, lineHeight: '130%', letterSpacing: '-0.01em' },
  headingMdEmphasized: {
    font: 'body',
    size: 20,
    weight: 700,
    lineHeight: '130%',
    letterSpacing: '-0.01em',
  },
  headingMd2: { font: 'body', size: 18, weight: 400, lineHeight: '130%', letterSpacing: '-0.01em' },
  headingMd2Emphasized: {
    font: 'body',
    size: 18,
    weight: 700,
    lineHeight: '130%',
    letterSpacing: '-0.01em',
  },
  headingSm: { font: 'body', size: 16, weight: 500, lineHeight: '130%', letterSpacing: '-0.04em' },
  headingSmEmphasized: {
    font: 'body',
    size: 16,
    weight: 700,
    lineHeight: '130%',
    letterSpacing: '-0.04em',
  },
  bodyLg: { font: 'body', size: 16, weight: 400, lineHeight: '140%', letterSpacing: '-0.01em' },
  bodyMd: { font: 'body', size: 14, weight: 400, lineHeight: '140%', letterSpacing: '-0.01em' },
  bodySm: { font: 'body', size: 13, weight: 400, lineHeight: '140%', letterSpacing: '-0.01em' },
  labelLgEmphasized: {
    font: 'body',
    size: 16,
    weight: 700,
    lineHeight: '140%',
    letterSpacing: '-0.01em',
  },
  labelLg: { font: 'body', size: 16, weight: 400, lineHeight: '120%', letterSpacing: '-0.01em' },
  labelMd: { font: 'body', size: 14, weight: 500, lineHeight: '120%', letterSpacing: '-0.01em' },
  labelMdEmphasized: {
    font: 'body',
    size: 14,
    weight: 700,
    lineHeight: '120%',
    letterSpacing: '-0.01em',
  },
  labelSm: { font: 'body', size: 12, weight: 500, lineHeight: '120%', letterSpacing: '-0.01em' },
  labelXs: { font: 'body', size: 11, weight: 400, lineHeight: '120%', letterSpacing: '-0.01em' },
} as const satisfies Record<string, Spec>;

export type Typography = keyof typeof typographySpecs;

export const typography = styleVariants(typographySpecs, (s: Spec) => ({
  fontFamily: vars.font[s.font],
  fontSize: s.size,
  fontWeight: s.weight,
  lineHeight: s.lineHeight,
  letterSpacing: s.letterSpacing,
}));
