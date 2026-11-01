import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NEW_APPROVED_ORDER_UUID,
  resetTicketStore,
  SENT_GIFT_ID,
  TICKET_UUID,
} from '@/api/__mocks__/fixtures/my-ticket';
import { myTicketHandlers } from '@/api/__mocks__/my-ticket.handlers';
import { ok } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import { myTicketsQuery } from '@/api/my-ticket/queries';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useTicketDetail } from './useTicketDetail';
import { useTicketTab } from './useTicketTab';

let restore: () => void;
beforeEach(() => {
  resetTicketStore();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
});

function setup() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>{children}</Suspense>
    </QueryClientProvider>
  );
  return { queryClient, wrapper };
}

const TICKETS = 'GET /api/v2/me/tickets';
const NOTICE = 'GET /api/v2/me/tickets/new-approved';
const isDetail = (line: string) =>
  /^GET \/api\/v2\/me\/(tickets\/(?!new-approved)[^/]+|gifts\/\d+\/ticket)$/.test(line);

describe('티켓탭 — useTicketTab', () => {
  it('들어가면 T-1·T-3만 부르고, 카드마다 T-2를 미리 읽지 않는다(공지 바가 진입만으로 풀리지 않는다)', async () => {
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useTicketTab(), { wrapper });
    await waitFor(() => expect(result.current?.notice.kind).toBe('APPROVED'));
    const lines = await sent.lines();
    expect(lines).toEqual(expect.arrayContaining([TICKETS, NOTICE]));
    expect(lines.filter(isDetail)).toEqual([]);
    expect(result.current.notice).toEqual({
      kind: 'APPROVED',
      targetGroupKey: NEW_APPROVED_ORDER_UUID,
    });
    // 그동안 공지 바는 그대로(서버에서 풀리지 않았다)
    expect((await sent.list()).every((r) => r.credentials === 'include')).toBe(true);
  });

  it('받은 티켓 묶음(orderUuid=null)에는 [주문상세]가 없고, 내 주문 묶음에는 있다', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useTicketTab(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    const received = result.current.groups.find((g) => !g.group.isMyOrder)!;
    expect(received.orderHref).toBeNull();
    const mine = result.current.groups.find((g) => g.key === NEW_APPROVED_ORDER_UUID)!;
    expect(mine.orderHref).toBe(`/orders/${NEW_APPROVED_ORDER_UUID}`);
    expect(mine.counts.map((c) => `${c.label} ${c.count}`)).toEqual([
      '승인완료 1',
      '선물 대기중 1',
      '선물완료 1',
    ]);
  });

  it('승인 대기·거절 주문은 티켓 없이 주문만 나온다', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useTicketTab(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    const orderOnly = result.current.groups.filter((g) => g.orderOnly);
    expect(orderOnly.map((g) => g.counts[0]?.state).sort()).toEqual(['PENDING_APPROVE', 'REFUSED']);
    expect(orderOnly.every((g) => tabPager(result.current, g.key) === null)).toBe(true);
  });

  it('선택은 묶음 안 인덱스로 기억하고, 목록이 다시 와 장수가 줄면 범위 안으로 맞춘다', async () => {
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useTicketTab(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    const key = NEW_APPROVED_ORDER_UUID;
    act(() => result.current.select(key, 2));
    expect(result.current.pager(key)).toBe('3/3');
    expect(result.current.selectedTicket(key)?.giftState).toBe('SENT');
    act(() => result.current.select(key, 9));
    expect(result.current.selectedIndex(key)).toBe(2);

    // 다음 목록에서 이 묶음이 1장이 됨(선물로 넘어감 등)
    const current = queryClient.getQueryData(myTicketsQuery().queryKey)!;
    server.use(
      http.get('*/api/v2/me/tickets', () =>
        ok({
          groups: current.groups.map((g) =>
            g.groupKey === key ? { ...g, tickets: g.tickets.slice(0, 1) } : g,
          ),
        }),
      ),
    );
    await act(() =>
      queryClient.invalidateQueries({ queryKey: myTicketsQuery().queryKey, exact: true }),
    );
    await waitFor(() => expect(result.current.pager(key)).toBe('1/1'));
    expect(result.current.selectedTicket(key)?.ticketUuid).toBe(TICKET_UUID.approved);
  });

  it('선물 완료 카드는 T-2가 아니라 GG-7a(giftId)로 연다', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useTicketTab(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    const sentTicket = result.current.groups
      .flatMap((g) => g.group.tickets)
      .find((t) => t.state === 'GIFT_SENT')!;
    expect(result.current.targetOf(sentTicket)).toEqual({ kind: 'sentGift', giftId: SENT_GIFT_ID });
  });

  it('티켓이 하나도 없으면 empty', async () => {
    server.use(...myTicketHandlers.empty);
    const { wrapper } = setup();
    const { result } = renderHook(() => useTicketTab(), { wrapper });
    await waitFor(() => expect(result.current?.empty).toBe(true));
    expect(result.current.notice.kind).toBe('DEFAULT');
  });
});

