import type { CSSProperties } from 'react';

import { badge } from './Badge.css';

export type BadgeProps = {
  /** large = 숫자, small = 점 */
  size?: 'large' | 'small';
  /** large의 숫자. `max`를 넘으면 `${max}+` */
  count?: number;
  /** 기본 99 */
  max?: number;
  /**
   * 스크린리더 이름. 배지는 보통 옆 글자("알림", "태그")를 꾸미므로 기본은 숨김(aria-hidden).
   * 배지만으로 뜻을 전할 때 준다 — 예: "새 알림 3개"
   */
  label?: string;
  className?: string;
  style?: CSSProperties;
};

export const formatBadgeCount = (count: number, max = 99) =>
  count > max ? `${max}+` : String(count);

/** Figma Badge. 알림 수(large)와 새 소식 점(small). 훅이 없어 서버 컴포넌트에서도 쓴다. */
export function Badge({
  size = 'large',
  count = 0,
  max = 99,
  label,
  className,
  style,
}: BadgeProps) {
  const a11y = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true };
  return (
    <span
      className={className ? `${badge({ size })} ${className}` : badge({ size })}
      style={style}
      data-size={size}
      {...a11y}
    >
      {size === 'large' ? formatBadgeCount(count, max) : null}
    </span>
  );
}
