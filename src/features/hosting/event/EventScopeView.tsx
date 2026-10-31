'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { isSessionLost } from '@/api/errors';
import {
  HostingAccessRejected,
  HostingNotFound,
} from '@/features/hosting/access/HostingAccessRejected';
import { EventScopeFrame } from '@/features/hosting/shell/EventScopeFrame';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';

import { parseEventIdParam } from './model/event-scope';
import { useEventScope } from './model/useEventScope';

/**
 * `/hosting/events/[eventId]/…` 공연 스코프. 3단 틀(사이드바 268 자리 + 가운데)은 P4s-V `EventScopeFrame`, 사이드바 안은 아직
 * 스타일 없는 최소 마크업(P11-L). 공연 사이드바 본문·모바일 "대시보드 ▾ / 공연명" 헤더·
 * 활성 메뉴 표시(`usePathname` 말단 + 자체 Suspense)는 P11-V. 주소의 id가 숫자가 아니면 요청 없이 공용 404,
 * 비멤버는 공용 403, 없는·지운 공연은 공용 404(호스팅 센터는 서버 조회가 없어 상태 코드는 200).
 */
export function EventScopeView({ eventId, children }: { eventId: string; children: ReactNode }) {
  const id = parseEventIdParam(eventId);
  if (id === null) {
    return (
      <main>
        <HostingNotFound />
      </main>
    );
  }
  return (
    <AsyncBoundary holdOn={isSessionLost} rejected={HostingAccessRejected} resetKeys={[id]}>
      <EventScope eventId={id}>{children}</EventScope>
    </AsyncBoundary>
  );
}

function EventScope({ eventId, children }: { eventId: string; children: ReactNode }) {
  const s = useEventScope(eventId);
  return (
    <EventScopeFrame
      sidebar={
        <nav aria-label="공연 메뉴">
          <Link href="/hosting">‹ 내 공연</Link>
          <p data-testid="event-card">
            {s.event.name ?? '이름 없는 공연'} · {s.event.hostName}
            {s.event.dDay !== null && ` · D-${s.event.dDay}`}
          </p>
          <ul>
            {s.menu.map((m) => (
              <li key={m.key}>
                <Link href={m.href}>{m.label}</Link>
              </li>
            ))}
          </ul>
          {s.publicHref && <Link href={s.publicHref}>공연 페이지 보기</Link>}
        </nav>
      }
    >
      {s.readOnlyMessage && <p data-testid="read-only">{s.readOnlyMessage}</p>}
      <main>
        <AsyncBoundary
          holdOn={isSessionLost}
          rejected={HostingAccessRejected}
          resetKeys={[eventId]}
        >
          {children}
        </AsyncBoundary>
      </main>
    </EventScopeFrame>
  );
}
