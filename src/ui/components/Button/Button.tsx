import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { LoadingLabel } from '../Loader/Loader';
import { button } from './Button.css';
import { KakaoSymbol } from './KakaoSymbol';

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /**
   * Figma `Color` — Primary · Secondary · primary 2(`tonal`) · Warning(`warning`, 위험 동작 확인). `dark`는 화면 덮어쓰기.
   * `kakao` = 카카오 로그인 버튼(카카오 공식 가이드 — 노란 배경 · 심볼 자동 · 45h · 모서리 6, `size` 무시). 로그인으로 가는 버튼에만, 문구는 "카카오 로그인"
   */
  variant?: 'primary' | 'secondary' | 'tonal' | 'warning' | 'dark' | 'kakao';
  size?: 'sm' | 'md' | 'lg';
  /** 앱이 정하는 선택 상태(Secondary). Hover·Pressed·Disabled는 CSS 상태다(design-system §4) */
  selected?: boolean;
  fullWidth?: boolean;
  /** 원형 34 아이콘 버튼(대시보드 머리 연필 `727:23261`) — 아이콘만 쓴다. `size`는 무시된다 */
  round?: boolean;
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
  round,
  icon,
  loading,
  disabled,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  // 카카오 로그인 버튼은 심볼 없이 만들 수 없다(가이드) — 아이콘을 따로 주지 않으면 심볼을 넣는다
  const lead = variant === 'kakao' && !icon ? <KakaoSymbol /> : icon;
  const iconOnly = Boolean(lead) && !children && !round;
  const iconText = Boolean(lead) && Boolean(children) && !round;
  return (
    <button
      type={type}
      data-selected={selected ? 'true' : undefined}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        button({ variant, size, iconOnly, iconText, round, fullWidth, loading }),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <LoadingLabel loading={loading} size={size === 'lg' ? 'md' : 'sm'}>
        {lead}
        {children}
      </LoadingLabel>
    </button>
  );
}
