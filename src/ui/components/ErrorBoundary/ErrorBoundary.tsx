'use client';

import { ErrorBoundary as BaseErrorBoundary } from '@suspensive/react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { Button } from '../Button/Button';
import { EmptyState } from '../EmptyState/EmptyState';

/**
 * 묶음 재시도 — 안의 모든 `ErrorBoundary`를 한 번에 푼다(`useErrorBoundaryGroup().reset()`·`<ErrorBoundaryGroup.Consumer>`).
 * 경계를 넘나드는 에러 보고는 `useErrorBoundary().setError(e)`, fallback 안에서 props 대신 `useErrorBoundaryFallbackProps()`.
 * 모두 `@suspensive/react` 그대로다(patterns §4-3).
 */
export {
  ErrorBoundaryGroup,
  useErrorBoundary,
  useErrorBoundaryFallbackProps,
  useErrorBoundaryGroup,
} from '@suspensive/react';

export type ErrorFallbackProps = { error: unknown; reset: () => void };

/** 에러 판별 술어. `src/ui`는 도메인 에러를 모르므로 features가 넘긴다(예: `isSessionLost`, `isLocalBoundaryError`) */
export type ErrorPredicate = (error: unknown) => boolean;

export type ErrorBoundaryProps = {
  children: ReactNode;
  /** 에러 화면. 기본은 문구 + [다시 시도] */
  fallback?: (props: ErrorFallbackProps) => ReactNode;
  /**
   * 이 경계가 잡을 에러. false인 에러는 **부모 경계로** 올라간다(suspensive `shouldCatch`). 기본은 모두 잡는다.
   * 화면 섹션 경계가 403·404를 라우트 경계(공용 화면)에 넘길 때 `isLocalBoundaryError`(`src/api/errors.ts`)를 넘긴다.
   */
  shouldCatch?: ErrorPredicate;
  /**
   * 잡되 에러 화면 없이 `holdFallback`을 계속 보일 에러(재시도 UI도 없다). `SessionLostError`용 — 곧 로그인 화면으로 이동하므로
   * 에러 화면을 깜빡이지 않는다(patterns §5-1). `shouldCatch`보다 먼저 본다.
   */
  holdOn?: ErrorPredicate;
  /** `holdOn` 에러일 때 보일 것. 기본 `null`(`AsyncBoundary`는 `pending`) */
  holdFallback?: ReactNode;
  /** 이 값들이 바뀌면 에러 상태를 풀고 다시 그린다(경로·id 변경 등). 얕은 비교 */
  resetKeys?: readonly unknown[];
  /** 재시도(fallback의 `reset`·`resetKeys`·그룹 reset) 때 쿼리 에러 초기화 뒤에 부른다 */
  onReset?: () => void;
  /** 에러를 잡았을 때(로그 등) */
  onError?: (error: unknown) => void;
};

/**
 * 에러 경계(patterns §4-3) — `@suspensive/react`의 `ErrorBoundary` + TanStack `QueryErrorResetBoundary`.
 * [다시 시도](`reset`)는 이 경계 안에서 실패한 쿼리의 에러 상태를 풀고(`QueryErrorResetBoundary.reset`) 자식을 다시 그려 재조회한다.
 * Suspense까지 함께 두려면 `AsyncBoundary`.
 */
export function ErrorBoundary({
  children,
  fallback = DefaultErrorFallback,
  shouldCatch,
  holdOn,
  holdFallback = null,
  resetKeys,
  onReset,
  onError,
}: ErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset: resetQueries }) => (
        <BaseErrorBoundary
          shouldCatch={(error: Error) =>
            Boolean(holdOn?.(error)) || (shouldCatch ? shouldCatch(error) : true)
          }
          onReset={() => {
            resetQueries();
            onReset?.();
          }}
          onError={onError}
          resetKeys={resetKeys ? [...resetKeys] : undefined}
          fallback={({ error, reset }) =>
            holdOn?.(error) ? holdFallback : fallback({ error, reset })
          }
        >
          {children}
        </BaseErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

/** 기본 지역 fallback — 문구 + [다시 시도] */
export function DefaultErrorFallback({ reset }: ErrorFallbackProps) {
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
