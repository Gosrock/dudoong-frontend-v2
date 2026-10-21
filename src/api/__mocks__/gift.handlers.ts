import { http, type HttpHandler } from 'msw';

import {
  acceptGift,
  cancelGift,
  changeGiftMemo,
  createGift,
  giftLanding,
  readSentGiftTicket,
  rejectGift,
  returnGift,
} from './fixtures/my-ticket';
import { errors, fail, hasAccessToken, ok, readId, requireAuth } from './respond';

/**
 * 선물 — GG-3 랜딩(공개, 쿠키가 실리면 로그인 사용자 값), PG-1 · DG-2 · PG-8 · PG-4 · PG-5 · PG-6 · GG-7a(로그인).
 * 상태는 `fixtures/my-ticket.ts` 저장소. 테스트는 `resetTicketStore()`로 되돌린다.
 */

/** 에러 코드 → 백엔드 문장(error-codes.md, `TicketGiftErrorCode`) */
export const GIFT_ERROR_REASONS = {
  Gift_404_1: [404, '선물을 찾을 수 없습니다.'],
  Gift_400_1: [400, '선물할 수 없는 티켓입니다.'],
  Gift_400_2: [400, '이미 선물 중인 티켓입니다.'],
  Gift_400_3: [400, '이미 처리된 선물입니다.'],
  Gift_400_4: [400, '내가 보낸 선물은 받을 수 없습니다.'],
  Gift_400_5: [400, '선물을 받을 수 없는 공연입니다.'],
  Gift_400_6: [400, '선물을 받을 수 없는 상태입니다.'],
  Gift_400_7: [400, '반환할 수 없는 티켓입니다.'],
  Gift_400_8: [400, '선물받은 티켓이 아닙니다.'],
  Gift_400_9: [400, '메모는 50자까지 입력할 수 있습니다.'],
  IssuedTicket_404_1: [404, '티켓을 찾을 수 없습니다.'],
} as const satisfies Record<string, readonly [number, string]>;
export type GiftErrorCode = keyof typeof GIFT_ERROR_REASONS;

export const giftError = (request: Request, code: GiftErrorCode) => {
  const [status, reason] = GIFT_ERROR_REASONS[code];
  return fail(request, status, code, reason);
};

const respond = <T>(request: Request, r: { ok: T } | { error: GiftErrorCode }) =>
  'error' in r ? giftError(request, r.error) : ok(r.ok);

async function readMemo(request: Request): Promise<{ memo?: unknown } | null> {
  const text = await request.text();
  if (text === '') return {};
  try {
    const body: unknown = JSON.parse(text);
    return typeof body === 'object' && body !== null ? (body as { memo?: unknown }) : null;
  } catch {
    return null;
  }
}

const landing = http.get('*/api/v2/gifts/:giftToken', ({ request, params, cookies }) => {
  const value = giftLanding(String(params.giftToken), hasAccessToken(cookies) ? 'me' : null);
  return value ? ok(value) : giftError(request, 'Gift_404_1');
});

const create = http.post(
  '*/api/v2/me/tickets/:ticketUuid/gift',
  async ({ request, params, cookies }) => {
    const denied = requireAuth(request, cookies);
    if (denied) return denied;
    const body = await readMemo(request);
    if (!body || (body.memo !== undefined && body.memo !== null && typeof body.memo !== 'string')) {
      return errors.badRequest(request);
    }
    return respond(request, createGift(String(params.ticketUuid), body.memo as string | undefined));
  },
);

const cancel = http.delete('*/api/v2/me/gifts/:giftId', ({ request, params, cookies }) => {
  const denied = requireAuth(request, cookies);
  if (denied) return denied;
  const giftId = readId(params.giftId);
  if (giftId === null) return errors.badRequest(request);
  return respond(request, cancelGift(giftId));
});

const memo = http.patch('*/api/v2/me/gifts/:giftId', async ({ request, params, cookies }) => {
  const denied = requireAuth(request, cookies);
  if (denied) return denied;
  const giftId = readId(params.giftId);
  const body = await readMemo(request);
  if (giftId === null || !body) return errors.badRequest(request);
  return respond(request, changeGiftMemo(giftId, body.memo));
});

const accept = http.post('*/api/v2/gifts/:giftToken/accept', ({ request, params, cookies }) => {
  return requireAuth(request, cookies) ?? respond(request, acceptGift(String(params.giftToken)));
});

const reject = http.post('*/api/v2/gifts/:giftToken/reject', ({ request, params, cookies }) => {
  return requireAuth(request, cookies) ?? respond(request, rejectGift(String(params.giftToken)));
});

const giveBack = http.post(
  '*/api/v2/me/tickets/:ticketUuid/return',
  ({ request, params, cookies }) => {
    return requireAuth(request, cookies) ?? respond(request, returnGift(String(params.ticketUuid)));
  },
);

const sentTicket = http.get('*/api/v2/me/gifts/:giftId/ticket', ({ request, params, cookies }) => {
  const denied = requireAuth(request, cookies);
  if (denied) return denied;
  const giftId = readId(params.giftId);
  if (giftId === null) return errors.badRequest(request);
  const detail = readSentGiftTicket(giftId);
  return detail ? ok(detail) : giftError(request, 'Gift_404_1');
});

type GiftAction = 'create' | 'cancel' | 'memo' | 'accept' | 'reject' | 'return';
const ROUTES: Record<GiftAction, [method: 'post' | 'delete' | 'patch', path: string]> = {
  create: ['post', '*/api/v2/me/tickets/:ticketUuid/gift'],
  cancel: ['delete', '*/api/v2/me/gifts/:giftId'],
  memo: ['patch', '*/api/v2/me/gifts/:giftId'],
  accept: ['post', '*/api/v2/gifts/:giftToken/accept'],
  reject: ['post', '*/api/v2/gifts/:giftToken/reject'],
  return: ['post', '*/api/v2/me/tickets/:ticketUuid/return'],
};

/**
 * 이름 붙인 세트(plan §0). 기본 목록(`handlers.ts`)에는 `default`가 들어 있다.
 * - `fails(action, code)` — 그 변경이 언제나 이 코드로 실패(경합 재현: 동시 수락 `Gift_400_3` 등)
 * - `landingFails(code)` / `landingServerError` — GG-3 실패
 */
export const giftHandlers = {
  default: [landing, create, cancel, memo, accept, reject, giveBack, sentTicket],
  fails: (action: GiftAction, code: GiftErrorCode | 'Gift_400_6'): HttpHandler[] => {
    const [method, path] = ROUTES[action];
    return [http[method](path, ({ request }) => giftError(request, code))];
  },
  landingServerError: [
    http.get('*/api/v2/gifts/:giftToken', ({ request }) => errors.serverError(request)),
  ],
};
