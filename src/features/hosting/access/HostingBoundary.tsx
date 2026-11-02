'use client';

import { isSessionLost } from '@/api/errors';
import {
  AsyncBoundary,
  type AsyncBoundaryProps,
} from '@/ui/components/AsyncBoundary/AsyncBoundary';

import { HostingAccessRejected } from './HostingAccessRejected';

/**
 * 호스팅 센터 하위 화면의 데이터 경계(코드 패턴 점검 A26) — `AsyncBoundary` + 세션 상실은 잡지 않고 대기(`holdOn={isSessionLost}`,
 * 게이트가 처리) + 403 · 404 · 그 밖 판정(`HostingAccessRejected`). 화면마다 같은 세 prop을 쓰지 않는다.
 *
 * ```tsx
 * <HostingBoundary resetKeys={[eventId]}>
 *   <Screen />
 * </HostingBoundary>
 * ```
 */
export function HostingBoundary(props: Omit<AsyncBoundaryProps, 'holdOn' | 'rejected'>) {
  return <AsyncBoundary {...props} holdOn={isSessionLost} rejected={HostingAccessRejected} />;
}
