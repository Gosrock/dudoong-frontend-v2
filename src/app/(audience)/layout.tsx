import type { ReactNode } from 'react';

import { AudienceShell } from '@/features/audience/shell/AudienceShell';

/**
 * 관객 셸(P4s-V) — 모바일 로고 헤더 + 햄버거 / PC 상단 바. 셸은 서버에서 조회하지 않고 children 위에 Suspense를 두지 않는다
 * (`(public)` 404 상태 코드 유지, tech-decisions §2).
 */
export default function AudienceLayout({ children }: { children: ReactNode }) {
  return <AudienceShell>{children}</AudienceShell>;
}
