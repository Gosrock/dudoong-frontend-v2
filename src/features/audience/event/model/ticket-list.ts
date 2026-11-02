import type { TicketView } from './ticket-state';
import type { TicketSelection } from './useTicketSelection';

/**
 * 공연 상세 티켓 목록(표시 · 선택)의 규칙 — 컴포넌트 파일(`TicketOptionList.tsx`)에서 옮겼다(코드 패턴 점검 A40, 2026-11-03).
 */

/** 티켓 설명 아래 작은 줄 — `인당 3매 제한 / 호스트 승인 후 확정`(와이어 `640:1957`) */
export function ticketConditions(t: TicketView['ticket']) {
  return [
    t.purchaseLimit !== null ? `인당 ${t.purchaseLimit}매 제한` : null,
    t.approvalRequired ? '호스트 승인 후 확정' : '구매 후 자동 확정',
  ]
    .filter(Boolean)
    .join(' / ');
}

/** 티켓 목록 화면이 읽는 선택 상태 */
export type TicketListStatus = Pick<
  TicketSelection,
  'status' | 'tickets' | 'listState' | 'refetch'
>;

/** 티켓 줄을 그릴 수 있나 — 아니면 `TicketListFallback`. 지난 공연은 티켓이 남아 있어도 목록 대신 문구 */
export const canListTickets = (selection: TicketListStatus) =>
  selection.status === 'success' &&
  selection.tickets.length > 0 &&
  selection.listState !== 'EVENT_ENDED';
