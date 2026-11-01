import { http, type HttpHandler, HttpResponse } from 'msw';

import { CHECK_IN_TICKET_UUID_MAX } from '../check-in/schema';
import { checkInStatsOf, checkInTokenOf, hostCheckIn, selfCheckIn } from './fixtures/my-ticket';
import { hostCheckInGuestTicket } from './guest-store';
import { guard } from './hosting-event.handlers';
import { errors, fail, ok, readId, requireAuth } from './respond';

/**
 * 관객 셀프 체크인 PQ-5(로그인). 토큰은 `CHECK_IN_TOKEN`(fixtures/my-ticket.ts). 판정은 `V2CheckInDomainService.selfCheckIn`:
 * 잘못된 토큰 `Event_400_26` → OPEN 아님 `Event_400_5` → (ticketUuid 지정) 남의 티켓 `IssuedTicket_400_1` → 200 + `result`.
 */
export const CHECK_IN_ERROR_REASONS = {
  Event_400_26: [400, '유효하지 않은 체크인 QR 입니다.'],
  Event_400_27: [400, '입장 처리를 할 수 없는 공연 상태입니다.'],
  Event_400_5: [400, '아직 오픈되지 않은 이벤트에는 접근할 수 없습니다.'],
  IssuedTicket_400_1: [400, 'IssuedTicket User Not Matched'],
} as const satisfies Record<string, readonly [number, string]>;
export type CheckInErrorCode = keyof typeof CHECK_IN_ERROR_REASONS;

const checkInError = (request: Request, code: CheckInErrorCode) => {
  const [status, reason] = CHECK_IN_ERROR_REASONS[code];
  return fail(request, status, code, reason);
};

const self = http.post('*/api/v2/check-ins/self', async ({ request, cookies }) => {
  const denied = requireAuth(request, cookies);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  const ticketUuid = body?.ticketUuid;
  // @NotBlank @Size(max = 64)
  if (!token || token.length > 64) return errors.badRequest(request);
  if (ticketUuid !== undefined && ticketUuid !== null && typeof ticketUuid !== 'string') {
    return errors.badRequest(request);
  }
  const r = selfCheckIn(token, (ticketUuid as string | null) ?? undefined);
  return 'error' in r ? checkInError(request, r.error) : ok(r.ok);
});

// ─── 호스트 체크인(P13b) — GQ-1 · PQ-2 · GQ-4 ────────────────
// 기준: `V2IssuedTicketController`·`V2CheckInUseCase`·`V2CheckInDomainService`(432cce4, cb8d24e까지 변경 없음). 셋 다 일반 멤버 이상
// (`@HostRolesAllowed(GUEST, EVENT_ID)` — 공연 관리 mock의 `guard`와 같은 앞단: 로그인 → 경로 id → 없는·지운 공연 404 → 비멤버 403).
// 판정·통계·토큰은 티켓 저장소(`fixtures/my-ticket.ts`)라 스캔 → 통계, GQ-4 토큰 → PQ-5가 이어진다.

const STATS_PATH = '*/api/v2/events/:eventId/check-ins/stats';
const SCAN_PATH = '*/api/v2/events/:eventId/check-ins';
const QR_PATH = '*/api/v2/events/:eventId/check-in-qr';

/** 호스트 스캔이 되는 공연(`validateHostCheckInStatus`) — 등록(OPEN) + 정산중(CALCULATING). 준비중·지난 공연은 `Event_400_27` */
const isHostCheckInStatus = (status: string) => status === 'OPEN' || status === 'CALCULATING';

const stats = http.get(STATS_PATH, ({ request, cookies, params }) => {
  const g = guard(request, cookies, params.eventId, 'GUEST');
  if ('response' in g) return g.response;
  return ok(checkInStatsOf(g.event.eventId));
});

const scan = http.post(SCAN_PATH, async ({ request, cookies, params }) => {
  const denied = requireAuth(request, cookies);
  if (denied) return denied;
  if (readId(params.eventId) === null) return errors.typeMismatch(request);
  // 본문 검증(`@Valid` — `@NotBlank @Size(max = 64)`)이 권한 앞단(유스케이스 AOP)보다 먼저다
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const ticketUuid = body?.ticketUuid;
  if (
    typeof ticketUuid !== 'string' ||
    !ticketUuid.trim() ||
    ticketUuid.length > CHECK_IN_TICKET_UUID_MAX
  ) {
    return errors.badRequest(request);
  }
  const g = guard(request, cookies, params.eventId, 'GUEST');
  if ('response' in g) return g.response;
  if (!isHostCheckInStatus(g.event.status)) return checkInError(request, 'Event_400_27');
  // 예매자 관리 시드 티켓(GI-1)도 판정한다 — 수동 입장 처리(#106 §5)
  return ok(
    hostCheckInGuestTicket(g.event.eventId, ticketUuid) ?? hostCheckIn(g.event.eventId, ticketUuid),
  );
});

const qr = http.get(QR_PATH, ({ request, cookies, params }) => {
  const g = guard(request, cookies, params.eventId, 'GUEST');
  if ('response' in g) return g.response;
  // 서버는 공연 상태를 보지 않는다(없는·지운 공연만 404). 토큰은 URL 인코딩해 `qrPath`에 넣는다
  const token = checkInTokenOf(g.event.eventId);
  return ok({ token, qrPath: `/check-in?token=${encodeURIComponent(token)}` });
});

/** 네트워크가 끊긴 것처럼(응답 없음) */
const networkDown = (path: string, method: 'get' | 'post') =>
  http[method](path, () => HttpResponse.error());

/** 호스트 체크인 이름 붙인 세트(P13b). 기본 동작은 `checkInHandlers.default`에 들어 있다 */
export const hostCheckInSets = {
  /** PQ-2가 언제나 이 코드로 실패 */
  scanFails: (code: CheckInErrorCode): HttpHandler[] => [
    http.post(SCAN_PATH, ({ request }) => checkInError(request, code)),
  ],
  scanServerError: [
    http.post(SCAN_PATH, ({ request }) => errors.serverError(request)),
  ] satisfies HttpHandler[],
  /** PQ-2 네트워크 차단 */
  scanNetworkError: [networkDown(SCAN_PATH, 'post')] satisfies HttpHandler[],
  statsServerError: [
    http.get(STATS_PATH, ({ request }) => errors.serverError(request)),
  ] satisfies HttpHandler[],
  statsNetworkError: [networkDown(STATS_PATH, 'get')] satisfies HttpHandler[],
  qrServerError: [
    http.get(QR_PATH, ({ request }) => errors.serverError(request)),
  ] satisfies HttpHandler[],
};

/** 이름 붙인 세트. `fails(code)` — PQ-5가 언제나 이 코드로 실패 */
export const checkInHandlers = {
  default: [self, stats, scan, qr],
  fails: (code: CheckInErrorCode): HttpHandler[] => [
    http.post('*/api/v2/check-ins/self', ({ request }) => checkInError(request, code)),
  ],
  serverError: [
    http.post('*/api/v2/check-ins/self', ({ request }) => errors.serverError(request)),
  ] satisfies HttpHandler[],
};
