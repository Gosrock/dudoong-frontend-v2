'use client';

import type { ErrorFallbackProps } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { Button } from '@/ui/components/Button/Button';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { ForbiddenView } from '@/ui/components/ForbiddenView/ForbiddenView';
import { NotFoundView } from '@/ui/components/NotFoundView/NotFoundView';

import * as s from './HostingAccessRejected.css';
import {
  HOSTING_ACCESS_BACK,
  HOSTING_FORBIDDEN_COPY,
  hostingAccessOfError,
} from './model/hosting-access';

/**
 * 호스팅 센터 공용 403 안내(P2 `ForbiddenView`, 돌아갈 곳은 공연준비 홈). 역할 판정(`hostingAccessOfRole`)이 막을 때도 쓴다.
 * Figma(GUI·와이어)에 403 화면이 없다 — 빈 화면 배치(`EmptyState`) + 호스팅 문구(P10a-V, Figma 코멘트로 물음).
 */
export function HostingForbidden() {
  return (
    <div className={s.root} data-testid="hosting-forbidden">
      <ForbiddenView
        title={HOSTING_FORBIDDEN_COPY.title}
        description={HOSTING_FORBIDDEN_COPY.description}
        href={HOSTING_ACCESS_BACK.href}
        actionLabel={HOSTING_ACCESS_BACK.label}
      />
    </div>
  );
}

/** 호스팅 센터 공용 404 안내(없는·남의 리소스, 주소의 id가 숫자가 아닐 때) */
export function HostingNotFound() {
  return (
    <div className={s.root} data-testid="hosting-not-found">
      <NotFoundView href={HOSTING_ACCESS_BACK.href} actionLabel={HOSTING_ACCESS_BACK.label} />
    </div>
  );
}

/**
 * 호스팅 센터 하위 화면의 `<AsyncBoundary rejected={HostingAccessRejected}>`. 조회 에러를 판정해 403 → 공용 403 안내,
 * 404 → 공용 404 안내, 그 밖 → 다시 시도(patterns §11).
 */
export function HostingAccessRejected({ error, reset }: ErrorFallbackProps) {
  const access = hostingAccessOfError(error);
  if (access === 'forbidden') return <HostingForbidden />;
  if (access === 'notFound') return <HostingNotFound />;
  return (
    <div className={s.root} role="alert">
      <EmptyState
        description="불러오지 못했어요. 잠시 후 다시 시도해 주세요."
        action={
          <Button variant="secondary" size="md" onClick={reset}>
            다시 시도
          </Button>
        }
      />
    </div>
  );
}
