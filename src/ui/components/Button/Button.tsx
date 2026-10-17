import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { button } from './Button.css';

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  variant?: 'primary' | 'secondary' | 'tonal';
  size?: 'sm' | 'md' | 'lg';
  /** 앱이 정하는 선택 상태(Secondary). Hover·Pressed·Disabled는 CSS 상태다(design-system §4) */
  selected?: boolean;
  fullWidth?: boolean;
  /** 앞쪽 아이콘. 아이콘만 있으면 aria-label을 준다 */
  icon?: ReactNode;
  children?: ReactNode;
};

export function Button({
  variant,
  size,
  selected,
  fullWidth,
  icon,
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
      className={[button({ variant, size, iconOnly, fullWidth }), className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
