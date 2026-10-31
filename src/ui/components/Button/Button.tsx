import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { LoadingLabel } from '../Loader/Loader';
import { button } from './Button.css';

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  variant?: 'primary' | 'secondary' | 'tonal' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  /** 앱이 정하는 선택 상태(Secondary). Hover·Pressed·Disabled는 CSS 상태다(design-system §4) */
  selected?: boolean;
  fullWidth?: boolean;
  /** 앞쪽 아이콘. 아이콘만 있으면 aria-label을 준다 */
  icon?: ReactNode;
  /** 진행 중 — 라벨 폭을 유지한 채 스피너를 겹치고 누를 수 없게 한다(접근성 이름은 유지) */
  loading?: boolean;
  children?: ReactNode;
};

export function Button({
  variant,
  size,
  selected,
  fullWidth,
  icon,
  loading,
  disabled,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const iconOnly = Boolean(icon) && !children;
  return (
    <button
      type={type}
      data-selected={selected ? 'true' : undefined}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[button({ variant, size, iconOnly, fullWidth, loading }), className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <LoadingLabel loading={loading} size={size === 'lg' ? 'md' : 'sm'}>
        {icon}
        {children}
      </LoadingLabel>
    </button>
  );
}
