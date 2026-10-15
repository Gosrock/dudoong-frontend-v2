import type { ReactNode } from 'react';

/** 로그인 게이트 자리(P4a). 세션이 확정된 뒤에만 children을 그린다. */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
