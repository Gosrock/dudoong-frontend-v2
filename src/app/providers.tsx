'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { getQueryClient } from '@/api/query-client';

/** 루트 셸 클라이언트 파일(tech-decisions §8). 인증 핸들러 등록·overlay-kit은 P2·P4a에서 붙인다. */
export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
