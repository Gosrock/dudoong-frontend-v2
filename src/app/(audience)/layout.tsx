import type { ReactNode } from 'react';

/** 관객 공통 헤더 자리. 헤더(Figma Top app bar)는 P2 `Header`, 셸은 P5a에서 만든다. */
export default function AudienceLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
