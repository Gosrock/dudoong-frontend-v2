import type { MetadataRoute } from 'next';

import { requestOrigin } from '@/api/server/request-origin';
import { upcomingEventIds, withHosts } from '@/api/server/sitemap-source';

/**
 * `/sitemap.xml`(이슈 #8) — 공연홈, 종료 전 공연 상세(`/events/{id}`), 그 공연들의 호스트 홈(`/hosts/{id}`).
 * 공개 호스트 목록 API가 없어 호스트는 종료 전 공연이 있는 호스트만 들어간다. 수정일 필드가 없어 `lastModified`는 넣지 않는다.
 * 주소는 요청 origin(`requestOrigin`, tech-decisions §12) — `headers()`를 읽어 요청마다 만든다(캐시 없음).
 * 백엔드가 실패하면 throw → 500(빈 sitemap을 내보내지 않는다 — 크롤러가 나중에 다시 읽는다).
 * URL은 한 파일 50,000개까지다. 공연 수 상한(`MAX_PAGES` × 50 = 2,000)을 넘기 전에 `generateSitemaps`로 나눈다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [origin, eventIds] = await Promise.all([requestOrigin(), upcomingEventIds()]);
  const events = await withHosts(eventIds);
  const hostIds = [...new Set(events.map((e) => e.hostId).filter((id) => id !== null))];
  return [
    { url: `${origin}/` },
    ...events.map((e) => ({ url: `${origin}/events/${e.eventId}` })),
    ...hostIds.map((id) => ({ url: `${origin}/hosts/${id}` })),
  ];
}
