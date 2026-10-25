import { http } from 'msw';

import type { EventSection } from '../event/schema';
import { v1SectionSamples } from './fixtures/v1-sections';
import { errors, fail, hasAccessToken, ok } from './respond';

/**
 * 공연 상세(P5b) 시나리오별 핸들러 세트. 기본 목록(`handlers.ts`)에는 넣지 않고 테스트에서 앞에 끼운다
 * (`server.use(...)` / e2e `mockApi.use(...)`). 공연 id를 받아 그 공연의 응답만 바꾼다.
 */

const detailPath = (eventId: number) => `*/api/v2/events/${eventId}`;
const sectionsPath = (eventId: number) => `*/api/v2/events/${eventId}/sections`;

/** 섹션 10개(서버 상한) — v1 실데이터 샘플을 돌려 쓴다. RSS 측정·e2e용 */
export function tenSections(): EventSection[] {
  const samples = Object.values(v1SectionSamples);
  return Array.from({ length: 10 }, (_, i) => ({
    sectionId: 9100 + i,
    title: `섹션 ${i + 1}`,
    content: samples[i % samples.length]!.content,
    contentFormat: i % 2 === 0 ? 'HTML' : 'MARKDOWN',
    sortOrder: i,
  }));
}

export const eventDetailHandlers = {
  /** 서버 섹션 없음 → 기본 4탭 */
  noSections: (eventId: number) => [http.get(sectionsPath(eventId), () => ok([]))],
  /** 섹션 10개(v1 실데이터 본문) */
  tenSections: (eventId: number) => [http.get(sectionsPath(eventId), () => ok(tenSections()))],
  /** 섹션 본문에 XSS 페이로드 */
  xssSection: (eventId: number) => [
    http.get(sectionsPath(eventId), () =>
      ok([
        {
          sectionId: 9201,
          title: '공연 소개',
          content:
            '<p>안전한 글</p><img src="x" onerror="window.__xss=1"><script>window.__xss=2</script>',
          contentFormat: 'HTML',
          sortOrder: 0,
        },
      ] satisfies EventSection[]),
    ),
  ],
  /** GP-3 5xx */
  detailServerError: (eventId: number) => [
    http.get(detailPath(eventId), ({ request }) => errors.serverError(request)),
  ],
  /** GP-3 viewer(쿠키 요청 — 로그인 사용자의 원문 연락처)만 5xx. 공개 조회는 정상 */
  viewerServerError: (eventId: number) => [
    http.get(detailPath(eventId), ({ request, cookies }) =>
      hasAccessToken(cookies) ? errors.serverError(request) : undefined,
    ),
  ],
  /** GE-5 5xx(GP-3은 정상) */
  sectionsServerError: (eventId: number) => [
    http.get(sectionsPath(eventId), ({ request }) => errors.serverError(request)),
  ],
  /** 준비중·삭제·없음 — 공개 API는 모두 같은 404 */
  notFound: (eventId: number) => [
    http.get(detailPath(eventId), ({ request }) =>
      fail(request, 404, 'Event_404_1', '이벤트를 찾을 수 없습니다.'),
    ),
    http.get(sectionsPath(eventId), ({ request }) =>
      fail(request, 404, 'Event_404_1', '이벤트를 찾을 수 없습니다.'),
    ),
  ],
};
