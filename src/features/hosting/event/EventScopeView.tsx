'use client';

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
import { EventMobileHeader, EventSidebar, ReadOnlyNotice } from './ui/EventScopeNav';

/**
 * `/hosting/events/[eventId]/…` 공연 스코프. 3단 틀(사이드바 268 자리 + 가운데)은 P4s-V `EventScopeFrame`,
 * PC 공연 사이드바·모바일 "대시보드 ▾ / 공연명" 헤더는 P11-V `ui/EventScopeNav`(활성 메뉴는 세그먼트 말단 + 자체 Suspense). 주소의 id가 숫자가 아니면 요청 없이 공용 404,
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
    <EventScopeFrame sidebar={<EventSidebar scope={s} />}>
      <EventMobileHeader scope={s} />
      {s.readOnlyMessage && <ReadOnlyNotice message={s.readOnlyMessage} />}
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
