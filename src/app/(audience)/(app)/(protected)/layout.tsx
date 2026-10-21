import type { ReactNode } from 'react';

import { LoginGate } from '@/features/shared/auth/LoginGate';

/**
 * 보호 화면. 로그인 게이트가 세션을 확정한 뒤에만 children을 그린다(tech-decisions §4 인증).
 * 서버에서 쿠키로 막지 않는다 — 운영 쿠키가 SameSite=Strict라 외부 링크의 첫 요청에는 쿠키가 없다(§25).
 */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <LoginGate>{children}</LoginGate>;
}
