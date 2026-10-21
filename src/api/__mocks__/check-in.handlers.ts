import { http, type HttpHandler } from 'msw';

import { selfCheckIn } from './fixtures/my-ticket';
import { errors, fail, ok, requireAuth } from './respond';

/**
 * 관객 셀프 체크인 PQ-5(로그인). 토큰은 `CHECK_IN_TOKEN`(fixtures/my-ticket.ts). 판정은 `V2CheckInDomainService.selfCheckIn`:
 * 잘못된 토큰 `Event_400_26` → OPEN 아님 `Event_400_5` → (ticketUuid 지정) 남의 티켓 `IssuedTicket_400_1` → 200 + `result`.
 */
export const CHECK_IN_ERROR_REASONS = {
  Event_400_26: [400, '유효하지 않은 체크인 QR 입니다.'],
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

/** 이름 붙인 세트. `fails(code)` — PQ-5가 언제나 이 코드로 실패 */
export const checkInHandlers = {
  default: [self],
  fails: (code: CheckInErrorCode): HttpHandler[] => [
    http.post('*/api/v2/check-ins/self', ({ request }) => checkInError(request, code)),
  ],
  serverError: [
    http.post('*/api/v2/check-ins/self', ({ request }) => errors.serverError(request)),
  ] satisfies HttpHandler[],
};
