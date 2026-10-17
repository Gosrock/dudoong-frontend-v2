'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { OverlayProvider } from 'overlay-kit';
import type { ReactNode } from 'react';

import { getQueryClient } from '@/api/query-client';

/** 루트 셸 클라이언트 파일(tech-decisions §8). 인증 핸들러 등록은 P4a, OverlayRouteReset은 P2에서 붙인다. */
export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <OverlayProvider>{children}</OverlayProvider>
    </QueryClientProvider>
  );
}
