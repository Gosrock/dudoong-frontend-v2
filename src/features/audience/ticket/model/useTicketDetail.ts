'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { isNotFound, isSessionLost } from '@/api/errors';
import { sentGiftTicketQuery } from '@/api/gift/queries';
import { myTicketQuery, myTicketsQuery, newApprovedTicketsQuery } from '@/api/my-ticket/queries';
import type { MyTicketDetail } from '@/api/my-ticket/schema';
import { NOTIFICATIONS_KEY } from '@/features/audience/gift/model/gift-cache';

import {
  type EntryQr,
  entryQr,
  type TicketStateView,
  ticketStateView,
  type TicketTarget,
} from './my-ticket-state';
import { orderDetailHref } from './ticket-groups';

export type TicketDetailState =
  | { status: 'idle' }
  | { status: 'pending' }
  /** 옛 uuid·선물로 넘어감(T-2 `IssuedTicket_404_1`) 또는 선물 완료가 아님(GG-7a `Gift_404_1`). 목록을 다시 읽었다 — V는 상세를 닫는다 */
  | { status: 'gone' }
  | ({ status: 'ready' } & TicketDetailView);

export type TicketDetailView = {
  detail: MyTicketDetail;
  stateView: TicketStateView;
  /** 입장 QR 또는 사유 안내. QR 값 = `qrValue`(티켓 uuid) 그대로 */
  entryQr: EntryQr;
  /** [선물하기] — T-2 `canGift`로만 */
  canGift: boolean;
  /** [선물 반환] — T-2 `canReturn`으로만 */
  canReturn: boolean;
  /** 대기 중 선물(선물 대기·만료): 링크·메모와 [선물 취소/회수](DG-2) */
  pendingGift: { giftId: number; linkPath: string | null; memo: string | null } | null;
  /** [주문상세]. 받은 티켓은 null */
  orderHref: string | null;
};

const emptyKey = '';

/**
 * 카드를 눌러 연 티켓 상세(plan P8). `target`이 null이면 아무것도 부르지 않는다 — **열 때만** T-2(또는 선물 완료면 GG-7a)를 부른다.
 *
 * - 처음 받으면 G11/T-3과 알림(GN-2)을 무효화한다 — 서버가 T-2로 그 주문의 승인 알림을 읽음 처리한다(비동기)
 * - 404(`IssuedTicket_404_1`·`Gift_404_1`)면 티켓탭 목록을 다시 읽고 `gone` — 선물로 넘어갔거나 uuid가 바뀌었다
 * - 404가 아닌 첫 실패는 경계(`<AsyncBoundary>`)로 던진다
 * - QR 갱신: `staleTime` 0이라 상세를 다시 열거나 창에 돌아오면 다시 읽는다. 선물 수락·반환 뒤에는 티켓 쿼리 전체가 무효화된다(`gift-cache.ts`)
 */
export function useTicketDetail(target: TicketTarget | null): TicketDetailState {
  const queryClient = useQueryClient();
  const throwOnError = (e: Error, q: { state: { data: unknown } }) =>
    q.state.data === undefined && !isNotFound(e) && !isSessionLost(e);
  const ticket = useQuery({
    ...myTicketQuery(target?.kind === 'ticket' ? target.ticketUuid : emptyKey),
    enabled: target?.kind === 'ticket',
    throwOnError,
  });
  const sent = useQuery({
    ...sentGiftTicketQuery(target?.kind === 'sentGift' ? target.giftId : 0),
    enabled: target?.kind === 'sentGift',
    throwOnError,
  });
  const q = target?.kind === 'sentGift' ? sent : ticket;
  const key =
    target === null
      ? null
      : target.kind === 'ticket'
        ? `t:${target.ticketUuid}`
        : `g:${target.giftId}`;
  const gone = q.error !== null && isNotFound(q.error) && q.data === undefined;

  // 처음 받은 상세마다 공지 바·알림 무효화(한 번)
  const viewed = useRef<string | null>(null);
  useEffect(() => {
    if (!key || !q.isSuccess || viewed.current === key) return;
    viewed.current = key;
    void queryClient.invalidateQueries({ queryKey: newApprovedTicketsQuery().queryKey });
    void queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_KEY] });
  }, [key, q.isSuccess, queryClient]);

  // 404 → 목록 다시 읽기(한 번)
  const reloaded = useRef<string | null>(null);
  useEffect(() => {
    if (!key || !gone || reloaded.current === key) return;
    reloaded.current = key;
    void queryClient.invalidateQueries({ queryKey: myTicketsQuery().queryKey, exact: true });
  }, [key, gone, queryClient]);

  if (target === null) return { status: 'idle' };
  if (gone) return { status: 'gone' };
  if (!q.data) return { status: 'pending' };
  return { status: 'ready', ...toDetailView(q.data) };
}

export function toDetailView(detail: MyTicketDetail): TicketDetailView {
  const pending = detail.giftState === 'PENDING' && detail.gift !== null;
  return {
    detail,
    stateView: ticketStateView(detail.state),
    entryQr: entryQr(detail),
    canGift: detail.canGift,
    canReturn: detail.canReturn,
    pendingGift:
      pending && detail.gift
        ? { giftId: detail.gift.giftId, linkPath: detail.gift.linkPath, memo: detail.gift.memo }
        : null,
    orderHref: detail.orderUuid ? orderDetailHref(detail.orderUuid) : null,
  };
}
