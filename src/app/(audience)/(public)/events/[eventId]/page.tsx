import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { eventDetailQuery, eventSectionsQuery } from '@/api/event/queries';
import { Prefetch } from '@/api/server/Prefetch';
import { requestOrigin } from '@/api/server/request-origin';
import { serverQuery } from '@/api/server/serverQuery';
import { EventDetailView } from '@/features/audience/event/EventDetail/EventDetailView';
import { parseEventIdParam } from '@/features/audience/event/model/event-id';
import { eventMetadata } from '@/features/audience/event/model/event-metadata';
import { eventPageUrl } from '@/features/audience/event/model/event-summary';

/** 서버 조회 페이지는 페이지마다 instant=false를 둔다(tech-decisions §2). 이 위에 Suspense·loading.tsx를 두지 않는다(404 상태 코드). */
export const instant = false;

type Props = { params: Promise<{ eventId: string }> };

async function readEventId(params: Props['params']) {
  const eventId = parseEventIdParam((await params).eventId);
  if (eventId === null) notFound();
  return eventId;
}

/**
 * OG는 `<head>`에 들어가야 한다(카카오 크롤러는 JS를 실행하지 않는다). 실제 카카오 UA는 Next 내장 크롤러 목록에 있어
 * 메타데이터를 스트리밍하지 않고 `<head>`에 넣는다(tech-decisions §2). 페이지와 같은 요청 QueryClient라 GP-3 조회는 한 번이다.
 * 없는·준비중 공연(404)은 `serverQuery`가 `notFound()`, 5xx는 throw(→ 크롤러 500).
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const eventId = await readEventId(params);
  const [event, origin] = await Promise.all([
    serverQuery(eventDetailQuery(eventId)),
    requestOrigin(),
  ]);
  return eventMetadata(event, eventPageUrl(origin, eventId));
}

/** 공연 상세(GP-3 + GE-5). 재고(GP-5)는 서버에서 부르지 않는다 — 티켓 선택(P6)이 브라우저에서 읽는다. */
export default async function EventDetailPage({ params }: Props) {
  const eventId = await readEventId(params);
  return (
    <Prefetch queries={[eventDetailQuery(eventId), eventSectionsQuery(eventId)]}>
      <EventDetailView eventId={eventId} />
    </Prefetch>
  );
}
