'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { eventManageQuery } from '@/api/event/queries';
import { handleError } from '@/api/handle-error';
import { formatKstDateTime } from '@/api/shared/date';
import {
  deleteTicketItemMutation,
  resumeTicketItemMutation,
  suspendTicketItemMutation,
} from '@/api/ticket-item/mutations';
import { ticketItemsManageQuery } from '@/api/ticket-item/queries';
import type { TicketItemManage } from '@/api/ticket-item/schema';
import { useEventScope } from '@/features/hosting/event/model/useEventScope';

import { applyDeletedTicket, applyUpdatedTicket, invalidateTickets } from './ticket-cache';
import {
  canAddTicket,
  canChangeTicketOptions,
  editTicketHref,
  isTicketLocked,
  newTicketHref,
  TICKET_MENU_LABEL,
  TICKET_SALE_CHIP_LABEL,
  type TicketMenuAction,
  ticketMenuOf,
  ticketSaleChipOf,
} from './ticket-rules';

/** 목록 동작 오류 문구(patterns §24 P12 — 잠정) */
export const TICKET_ACTION_ERRORS = {
  Ticket_Item_400_7: '판매되었거나 승인 대기 주문이 있어 지울 수 없어요. 판매 중단만 할 수 있어요',
  Ticket_Item_404_1: '티켓을 찾을 수 없어요. 목록을 다시 불러왔어요',
  Event_400_17: '끝난 공연은 수정할 수 없어요',
} as const;

export type TicketCard = {
  ticket: TicketItemManage;
  /** 판매중 · 판매 예정 · 판매 종료 · 판매 중단 */
  chip: ReturnType<typeof ticketSaleChipOf>;
  chipLabel: string;
  /** 판매됐거나 승인 대기 주문이 있다 */
  locked: boolean;
  /** ⋮ 메뉴(읽기 전용이면 비어 있다) */
  menu: { action: TicketMenuAction; label: string }[];
  editHref: string;
  /** [티켓 옵션 추가](GUI 카드) — 쓰기 가능 + 잠기지 않은 티켓 */
  canManageOptions: boolean;
};

/**
 * 티켓 관리 목록(`/hosting/events/[eventId]/tickets`, G10/T-1 · T-4 · T-5 · T-6, plan P12). 카드 값·⋮ 메뉴·동작만 돌려준다(plan §0).
 * 공연 스코프 레이아웃 안에서 쓴다(GE-3 `useEventScope`).
 *
 * - 티켓 없음 공연(`hasTicket=false`)은 추가할 수 없다(`canAdd` false, `noTicketEvent`) — 서버도 `Ticket_Item_400_12`
 * - 메뉴: 수정 · 삭제(잠기지 않은 티켓만) · 판매 중단/재개(`ticketMenuOf`). 일반 멤버·끝난 공연은 메뉴가 없다
 * - 판매 중단·재개(멱등): 응답을 목록에 넣고 관객 GP-5를 무효화 — 공연 상세 티켓 목록에 바로 반영
 * - 삭제: 응답(남은 목록)을 넣고 체크리스트 ③·GP-5·옵션 풀을 무효화. 잠긴 티켓은 요청하지 않는다
 * - 에러: `Ticket_Item_400_7`(그새 팔림) · 404 → 목록 다시 읽기 + 안내, `Event_400_17` → GE-3 다시 읽기(읽기 전용으로). 그 밖은 공용 토스트(handleError)
 */
export function useTicketList(eventId: string, { now = () => new Date() } = {}) {
  const queryClient = useQueryClient();
  const scope = useEventScope(eventId);
  const list = useQuery(ticketItemsManageQuery(eventId));
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const inflight = useRef(false);

  const onUpdated = (t: TicketItemManage) => applyUpdatedTicket(queryClient, eventId, t);
  const suspendMutation = useMutation({
    ...suspendTicketItemMutation(eventId),
    onSuccess: onUpdated,
  });
  const resumeMutation = useMutation({
    ...resumeTicketItemMutation(eventId),
    onSuccess: onUpdated,
  });
  const deleteMutation = useMutation({
    ...deleteTicketItemMutation(eventId),
    onSuccess: (remaining) => applyDeletedTicket(queryClient, eventId, remaining),
  });

  const tickets = useMemo(() => list.data ?? [], [list.data]);
  const nowText = formatKstDateTime(now());
  const cards: TicketCard[] = useMemo(
    () =>
      tickets.map((t) => {
        const chip = ticketSaleChipOf(t, scope.event.startAt, nowText, scope.registered);
        return {
          ticket: t,
          chip,
          chipLabel: TICKET_SALE_CHIP_LABEL[chip],
          locked: isTicketLocked(t),
          menu: ticketMenuOf(t, scope.canEdit).map((action) => ({
            action,
            label: TICKET_MENU_LABEL[action],
          })),
          editHref: editTicketHref(eventId, t.ticketItemId),
          canManageOptions: canChangeTicketOptions(t, scope.canEdit),
        };
      }),
    [eventId, nowText, scope.canEdit, scope.event.startAt, scope.registered, tickets],
  );

  /** 메뉴에 있는 동작만 보낸다. 끝나면 `true` */
  const run = useCallback(
    async (ticketItemId: number, action: Exclude<TicketMenuAction, 'edit'>) => {
      const card = cards.find((c) => c.ticket.ticketItemId === ticketItemId);
      if (!card || !card.menu.some((m) => m.action === action) || inflight.current) return false;
      inflight.current = true;
      setPendingId(ticketItemId);
      setActionError(null);
      const mutation =
        action === 'suspend'
          ? suspendMutation
          : action === 'resume'
            ? resumeMutation
            : deleteMutation;
      try {
        await mutation.mutateAsync(ticketItemId);
        return true;
      } catch (e) {
        handleError(e, {
          Ticket_Item_400_7: () => {
            setActionError(TICKET_ACTION_ERRORS.Ticket_Item_400_7);
            void invalidateTickets(queryClient, eventId);
          },
          Ticket_Item_404_1: () => {
            setActionError(TICKET_ACTION_ERRORS.Ticket_Item_404_1);
            void invalidateTickets(queryClient, eventId);
          },
          Event_400_17: () => {
            setActionError(TICKET_ACTION_ERRORS.Event_400_17);
            void queryClient.invalidateQueries({
              queryKey: eventManageQuery(eventId).queryKey,
              exact: true,
            });
          },
        });
        return false;
      } finally {
        inflight.current = false;
        setPendingId(null);
      }
    },
    [cards, deleteMutation, eventId, queryClient, resumeMutation, suspendMutation],
  );

  return {
    event: scope.event,
    canEdit: scope.canEdit,
    readOnlyMessage: scope.readOnlyMessage,
    /** T-1 상태 */
    status: list.status,
    retry: () => void list.refetch(),
    /** 티켓 없음 공연 — 추가 버튼 없이 안내(V) */
    noTicketEvent: !scope.event.hasTicket,
    /** [새 티켓 만들기] */
    canAdd: canAddTicket(scope.event, scope.canEdit),
    newHref: newTicketHref(eventId),
    cards,
    /** 빈 목록("만든 티켓이 없어요") */
    empty: list.status === 'success' && tickets.length === 0,
    suspend: (ticketItemId: number) => run(ticketItemId, 'suspend'),
    resume: (ticketItemId: number) => run(ticketItemId, 'resume'),
    remove: (ticketItemId: number) => run(ticketItemId, 'delete'),
    /** 동작 중인 티켓 */
    pendingId,
    actionError,
    dismissActionError: () => setActionError(null),
  };
}
