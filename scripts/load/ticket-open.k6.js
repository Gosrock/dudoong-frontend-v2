/**
 * 티켓 오픈 순간 부하 시험 초안(k6, P14 성능 · 부하). **실행은 D2 스테이징 배포 뒤** — 사용자 대기(progress "사용자 대기").
 * 저장소 의존성이 아니다: k6를 따로 설치해 돌린다(https://grafana.com/docs/k6/). PR 게이트·e2e와 무관하다.
 *
 *   k6 run -e BASE_URL=https://staging.dudoong.com -e EVENT_ID=<스테이징 공연 id> scripts/load/ticket-open.k6.js
 *
 * 무엇을 흉내 내나 — 공연 상세를 연 사람들이 오픈 시각에 새로고침·포커스를 반복한다(implementation-log "P14 — 성능 · 부하" 요청 수 표):
 *   - 공연 상세 HTML 한 번(Next 서버가 GP-3 + GE-5를 백엔드에 부른다 — 서버 캐시 없음, tech-decisions §2)
 *   - 브라우저 조회: GM-1 세션 · GA 상단 배너 · GP-5 재고(공연 상세 티켓 선택, 포커스마다 다시)
 *   - 선택: 주문 생성(O-1). **쓰기라 기본은 끔** — `-e WRITE=1 -e ACCESS_TOKENS=<시험 계정 토큰,…> -e TICKET_ITEM_ID=<무료 티켓>`
 *     일 때만, 스테이징·로컬 주소에서만. 토큰 값은 출력하지 않는다. 주문은 시험 공연·무료 티켓으로만(백엔드와 시간·대상 합의).
 *
 * 결과로 볼 것: 단계별 p95(`http_req_duration{name:…}`), 5xx 비율, 백엔드 CPU·DB 연결(서버 쪽). GP-3·GE-5가 먼저 무너지면
 * tech-decisions §2 "공연 상세 캐시 스위치"를 켤 근거다. GP-5·O-1은 서버에서 캐시하지 않는다(재고).
 */
import { check, sleep } from 'k6';
import http from 'k6/http';

const BASE_URL = (__ENV.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const EVENT_ID = __ENV.EVENT_ID || '101';
const WRITE = __ENV.WRITE === '1';
const TOKENS = (__ENV.ACCESS_TOKENS || '').split(',').filter(Boolean);
const TICKET_ITEM_ID = Number(__ENV.TICKET_ITEM_ID || 0);

// 운영 도메인에는 돌리지 않는다 — 스테이징·로컬만
const host = BASE_URL.replace(/^https?:\/\//, '').split('/')[0];
if (!/^(staging\.|127\.0\.0\.1|localhost)/.test(host)) {
  throw new Error(`BASE_URL은 스테이징·로컬만: ${host}`);
}
if (WRITE && (TOKENS.length === 0 || !TICKET_ITEM_ID)) {
  throw new Error('WRITE=1이면 ACCESS_TOKENS · TICKET_ITEM_ID가 필요하다');
}

export const options = {
  scenarios: {
    // 오픈 1분 전부터 사람이 모이고, 오픈 순간 몰렸다가 빠진다
    ticketOpen: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: Number(__ENV.WARM_VUS || 200) },
        { duration: '30s', target: Number(__ENV.PEAK_VUS || 1000) },
        { duration: '2m', target: Number(__ENV.PEAK_VUS || 1000) },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:event-page}': ['p(95)<1500'],
    'http_req_duration{name:GP-5}': ['p(95)<800'],
  },
};

const api = (path) => `${BASE_URL}/api/v2/${path}`;

function authHeaders() {
  if (!WRITE) return {};
  // VU마다 계정 하나(토큰 값은 로그에 남기지 않는다)
  return { Cookie: `accessToken=${TOKENS[(__VU - 1) % TOKENS.length]}` };
}

export default function ticketOpenVisitor() {
  const headers = authHeaders();

  // 1) 하드 내비게이션 — 서버 렌더(GP-3 + GE-5)
  const page = http.get(`${BASE_URL}/events/${EVENT_ID}`, {
    headers,
    tags: { name: 'event-page' },
  });
  check(page, { 'event page 200': (r) => r.status === 200 });

  // 2) 하이드레이션 뒤 브라우저 조회(공개 GET은 쿠키 없이 — 앱의 `credentials: 'omit'`과 같다)
  http.batch([
    ['GET', api('me'), null, { headers, tags: { name: 'GM-1' } }],
    ['GET', api('notices/banners?audience=USER'), null, { tags: { name: 'GA-banners' } }],
    ['GET', api(`events/${EVENT_ID}/ticket-items`), null, { tags: { name: 'GP-5' } }],
  ]);

  // 3) 오픈을 기다리며 포커스 복귀 — GP-5만 다시(staleTime 0 + refetchOnWindowFocus)
  for (let i = 0; i < 3; i++) {
    sleep(2 + Math.random() * 3);
    const stock = http.get(api(`events/${EVENT_ID}/ticket-items`), { tags: { name: 'GP-5' } });
    check(stock, { 'GP-5 200': (r) => r.status === 200 });
  }

  // 4) 선택: 주문 생성(무료 선착순 티켓). 앱은 진행 중 제출을 막으므로 사람당 한 번
  if (WRITE && __ITER === 0) {
    const body = JSON.stringify({
      eventId: Number(EVENT_ID),
      ticketItemId: TICKET_ITEM_ID,
      quantity: 1,
      options: { applyToAll: true, answers: [] },
      paymentChannel: __ENV.PAYMENT_CHANNEL || 'FREE',
    });
    const order = http.post(api('me/orders'), body, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      tags: { name: 'O-1' },
    });
    // 매진(400)은 정상 결과다 — 5xx만 실패로 본다
    check(order, { 'O-1 not 5xx': (r) => r.status < 500 });
  }

  // 새로고침 간격
  sleep(5 + Math.random() * 10);
}
