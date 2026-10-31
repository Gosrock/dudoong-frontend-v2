import { type ReactNode, Suspense } from 'react';

import { LoginGate } from '@/features/shared/auth/LoginGate';

/**
 * 호스팅 센터. 관객 보호 화면과 같은 로그인 게이트(P4a)를 쓴다.
 * 데스크탑 사이드바 · 모바일 헤더(gui-screens §3)는 P10a에서 붙는다.
 */
export default function HostingLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <LoginGate>{children}</LoginGate>
    </Suspense>
  );
}
