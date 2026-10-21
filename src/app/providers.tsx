'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { OverlayProvider } from 'overlay-kit';
import { type ReactNode, Suspense, useEffect } from 'react';

import { getQueryClient, setErrorNotifier } from '@/api/query-client';
import { registerAuth } from '@/features/shared/auth/register-auth';
import { toast, Toaster } from '@/ui/components/Toast/Toast';

import { OverlayRouteReset } from './OverlayRouteReset';

/**
 * 루트 셸 클라이언트 파일(tech-decisions §8). 인증 처리(401 재발급·세션 상실·storage·pageshow 감시)를 여기서 붙인다.
 * OverlayRouteReset은 children을 감싸지 않는 형제 자리에 자체 Suspense로 둔다 — children 위에 Suspense를 두면
 * `(public)` 서버 조회 라우트의 404 상태 코드가 깨진다(patterns §6).
 */
export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  // 전역 에러 토스트(patterns §4) — src/api는 ui를 import할 수 없어 여기서 주입한다. 브라우저에서만 등록
  useEffect(() => {
    setErrorNotifier((message, id) => toast(message, { id }));
    return () => setErrorNotifier(null);
  }, []);
  // 인증 핸들러 등록과 다른 탭·bfcache 감시(plan P4a). 경로는 읽지 않는다 — 보호 영역 여부는 게이트가 알린다
  useEffect(() => registerAuth(queryClient), [queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <OverlayProvider>
        {children}
        <Suspense fallback={null}>
          <OverlayRouteReset />
        </Suspense>
        <Toaster />
      </OverlayProvider>
    </QueryClientProvider>
  );
}
