'use client';

import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Component, type ReactNode, Suspense } from 'react';

import { Button } from '../Button/Button';
import { EmptyState } from '../EmptyState/EmptyState';
import { ScreenLoader } from '../Loader/Loader';

export type AsyncBoundaryRejectedProps = { error: unknown; reset: () => void };

export type AsyncBoundaryProps = {
  children: ReactNode;
  /** Suspense 대기 화면. 기본 `<ScreenLoader />` */
  pending?: ReactNode;
  /** 에러 화면. 기본은 문구 + [다시 시도] */
  rejected?: (props: AsyncBoundaryRejectedProps) => ReactNode;
  /**
   * true를 돌려주는 에러는 에러 화면을 그리지 않고 `pending`을 계속 보인다.
   * `SessionLostError`용 — 곧 로그인 화면으로 이동하므로 에러 화면을 깜빡이지 않는다(patterns §5-1).
   * src/ui는 src/api를 import할 수 없어 features가 `(e) => e instanceof SessionLostError`를 넘긴다.
   */
  ignoreError?: (error: unknown) => boolean;
  /** 이 값들이 바뀌면 에러 상태를 풀고 다시 그린다(경로·id 변경 등). 얕은 비교 */
  resetKeys?: readonly unknown[];
};

/**
 * 데이터 경계(patterns §4-3): QueryErrorResetBoundary + 에러 경계 + Suspense.
 * [다시 시도]는 쿼리 에러 상태를 풀고(QueryErrorResetBoundary.reset) 자식을 다시 그려 재조회한다.
 */
export function AsyncBoundary({
  children,
  pending = <ScreenLoader />,
  rejected = DefaultRejected,
  ignoreError,
  resetKeys,
}: AsyncBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          resetKeys={resetKeys}
          fallback={(props) => (ignoreError?.(props.error) ? pending : rejected(props))}
        >
          <Suspense fallback={pending}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function DefaultRejected({ reset }: AsyncBoundaryRejectedProps) {
  return (
    <div role="alert">
      <EmptyState
        title="불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요."
        action={
          <Button variant="secondary" onClick={reset}>
            다시 시도
          </Button>
        }
      />
    </div>
  );
}

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback: (props: AsyncBoundaryRejectedProps) => ReactNode;
  onReset?: () => void;
  resetKeys?: readonly unknown[];
};
type ErrorBoundaryState = { error: unknown; hasError: boolean };

const changed = (a: readonly unknown[] = [], b: readonly unknown[] = []) =>
  a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));

/** 라이브러리 없이 둔 작은 에러 경계. 에러 값이 falsy여도 동작하게 hasError를 따로 둔다 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, hasError: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error, hasError: true };
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.hasError && changed(prev.resetKeys, this.props.resetKeys)) this.reset();
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ error: null, hasError: false });
  };

  render() {
    if (this.state.hasError)
      return this.props.fallback({ error: this.state.error, reset: this.reset });
    return this.props.children;
  }
}
