import type { ReactNode } from 'react';

import * as s from './Loader.css';

export type SpinnerProps = {
  /** sm 16(Button sm·md), md 24(Button lg·화면 로딩) */
  size?: 'sm' | 'md';
  /** 주면 role="status" + 이름. 버튼 안처럼 다른 곳이 상태를 알리면 비운다(장식) */
  label?: string;
  className?: string;
};

/** 색은 currentColor — 놓인 곳의 글자색을 따른다. 훅이 없어 서버 컴포넌트에서도 쓴다 */
export function Spinner({ size = 'sm', label, className }: SpinnerProps) {
  const a11y = label
    ? { role: 'status' as const, 'aria-label': label }
    : { 'aria-hidden': true as const };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={[s.spinner, s.spinnerSize[size], className].filter(Boolean).join(' ')}
      {...a11y}
    >
      <circle className={s.track} cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 화면(또는 영역) 로딩. `<AsyncBoundary pending={<ScreenLoader />}>`의 기본값이다.
 * `fullScreen`이면 화면 높이를 채운다(게이트 등).
 */
export function ScreenLoader({
  label = '불러오는 중',
  fullScreen,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  return (
    <div className={[s.screen, fullScreen && s.screenFull].filter(Boolean).join(' ')}>
      <Spinner size="md" label={label} />
    </div>
  );
}

/**
 * Button 로딩 상태용 내용물. 라벨 폭을 유지한 채 스피너를 겹친다.
 * `Button loading`이 안에서 쓴다. Button이 아닌 버튼 모양 요소에서는 직접 감싼다.
 */
export function LoadingLabel({
  loading,
  size = 'sm',
  children,
}: {
  loading?: boolean;
  size?: 'sm' | 'md';
  children: ReactNode;
}) {
  if (!loading) return <>{children}</>;
  return (
    <span className={s.loadingLabel}>
      <span className={s.hiddenLabel}>{children}</span>
      <Spinner size={size} className={s.overlaySpinner} />
    </span>
  );
}
