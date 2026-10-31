'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useSyncExternalStore } from 'react';

import { hasSessionLostFired } from '@/api/auth-handlers';
import { isSessionLost } from '@/api/errors';
import { meQuery } from '@/api/me/queries';
import {
  AsyncBoundary,
  type ErrorFallbackProps,
} from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { Button } from '@/ui/components/Button/Button';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { Skeleton, SkeletonText } from '@/ui/components/Skeleton/Skeleton';
import { Container } from '@/ui/primitives/Container';
import { Flex } from '@/ui/primitives/Flex';

import { browserLocation } from './browser-location';
import { loginHref } from './login-href';
import * as s from './LoginGate.css';
import { PROTECTED_AREA_ATTR, useProtectedArea } from './protected-area';

/**
 * 로그인 게이트(tech-decisions §4 인증 표 "게이트", plan P4a). `(protected)` 레이아웃과 `hosting` 레이아웃이 children을 감싼다.
 * - pending: 스켈레톤. **세션이 확정되기 전에는 children을 그리지 않는다** — 보호 화면의 쿼리가 게이트보다 먼저 나가지 않는다
 * - `null`(익명): 언제나 `/login?redirect=…`로 replace. 세션이 있다가 `null`이 됐으면 이동 전에 캐시를 비운다
 *   (`/login/expired`로는 보내지 않는다 — 그건 `onSessionLost`만 한다. 세션 상실이 이미 시작됐으면 이동을 그쪽에 맡긴다)
 * - error(GM-1 5xx·네트워크, 재발급 일시 오류): children 대신 전체 화면 재시도. 이동하지 않는다
 * - 세션: children. 배경 재조회가 실패해도(데이터가 있으면) children을 그대로 둔다
 *
 * 서버 렌더에서는 조회하지 않는다(`useQuery`) — 쿠키가 없는 서버가 GM-1을 부르지 않는다. 서버에서도 쿠키로 막지 않는다(§25).
 */
export function LoginGate({ children }: { children: ReactNode }) {
  useProtectedArea();
  return (
    <AsyncBoundary pending={<GateSkeleton />} rejected={GateRejected} holdOn={isSessionLost}>
      <GateContent>{children}</GateContent>
    </AsyncBoundary>
  );
}

const noopSubscribe = () => () => {};

/**
 * 하이드레이션 중이면 false. 서버 HTML은 언제나 스켈레톤이라(서버는 GM-1을 부르지 않는다) 하이드레이션 때도 스켈레톤을 그려야 맞는다.
 * 게이트 위(셸 — P4s-V)가 GM-1을 먼저 받아 두면 게이트가 하이드레이션 때 바로 children을 그려 서버 HTML과 어긋나고,
 * 빌드에서 게이트 경계가 dehydrated로 남아 본문이 그려지지 않았다(implementation-log P4s-V). 클라이언트 이동에서는 처음부터 true
 */
const useHydrated = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

function GateContent({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data } = useQuery({
    ...meQuery(),
    // 데이터가 없을 때의 실패만 경계로 던진다(재시도 화면). 배경 재조회 실패는 화면을 바꾸지 않는다
    throwOnError: (_error, query) => query.state.data === undefined,
  });
  const hadSession = useRef(false);

  useEffect(() => {
    if (data) {
      hadSession.current = true;
      return;
    }
    if (data !== null || hasSessionLostFired()) return;
    if (hadSession.current) queryClient.clear();
    router.replace(loginHref(browserLocation.currentPath()));
  }, [data, queryClient, router]);

  return hydrated && data ? children : <GateSkeleton />;
}

/** 세션 확인 중. 화면 모양을 모르므로 제목·본문 줄 정도의 일반 자리표시 */
function GateSkeleton() {
  return (
    <div
      role="status"
      aria-label="로그인 확인 중"
      aria-busy
      className={s.fullScreen}
      {...{ [PROTECTED_AREA_ATTR]: '' }}
    >
      <Container>
        <Flex direction="column" gap={4} paddingY={6} fullWidth>
          <Skeleton shape="text" height={24} width="40%" />
          <SkeletonText lines={3} />
          <Skeleton height={160} />
        </Flex>
      </Container>
    </div>
  );
}

/** `AsyncBoundary`의 기본 재시도 화면과 같은 문구·동작을 전체 화면으로 */
function GateRejected({ reset }: ErrorFallbackProps) {
  return (
    <Flex align="center" justify="center" className={s.fullScreen}>
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
    </Flex>
  );
}
