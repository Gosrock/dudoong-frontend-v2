import type { Metadata } from 'next';

import { EventListView } from '@/features/audience/home/EventListView';

export const metadata: Metadata = { title: '공연 둘러보기' };

/**
 * 공연 리스트(GP-2 + GE-11). 게이트 없는 `(app)` 화면 — 서버에서 조회하지 않고 브라우저 `useQuery` 계열만 쓴다
 * (tech-decisions §3). 필터는 주소 쿼리(`?keyword=&tagIds=&includePast=`)이고, `useSearchParams`는 `(app)` 레이아웃의
 * `<Suspense>` 안에서 읽는다.
 */
export default function EventListPage() {
  return <EventListView />;
}
