import { HTML_LIMITED_BOT_UA_RE } from 'next/dist/shared/lib/router/utils/html-bots';

/**
 * 셸 없이 끝까지 렌더해 받을 User-Agent(`next.config` `htmlLimitedBots`, 이슈 #90 — implementation-log "스테이징 QA 수정(관객)").
 *
 * Cache Components에서 서버 조회 화면(`/events/[eventId]` 등)은 빌드 때 만든 셸(비어 있음)을 먼저 흘려보내고 그 자리에서
 * 이어 렌더한다 — 상태 코드 200이 셸과 함께 나가서 `notFound()`가 404를 만들지 못한다(설치본 `streaming.md`
 * "The HTTP contract" · "Cache Components"). 이 목록에 걸린 UA만 셸을 건너뛰고 끝까지 렌더하므로 **404·5xx 상태 코드와
 * `<head>` 메타데이터를 받는다**. 브라우저는 그대로 셸(200 + not-found 화면 + `noindex`)이다 — 모든 UA를 넣으면
 * 정적 화면·프리페치까지 셸을 잃는다(tech-decisions §26).
 *
 * Next 기본 목록(설치본 `html-bots.js`)을 그대로 두고 덧붙인다 — 설정하면 기본 목록을 덮어쓰기 때문이다.
 * - `Googlebot`: Next는 JS를 실행하는 크롤러로 보고 셸을 준다 → 없는 공연이 200(soft 404)으로 색인 후보가 된다.
 * - `kakaotalk-scrap`·`Daumoa`: 실제 카카오 스크랩 UA는 `facebookexternalhit`을 같이 보내 기본 목록에 걸리지만, 줄인 UA·다음 검색.
 * - `bot/`·`crawler`·`spider`: 이름을 모르는 검색·미리보기 크롤러(`AhrefsBot/7.0` 등). 걸린 일반 브라우저는 셸 없이 받을 뿐 화면은 같다.
 */
export const HTML_LIMITED_BOTS = new RegExp(
  [
    HTML_LIMITED_BOT_UA_RE.source,
    'Googlebot',
    'kakaotalk-scrap',
    'Daumoa',
    'bot/',
    'crawler',
    'spider',
  ].join('|'),
  'i',
);
