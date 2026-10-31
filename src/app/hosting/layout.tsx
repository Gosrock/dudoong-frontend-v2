import { type ReactNode, Suspense } from 'react';

import { HostingShell } from '@/features/hosting/shell/HostingShell';
import { LoginGate } from '@/features/shared/auth/LoginGate';

/**
 * 호스팅 센터. 관객 보호 화면과 같은 로그인 게이트(P4a)를 쓰고, 게이트 안에 호스팅 셸(P4s-V — PC 상단 바 / 모바일 로고 헤더 + 드로어)을 둔다.
 * 공연 안 3단(사이드바 268 + 가운데 + 우측 패널)은 `events/[eventId]/layout.tsx`의 `EventScopeView`.
 */
export default function HostingLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <LoginGate>
        <HostingShell>{children}</HostingShell>
      </LoginGate>
    </Suspense>
  );
}
