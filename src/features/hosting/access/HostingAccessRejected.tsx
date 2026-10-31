'use client';

import type { ErrorFallbackProps } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { ForbiddenView } from '@/ui/components/ForbiddenView/ForbiddenView';
import { NotFoundView } from '@/ui/components/NotFoundView/NotFoundView';

import { HOSTING_ACCESS_BACK, hostingAccessOfError } from './model/hosting-access';

/** 호스팅 센터 공용 403 안내(P2 `ForbiddenView`, 돌아갈 곳은 공연준비 홈). 역할 판정(`hostingAccessOfRole`)이 막을 때도 쓴다 */
export function HostingForbidden() {
  return <ForbiddenView href={HOSTING_ACCESS_BACK.href} actionLabel={HOSTING_ACCESS_BACK.label} />;
}

/** 호스팅 센터 공용 404 안내(없는·남의 리소스, 주소의 id가 숫자가 아닐 때) */
export function HostingNotFound() {
  return <NotFoundView href={HOSTING_ACCESS_BACK.href} actionLabel={HOSTING_ACCESS_BACK.label} />;
}

/**
 * 호스팅 센터 하위 화면의 `<AsyncBoundary rejected={HostingAccessRejected}>`. 조회 에러를 판정해 403 → 공용 403 안내,
 * 404 → 공용 404 안내, 그 밖 → 다시 시도(patterns §11). 문구·모양은 P10a-V에서 정한다.
 */
export function HostingAccessRejected({ error, reset }: ErrorFallbackProps) {
  const access = hostingAccessOfError(error);
  if (access === 'forbidden') return <HostingForbidden />;
  if (access === 'notFound') return <HostingNotFound />;
  return (
    <div role="alert">
      <p>불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
      <button type="button" onClick={reset}>
        다시 시도
      </button>
    </div>
  );
}
