import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { actAsRole } from '@/api/__mocks__/host-store';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { hostingTicketSets } from '@/api/__mocks__/hosting-ticket.handlers';
import { server } from '@/api/__mocks__/server';
import { createEventMutation } from '@/api/event/mutations';
import { eventChecklistQuery, eventManageQuery } from '@/api/event/queries';
import { eventOptionsQuery } from '@/api/option/queries';
import { eventTicketItemsQuery, ticketItemsManageQuery } from '@/api/ticket-item/queries';
import { errorToast } from '@/test/error-toast';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useTicketList } from './useTicketList';

let restore: () => void;
beforeEach(() => {
  resetHostMockState();
  resetHostingStore();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
  resetHostMockState();
  resetHostingStore();
});

/** 칩 판정 기준 — fixture 공연 101(2026.11.21 19:00)보다 앞 */
const NOW = () => new Date('2026-10-29T03:00:00Z');

function setup(eventId: string) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="불러오는 중">{children}</Suspense>
    </QueryClientProvider>
  );
  return {
    ...renderHook(() => useTicketList(eventId, { now: NOW }), { wrapper }),
    queryClient,
  };
}
type Hook = ReturnType<typeof setup>['result'];
const loaded = (result: Hook) => waitFor(() => expect(result.current?.status).toBe('success'));
const writes = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method !== 'GET');
const exactKeys = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.map((c) => (c[0] as { queryKey: unknown; exact?: boolean }).queryKey);

describe('티켓 관리 목록(G10/T-1)', () => {
  it('카드: 상태 칩 · 잠금 · ⋮ 메뉴(isSold || hasPendingOrders) · 옵션 추가 입구', async () => {
    const { result } = setup('101');
    await loaded(result);
    expect(
      result.current.cards.map((c) => [
        c.ticket.ticketItemId,
        c.chipLabel,
        c.locked,
        c.menu.map((m) => m.action),
        c.canManageOptions,
      ]),
    ).toEqual([
      [501, '판매중', true, ['edit', 'suspend'], false],
      [502, '판매중', true, ['edit', 'suspend'], false],
      [503, '판매중', false, ['edit', 'delete', 'suspend'], true],
    ]);
    expect(result.current.canAdd).toBe(true);
    expect(result.current.newHref).toBe('/hosting/events/101/tickets/new');
    expect(result.current.cards[0]!.editHref).toBe('/hosting/events/101/tickets/501');
  });

  it('티켓이 없으면 빈 목록(만든 티켓이 없어요)', async () => {
    const { result } = setup('140');
    await loaded(result);
    expect(result.current.empty).toBe(true);
    expect(result.current.canAdd).toBe(true);
  });

  it('티켓 없음 공연은 추가할 수 없다(서버도 Ticket_Item_400_12)', async () => {
    const { eventId } = await createEventMutation().mutationFn!(
      {
        hostId: 11,
        name: '버스킹',
        startAt: '2030.05.01 19:00',
        endAt: '2030.05.01 21:00',
        hasTicket: false,
      },
      {} as never,
    );
    const { result } = setup(String(eventId));
    await loaded(result);
    expect(result.current.noTicketEvent).toBe(true);
    expect(result.current.canAdd).toBe(false);
  });

  it('일반 멤버: 메뉴·추가·옵션 입구가 없다', async () => {
    actAsRole(11, 'GUEST');
    const { result } = setup('101');
    await loaded(result);
    expect(result.current.canEdit).toBe(false);
    expect(result.current.canAdd).toBe(false);
    expect(result.current.cards.every((c) => c.menu.length === 0 && !c.canManageOptions)).toBe(
      true,
    );
    const sent = recordRequests();
    expect(await act(() => result.current.suspend(503))).toBe(false);
    expect(await writes(sent)).toEqual([]);
  });

  it('T-1 5xx면 error + retry', async () => {
    server.use(...hostingTicketSets.listServerError(101));
    const { result } = setup('101');
    await waitFor(() => expect(result.current?.status).toBe('error'));
  });
});