const tabPager = (tab: ReturnType<typeof useTicketTab>, key: string) => tab.pager(key);

describe('티켓 상세 — useTicketDetail', () => {
  it('target이 없으면 아무것도 부르지 않는다', async () => {
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useTicketDetail(null), { wrapper });
    expect(result.current).toEqual({ status: 'idle' });
    expect(await sent.lines()).toEqual([]);
  });

  it('카드를 열면 T-2를 한 번 부르고, 그 뒤 공지 바(T-3)를 다시 읽어 풀린다', async () => {
    const { wrapper, queryClient } = setup();
    const tab = renderHook(() => useTicketTab(), { wrapper });
    await waitFor(() => expect(tab.result.current?.notice.kind).toBe('APPROVED'));

    const sent = recordRequests();
    const { result } = renderHook(
      () => useTicketDetail({ kind: 'ticket', ticketUuid: TICKET_UUID.approved }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await waitFor(() => expect(tab.result.current.notice.kind).not.toBe('APPROVED'));
    const lines = await sent.lines();
    expect(lines.filter(isDetail)).toEqual([`GET /api/v2/me/tickets/${TICKET_UUID.approved}`]);
    expect(lines.indexOf(NOTICE)).toBeGreaterThan(
      lines.indexOf(`GET /api/v2/me/tickets/${TICKET_UUID.approved}`),
    );
    if (result.current.status !== 'ready') throw new Error();
    expect(result.current).toMatchObject({
      entryQr: { kind: 'qr', value: TICKET_UUID.approved },
      canGift: true,
      canReturn: false,
      pendingGift: null,
      orderHref: `/orders/${NEW_APPROVED_ORDER_UUID}`,
    });
    expect(queryClient.getQueryState(['me', 'tickets', TICKET_UUID.approved])?.status).toBe(
      'success',
    );
  });

  it.each([
    [TICKET_UUID.giftPending, 'GIFT_PENDING', false, false, true],
    [TICKET_UUID.giftExpired, 'GIFT_EXPIRED', false, false, true],
    [TICKET_UUID.received, 'qr', false, true, false],
    [TICKET_UUID.entered, 'qr', false, false, false],
    [TICKET_UUID.refundRequested, 'CANCELED', false, false, false],
  ] as const)(
    '%s → QR/안내 %s, [선물하기] %s, [선물 반환] %s, 대기 선물 %s',
    async (uuid, qr, canGift, canReturn, pending) => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useTicketDetail({ kind: 'ticket', ticketUuid: uuid }), {
        wrapper,
      });
      await waitFor(() => expect(result.current.status).toBe('ready'));
      if (result.current.status !== 'ready') throw new Error();
      const view = result.current;
      expect(view.entryQr.kind === 'qr' ? 'qr' : view.entryQr.reason).toBe(qr);
      expect(view.canGift).toBe(canGift);
      expect(view.canReturn).toBe(canReturn);
      expect(view.pendingGift !== null).toBe(pending);
      // 버튼 노출은 서버 플래그 그대로
      expect(view.canGift).toBe(view.detail.canGift);
      expect(view.canReturn).toBe(view.detail.canReturn);
    },
  );

  it('받은 티켓 상세에는 [주문상세]가 없다', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useTicketDetail({ kind: 'ticket', ticketUuid: TICKET_UUID.received }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current).toMatchObject({ orderHref: null });
  });

  it('선물 완료 카드는 GG-7a로 열고 QR 대신 안내', async () => {
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useTicketDetail({ kind: 'sentGift', giftId: SENT_GIFT_ID }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current).toMatchObject({ entryQr: { kind: 'notice', reason: 'GIFT_SENT' } });
    expect((await sent.lines()).filter(isDetail)).toEqual([
      `GET /api/v2/me/gifts/${SENT_GIFT_ID}/ticket`,
    ]);
  });

  it.each([
    ['옛 uuid(IssuedTicket_404_1)', { kind: 'ticket', ticketUuid: 'mock-ticket-old' } as const],
    ['선물 완료가 아님(Gift_404_1)', { kind: 'sentGift', giftId: 301 } as const],
  ])('%s → gone + 티켓탭 목록을 다시 읽는다', async (_, target) => {
    const sent = recordRequests();
    const { wrapper } = setup();
    const tab = renderHook(() => useTicketTab(), { wrapper });
    await waitFor(() => expect(tab.result.current).not.toBeNull());
    const before = (await sent.lines()).filter((l) => l === TICKETS).length;
    const { result } = renderHook(() => useTicketDetail(target), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('gone'));
    await waitFor(async () =>
      expect((await sent.lines()).filter((l) => l === TICKETS).length).toBe(before + 1),
    );
  });
});
