import { http, type HttpHandler } from 'msw';

import { listMyTickets, newApproved, readMyTicket } from './fixtures/my-ticket';
import { giftError } from './gift.handlers';
import { errors, ok, requireAuth } from './respond';

/**
 * 티켓탭 — G11/T-1 목록, T-2 상세(읽으면 그 주문의 승인 알림 읽음 → T-3 해제), T-3 공지 바. 모두 로그인.
 * 상태는 `fixtures/my-ticket.ts` 저장소(선물 변경이 바로 보인다).
 */

const list = http.get('*/api/v2/me/tickets', ({ request, cookies }) => {
  return requireAuth(request, cookies) ?? ok(listMyTickets());
});

const notice = http.get('*/api/v2/me/tickets/new-approved', ({ request, cookies }) => {
  return requireAuth(request, cookies) ?? ok(newApproved());
});

const detail = http.get('*/api/v2/me/tickets/:ticketUuid', ({ request, params, cookies }) => {
  const denied = requireAuth(request, cookies);
  if (denied) return denied;
  const value = readMyTicket(String(params.ticketUuid));
  return value ? ok(value) : giftError(request, 'IssuedTicket_404_1');
});

/**
 * 이름 붙인 세트(plan §0).
 * - `default` — 기본 목록에 들어 있는 T-1 · T-3 · T-2(순서: 고정 경로 `new-approved`가 `:ticketUuid`보다 앞)
 * - `empty` — 티켓도 주문도 없음
 * - `listServerError` — T-1 5xx
 * - `noticeWithoutRefused` — 운영 2.5.3 T-3(`refusedOrderUuids` 키 없음)
 * 거절 공지는 저장소로 — `setUnreadRefused([...])`(O-3을 열면 풀린다)
 */
export const myTicketHandlers = {
  default: [list, notice, detail],
  empty: [
    http.get('*/api/v2/me/tickets', () => ok({ groups: [] })),
    http.get('*/api/v2/me/tickets/new-approved', () =>
      ok({ hasNew: false, orderUuids: [], refusedOrderUuids: [] }),
    ),
  ] satisfies HttpHandler[],
  /**
   * 운영 2.5.3 — T-3에 `refusedOrderUuids` 키가 없다(2.5.4는 스테이징에만). 화면은 승인 공지만 본다
   */
  noticeWithoutRefused: [
    http.get('*/api/v2/me/tickets/new-approved', ({ request, cookies }) => {
      const denied = requireAuth(request, cookies);
      if (denied) return denied;
      const { hasNew, orderUuids } = newApproved();
      return ok({ hasNew, orderUuids });
    }),
  ] satisfies HttpHandler[],
  listServerError: [
    http.get('*/api/v2/me/tickets', ({ request }) => errors.serverError(request)),
  ] satisfies HttpHandler[],
};