describe('판매 중단 · 재개(T-5 · T-6)', () => {
  it('중단하면 목록 카드가 바뀌고 관객 GP-5 키를 정확히 무효화 — GP-5에 딤드(isSuspended)로 남고, 재개하면 풀린다(#894)', async () => {
    const { result, queryClient } = setup('101');
    await loaded(result);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const sent = recordRequests();
    expect(await act(() => result.current.suspend(503))).toBe(true);
    expect((await writes(sent)).map((r) => [r.method, r.path])).toEqual([
      ['POST', '/api/v2/events/101/ticket-items/503/suspend'],
    ]);
    await waitFor(() => expect(result.current.cards[2]!.chipLabel).toBe('판매 중단'));
    expect(result.current.cards[2]!.menu.map((m) => m.action)).toEqual([
      'edit',
      'delete',
      'resume',
    ]);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: eventTicketItemsQuery('101').queryKey,
      exact: true,
    });
    const gp5 = () => queryClient.fetchQuery({ ...eventTicketItemsQuery('101'), staleTime: 0 });
    expect((await gp5()).map((t) => [t.ticketItemId, t.isSuspended])).toEqual([
      [501, false],
      [502, false],
      [503, true],
    ]);

    expect(await act(() => result.current.resume(503))).toBe(true);
    await waitFor(() => expect(result.current.cards[2]!.chipLabel).toBe('판매중'));
    expect((await gp5()).map((t) => t.isSuspended)).toEqual([false, false, false]);
  });

  it('잠긴 티켓도 판매 중단할 수 있다', async () => {
    const { result } = setup('101');
    await loaded(result);
    expect(await act(() => result.current.suspend(501))).toBe(true);
    await waitFor(() => expect(result.current.cards[0]!.ticket.saleState).toBe('SUSPENDED'));
  });
});

describe('삭제(T-4)', () => {
  it('잠긴 티켓은 메뉴에 삭제가 없고 요청하지 않는다', async () => {
    const { result } = setup('101');
    await loaded(result);
    const sent = recordRequests();
    expect(await act(() => result.current.remove(501))).toBe(false);
    expect(await writes(sent)).toEqual([]);
  });

  it('지우면 남은 목록을 넣고 체크리스트 ③(GE-7·GE-3)·GP-5·옵션 풀을 정확히 무효화', async () => {
    const { result, queryClient } = setup('101');
    await loaded(result);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    expect(await act(() => result.current.remove(503))).toBe(true);
    await waitFor(() =>
      expect(result.current.cards.map((c) => c.ticket.ticketItemId)).toEqual([501, 502]),
    );
    expect(exactKeys(invalidate)).toEqual(
      expect.arrayContaining([
        eventChecklistQuery('101').queryKey,
        eventManageQuery('101').queryKey,
        eventTicketItemsQuery('101').queryKey,
        eventOptionsQuery('101').queryKey,
      ]),
    );
    expect(invalidate.mock.calls.every((c) => (c[0] as { exact?: boolean }).exact)).toBe(true);
  });

  it('그새 팔렸으면(Ticket_Item_400_7) 안내 + 목록 다시 읽기, 토스트 없음', async () => {
    server.use(...hostingTicketSets.deleteFails(101, 'Ticket_Item_400_7'));
    const { result, queryClient } = setup('101');
    await loaded(result);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    expect(await act(() => result.current.remove(503))).toBe(false);
    await waitFor(() =>
      expect(result.current.actionError).toBe(
        '판매되었거나 승인 대기 주문이 있어 지울 수 없어요. 판매 중단만 할 수 있어요',
      ),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ticketItemsManageQuery('101').queryKey,
      exact: true,
    });
    expect(errorToast).not.toHaveBeenCalled();
  });
});
