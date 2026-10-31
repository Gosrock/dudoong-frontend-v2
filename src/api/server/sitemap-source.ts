import 'server-only';

import { QueryClient } from '@tanstack/react-query';

import { log } from '@/utils/log';

import { ApiError } from '../errors';
import { eventDetailQuery } from '../event/queries';
import { EventListPageSchema } from '../event/schema';
import { api } from '../http';

/**
 * `sitemap.xml`의 원천(이슈 #8). 공개 GET만, 토큰 없이, 캐시 없이(요청마다 조회 — tech-decisions §2).
 *
 * - 공연: GP-2 `includePast=false`(종료 전 OPEN 공연 = 진행 중 + 시작 전). 백엔드 최대 크기 50(`V2Paging.MAX_SIZE`)으로
 *   `hasNext`가 false일 때까지 넘긴다. `MAX_PAGES`로 상한을 둔다(요청마다 백엔드를 부르므로).
 * - 호스트: 공개 호스트 목록 API가 없고 GP-2 항목에는 `hostId`가 없다(`hostName`만) — 공연마다 GP-3을 불러 `host.hostId`를 모은다.
 *   GP-2에 `hostId`가 생기면 이 단계를 지운다(backend-questions).
 * - 수정일: GP-2·GP-3에 수정 시각 필드가 없어 `lastModified`를 넣지 않는다(이슈 #8 "없으면 생략").
 */

/** 백엔드 `V2Paging.MAX_SIZE`(GP-2 `@Max`) */
const PAGE_SIZE = 50;
/** 50 × 40 = 2,000개. 넘으면 그 뒤는 빠진다 — 그때 `generateSitemaps`로 나눈다 */
export const MAX_PAGES = 40;
/** GP-3 동시 호출 수 */
const CONCURRENCY = 5;

export type SitemapEvent = { eventId: number; hostId: number | null };

export async function upcomingEventIds(): Promise<number[]> {
  const ids: number[] = [];
  let truncated = true;
  for (let page = 0; page < MAX_PAGES; page++) {
    const searchParams = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    const res = await api.get('events', EventListPageSchema, { public: true, searchParams });
    ids.push(...res.content.map((e) => e.eventId));
    if (!res.hasNext) {
      truncated = false;
      break;
    }
  }
  // 상한에 닿으면 그 뒤 공연이 빠진다 — 조용히 넘기지 않고 남긴다(그때 generateSitemaps로 나눈다)
  if (truncated) log('warn', 'sitemap.events_truncated', { resource: 'events', count: ids.length });
  // 페이지 사이에 공연이 끼면 같은 공연이 다음 페이지에 다시 나온다
  return [...new Set(ids)];
}

/**
 * 공연마다 GP-3으로 호스트를 찾는다. 404(그 사이 준비중·삭제)면 공연도 뺀다(상세가 404라서).
 * 그 밖의 실패는 그 공연의 호스트만 빠지고 공연 주소는 그대로 넣는다.
 */
export async function withHosts(eventIds: number[]): Promise<SitemapEvent[]> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const results: (SitemapEvent | null)[] = new Array(eventIds.length).fill(null);
  let failedTotal = 0;
  let next = 0;
  // 작업 풀 — CONCURRENCY개가 동시에 돌고, 하나가 끝나면 바로 다음을 꺼낸다(느린 요청 하나가 묶음 전체를 붙잡지 않게)
  const worker = async () => {
    while (next < eventIds.length) {
      const index = next++;
      const eventId = eventIds[index]!;
      try {
        const detail = await client.fetchQuery(eventDetailQuery(eventId));
        results[index] = { eventId, hostId: detail.host.hostId };
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) continue;
        failedTotal++;
        results[index] = { eventId, hostId: null };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, eventIds.length) }, worker));
  // id는 남기지 않는다(tech-decisions §13)
  if (failedTotal) {
    log('warn', 'sitemap.host_lookup_failed', { resource: 'events', count: failedTotal });
  }
  return results.filter((r) => r !== null);
}
