'use client';

import { Suspense } from '@suspensive/react';
import type { ReactNode } from 'react';

import {
  ErrorBoundary,
  type ErrorBoundaryProps,
  type ErrorFallbackProps,
} from '../ErrorBoundary/ErrorBoundary';
import { ScreenLoader } from '../Loader/Loader';

export type { ErrorFallbackProps };

export type AsyncBoundaryProps = Pick<
  ErrorBoundaryProps,
  'children' | 'shouldCatch' | 'holdOn' | 'resetKeys' | 'onReset' | 'onError'
> & {
  /** Suspense 대기 화면. `holdOn` 에러일 때도 이것을 계속 보인다. 기본 `<ScreenLoader />` */
  pending?: ReactNode;
  /** 에러 화면. 기본은 문구 + [다시 시도] */
  rejected?: (props: ErrorFallbackProps) => ReactNode;
};

/**
 * 데이터 경계(patterns §4-3): `ErrorBoundary`(suspensive + QueryErrorResetBoundary) + `Suspense`(suspensive).
 * `useSuspenseQuery`를 쓰는 **클라이언트 조회 화면**의 경계다. `(public)` 서버 조회 라우트(페이지·레이아웃)에는 두지 않는다 —
 * Suspense가 404 상태 코드를 깨뜨린다(CLAUDE.md, patterns §6).
 *
 * ```tsx
 * <AsyncBoundary holdOn={isSessionLost} rejected={HostingAccessRejected} resetKeys={[id]}>
 *   <Screen />
 * </AsyncBoundary>
 * ```
 */
export function AsyncBoundary({
  children,
  pending = <ScreenLoader />,
  rejected,
  ...errorProps
}: AsyncBoundaryProps) {
  return (
    <ErrorBoundary {...errorProps} fallback={rejected} holdFallback={pending}>
      <Suspense fallback={pending}>{children}</Suspense>
    </ErrorBoundary>
  );
}
