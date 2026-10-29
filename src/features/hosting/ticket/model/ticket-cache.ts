import type { QueryClient } from '@tanstack/react-query';

import { eventChecklistQuery, eventManageQuery } from '@/api/event/queries';
import { eventOptionsQuery } from '@/api/option/queries';
import type { TicketOptionManage } from '@/api/option/schema';
import { eventTicketItemsQuery, ticketItemsManageQuery } from '@/api/ticket-item/queries';
import type { TicketItemManage } from '@/api/ticket-item/schema';

/**
 * 티켓·옵션 변경 뒤 캐시 반영(plan P12, patterns §11 "변경 응답으로 캐시를 바로 채운다"). 무효화는 모두 정확한 키(`exact`).
 * - 티켓 응답(T-2·T-3·T-5·T-6·O-5)은 T-1 목록에 넣고, T-4·O-4 응답(남은 목록)은 통째로 넣는다
 * - 관객 GP-5(`['events', id, 'ticket-items']`)는 티켓·옵션이 바뀌면 무효화한다 — 판매 중단 → 재개가 공연 상세에 바로 반영
 * - 체크리스트 ③(유효 티켓)은 만들기·삭제 뒤 GE-7·GE-3(`checklist`)을 무효화한다
 * - 옵션 풀의 `appliedTicketItemIds`·`isLocked`는 티켓 쪽 변경(붙이기·떼기·삭제)으로 바뀌고, 티켓의 `options`(이름·추가금)는 옵션 변경으로 바뀐다
 */

const invalidateExact = (qc: QueryClient, queryKey: readonly unknown[]) =>
  qc.invalidateQueries({ queryKey, exact: true });

const ticketsKey = (eventId: string) => ticketItemsManageQuery(eventId).queryKey;
const optionsKey = (eventId: string) => eventOptionsQuery(eventId).queryKey;

/** 관객 GP-5 */
export const invalidatePublicTickets = (qc: QueryClient, eventId: string) =>
  invalidateExact(qc, eventTicketItemsQuery(eventId).queryKey);

/** 체크리스트 ③ — GE-7과 GE-3(`checklist`) */
const invalidateChecklist = (qc: QueryClient, eventId: string) =>
  Promise.all([
    invalidateExact(qc, eventChecklistQuery(eventId).queryKey),
    invalidateExact(qc, eventManageQuery(eventId).queryKey),
  ]);

export const invalidateTickets = (qc: QueryClient, eventId: string) =>
  invalidateExact(qc, ticketsKey(eventId));
export const invalidateOptions = (qc: QueryClient, eventId: string) =>
  invalidateExact(qc, optionsKey(eventId));

/** 티켓 하나를 목록에 넣는다(있으면 바꾸고 없으면 끝에 — 생성 순) */
function putTicket(qc: QueryClient, eventId: string, ticket: TicketItemManage) {
  qc.setQueryData<TicketItemManage[]>(ticketsKey(eventId), (list) => {
    if (!list) return list;
    return list.some((t) => t.ticketItemId === ticket.ticketItemId)
      ? list.map((t) => (t.ticketItemId === ticket.ticketItemId ? ticket : t))
      : [...list, ticket];
  });
}

/** T-2 뒤 — 목록 끝에 넣고 체크리스트 ③·GP-5 */
export async function applyCreatedTicket(qc: QueryClient, eventId: string, t: TicketItemManage) {
  putTicket(qc, eventId, t);
  await Promise.all([invalidateChecklist(qc, eventId), invalidatePublicTickets(qc, eventId)]);
}

/** T-3·T-5·T-6 뒤 — 목록의 그 티켓을 바꾸고 GP-5 */
export async function applyUpdatedTicket(qc: QueryClient, eventId: string, t: TicketItemManage) {
  putTicket(qc, eventId, t);
  await invalidatePublicTickets(qc, eventId);
}

/** T-4 뒤 — 남은 목록을 넣고 체크리스트 ③·GP-5·옵션 풀(붙은 티켓 id) */
export async function applyDeletedTicket(
  qc: QueryClient,
  eventId: string,
  remaining: TicketItemManage[],
) {
  qc.setQueryData(ticketsKey(eventId), remaining);
  await Promise.all([
    invalidateChecklist(qc, eventId),
    invalidatePublicTickets(qc, eventId),
    invalidateOptions(qc, eventId),
  ]);
}

/** O-5 뒤 — 그 티켓을 바꾸고 옵션 풀(붙은 티켓 id)·GP-5 */
export async function applyTicketOptions(qc: QueryClient, eventId: string, t: TicketItemManage) {
  putTicket(qc, eventId, t);
  await Promise.all([invalidateOptions(qc, eventId), invalidatePublicTickets(qc, eventId)]);
}

/** O-2 뒤 — 풀 끝에 넣는다(아직 어느 티켓에도 붙지 않았다) */
export function applyCreatedOption(qc: QueryClient, eventId: string, o: TicketOptionManage) {
  qc.setQueryData<TicketOptionManage[]>(optionsKey(eventId), (list) =>
    list ? [...list.filter((x) => x.optionId !== o.optionId), o] : list,
  );
}

/** O-3 뒤 — 풀의 그 옵션을 바꾸고 티켓 목록(붙은 옵션 이름·추가금)·GP-5 */
export async function applyUpdatedOption(qc: QueryClient, eventId: string, o: TicketOptionManage) {
  qc.setQueryData<TicketOptionManage[]>(optionsKey(eventId), (list) =>
    list?.map((x) => (x.optionId === o.optionId ? o : x)),
  );
  await Promise.all([invalidateTickets(qc, eventId), invalidatePublicTickets(qc, eventId)]);
}

/** O-4 뒤 — 남은 풀을 넣고 티켓 목록(떼어진 옵션)·GP-5 */
export async function applyDeletedOption(
  qc: QueryClient,
  eventId: string,
  remaining: TicketOptionManage[],
) {
  qc.setQueryData(optionsKey(eventId), remaining);
  await Promise.all([invalidateTickets(qc, eventId), invalidatePublicTickets(qc, eventId)]);
}
