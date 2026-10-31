import type { CSSProperties, ReactNode } from 'react';

import { chip, type ChipColor, type ChipTheme } from './Chip.css';

export type { ChipColor, ChipTheme };

export type ChipProps = {
  /** sm 22h(기본) · lg 25h */
  size?: 'sm' | 'lg';
  /** Figma `variant` — square 모서리 8(기본) · round 알약 */
  shape?: 'square' | 'round';
  /** 기본 grey */
  color?: ChipColor;
  /** weak 옅은 배경(기본) · fill 진한 배경 · border 테두리만 */
  theme?: ChipTheme;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/** 옵션 추가 금액 표기 — Figma "+ N 원" */
export const formatOptionAmount = (amount: number) =>
  `${amount < 0 ? '-' : '+'} ${Math.abs(amount).toLocaleString('ko-KR')}원`;

/** 공연 D-day 글자. 0이면 "D-day"(design-system §3 "없는 상태"), 지난 날은 "D+n" */
export const formatDday = (dDay: number) =>
  dDay === 0 ? 'D-day' : dDay > 0 ? `D-${dDay}` : `D+${-dDay}`;

/**
 * Figma `tag_v2` 범용 칩. 모양만 고른다 — 서버 상태(티켓 상태, 공연 단계 등) → 색은 쓰는 Phase가 정한다
 * (옛 Tag 5종의 색 대응은 design-system §3 "옛 Tag → tag_v2"). 훅이 없어 서버 컴포넌트에서도 쓴다.
 */
export function Chip({
  size = 'sm',
  shape = 'square',
  color = 'grey',
  theme = 'weak',
  children,
  className,
  style,
}: ChipProps) {
  const cls = chip({ size, shape, color, theme });
  return (
    <span
      className={className ? `${cls} ${className}` : cls}
      style={style}
      data-color={color}
      data-theme={theme}
    >
      {children}
    </span>
  );
}
