import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GIFT_TOKEN,
  PENDING_GIFT_ID,
  resetTicketStore,
  TICKET_UUID,
} from '@/api/__mocks__/fixtures/my-ticket';
import { giftHandlers } from '@/api/__mocks__/gift.handlers';
import { server } from '@/api/__mocks__/server';
import { GiftMemoRequestSchema } from '@/api/gift/schema';
import { myTicketQuery, myTicketsQuery } from '@/api/my-ticket/queries';
import { shouldToastMutationError } from '@/api/query-client';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useCancelGift, useGiftLink, useReturnGift, useSendGift } from './useGiftActions';

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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

const lastMutation = (qc: ReturnType<typeof createTestQueryClient>) =>
  qc.getMutationCache().getAll().at(-1)!;
const writes = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method !== 'GET');

describe('선물 보내기 — useSendGift(PG-1)', () => {
  it('메모와 함께 보내면 링크를 받고, 이 티켓의 T-2와 목록이 다시 와 선물 대기로 바뀐다', async () => {
    const sent = recordRequests();
    const { wrapper, queryClient } = setup();
    await queryClient.fetchQuery(myTicketQuery(TICKET_UUID.approved));
    const { result } = renderHook(() => useSendGift(TICKET_UUID.approved), { wrapper });
    await act(() => result.current.send(' 친구 '));

    const posts = await writes(sent);
    expect(posts).toMatchObject([
      {
        method: 'POST',
        path: `/api/v2/me/tickets/${TICKET_UUID.approved}/gift`,
        body: { memo: '친구' },
      },
    ]);
    expect(GiftMemoRequestSchema.safeParse(posts[0]!.body).success).toBe(true);
    expect(result.current.link).toMatchObject({
      linkPath: expect.stringMatching(/^\/gifts\//),
      memo: '친구',
      existing: false,
    });
    expect(
      queryClient.getQueryState(myTicketQuery(TICKET_UUID.approved).queryKey)?.isInvalidated,
    ).toBe(true);
    const fresh = await queryClient.fetchQuery(myTicketQuery(TICKET_UUID.approved));
    expect(fresh).toMatchObject({ state: 'GIFT_PENDING', qrValue: null, canGift: false });
  });

  it('메모 없이 보내면 본문은 {}', async () => {
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useSendGift(TICKET_UUID.approved), { wrapper });
    await act(() => result.current.send(''));
    expect((await writes(sent))[0]?.body).toEqual({});
  });

  it('메모가 50자를 넘으면 요청 없이 메모 칸 오류', async () => {
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useSendGift(TICKET_UUID.approved), { wrapper });
    await act(() => result.current.send('가'.repeat(51)));
    expect(result.current.error).toEqual({
      message: '메모는 50자까지 쓸 수 있어요',
      field: 'memo',
    });
    expect(await writes(sent)).toEqual([]);
  });

  it('Gift_400_2(이미 선물 중) → T-2를 다시 읽어 기존 링크 화면, 전역 토스트 없음', async () => {
    const sent = recordRequests();
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useSendGift(TICKET_UUID.giftPending), { wrapper });
    await act(() => result.current.send());
    await waitFor(() => expect(result.current.link).not.toBeNull());
    expect(result.current.link).toEqual({
      giftId: PENDING_GIFT_ID,
      linkPath: `/gifts/${GIFT_TOKEN.mine}`,
      memo: '동생',
      existing: true,
    });
    expect(await sent.lines()).toContain(`GET /api/v2/me/tickets/${TICKET_UUID.giftPending}`);
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(false);
  });

  it.each([
    [
      'Gift_400_1',
      '지금은 선물할 수 없는 티켓이에요',
      `GET /api/v2/me/tickets/${TICKET_UUID.approved}`,
      false,
    ],
    ['IssuedTicket_404_1', '티켓 정보가 바뀌었어요', 'GET /api/v2/me/tickets', true],
    ['Gift_400_9', '메모는 50자까지 쓸 수 있어요', null, false],
  ] as const)('%s → "%s" + %s, gone=%s', async (code, message, reread, gone) => {
    server.use(...giftHandlers.fails('create', code));
    const sent = recordRequests();
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useSendGift(TICKET_UUID.approved), { wrapper });
    await act(() => result.current.send());
    await waitFor(() => expect(result.current.error?.message).toBe(message));
    expect(result.current.gone).toBe(gone);
    if (reread) {
      // 목록 무효화는 보고 있는 쿼리만 다시 읽는다 — 목록 쿼리가 없으면 stale 표시만 남는다
      const lines = await sent.lines();
      if (gone) {
        expect(queryClient.getQueryState(myTicketsQuery().queryKey)).toBeUndefined();
      } else {
        expect(lines).toContain(reread);
      }
    }
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(false);
  });
});

describe('링크 공유·메모 — useGiftLink(PG-8)', () => {
  const input = {
    giftId: PENDING_GIFT_ID,
    linkPath: `/gifts/${GIFT_TOKEN.mine}`,
    memo: '동생',
    eventName: '고스락 제37회 정기공연',
    posterImageUrl: null,
    ticketName: '일반 예매',
    ticketUuid: TICKET_UUID.giftPending,
  };

  it('공유 내용은 현재 origin + linkPath', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useGiftLink(input), { wrapper });
    expect(result.current.share.url).toBe(`${window.location.origin}/gifts/${GIFT_TOKEN.mine}`);
    expect(result.current.share.smsHref).toMatch(/^sms:\?body=/);
  });

  it('빈 값으로 저장하면 PATCH {memo: ""}(삭제)', async () => {
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useGiftLink(input), { wrapper });
    let ok = false;
    await act(async () => {
      ok = await result.current.saveMemo('  ');
    });
    expect(ok).toBe(true);
    expect(await writes(sent)).toMatchObject([
      { method: 'PATCH', path: `/api/v2/me/gifts/${PENDING_GIFT_ID}`, body: { memo: '' } },
    ]);
    expect(result.current.memo).toBeNull();
  });

  it('Gift_400_3(이미 처리됨) → T-2 다시 읽고 메모 칸을 잠근다', async () => {
    server.use(...giftHandlers.fails('memo', 'Gift_400_3'));
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useGiftLink(input), { wrapper });
    await act(() => result.current.saveMemo('친구'));
    await waitFor(() => expect(result.current.closed).toBe(true));
    expect(await sent.lines()).toContain(`GET /api/v2/me/tickets/${TICKET_UUID.giftPending}`);
  });

  it('Gift_400_9 → 메모 칸 오류(잠그지 않음)', async () => {
    server.use(...giftHandlers.fails('memo', 'Gift_400_9'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useGiftLink(input), { wrapper });
    await act(() => result.current.saveMemo('친구'));
    await waitFor(() => expect(result.current.error?.field).toBe('memo'));
    expect(result.current.closed).toBe(false);
  });
});

describe('선물 취소·회수 — useCancelGift(DG-2)', () => {
  it('DELETE 뒤 티켓 쿼리가 다시 와 승인 완료로 돌아온다', async () => {
    const sent = recordRequests();
    const { wrapper, queryClient } = setup();
    await queryClient.fetchQuery(myTicketQuery(TICKET_UUID.giftPending));
    const { result } = renderHook(
      () => useCancelGift(PENDING_GIFT_ID, { ticketUuid: TICKET_UUID.giftPending }),
      {
        wrapper,
      },
    );
    await act(() => result.current.cancel());
    expect(result.current.done).toBe(true);
    expect(await writes(sent)).toMatchObject([
      { method: 'DELETE', path: `/api/v2/me/gifts/${PENDING_GIFT_ID}` },
    ]);
    // 무효화돼 다음 조회에서 새 값
    expect(
      queryClient.getQueryState(myTicketQuery(TICKET_UUID.giftPending).queryKey)?.isInvalidated,
    ).toBe(true);
    const fresh = await queryClient.fetchQuery(myTicketQuery(TICKET_UUID.giftPending));
    expect(fresh).toMatchObject({ state: 'APPROVED', canGift: true });
  });

  it('두 번째 회수(Gift_400_3)는 "이미 처리된 선물" + 연 곳을 다시 읽는다', async () => {
    const { wrapper } = setup();
    const first = renderHook(() => useCancelGift(PENDING_GIFT_ID), { wrapper });
    await act(() => first.result.current.cancel());
    const sent = recordRequests();
    const second = renderHook(
      () =>
        useCancelGift(PENDING_GIFT_ID, {
          ticketUuid: TICKET_UUID.giftPending,
          giftToken: GIFT_TOKEN.mine,
        }),
      { wrapper },
    );
    await act(() => second.result.current.cancel());
    await waitFor(() =>
      expect(second.result.current.error?.message).toBe('이미 처리된 선물이에요'),
    );
    expect(await sent.lines()).toContain(`GET /api/v2/me/tickets/${TICKET_UUID.giftPending}`);
  });

  it('남의 선물(Gift_404_1) → 티켓탭 다시 읽기', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useCancelGift(304), { wrapper });
    await act(() => result.current.cancel());
    await waitFor(() => expect(result.current.error?.message).toBe('선물을 찾을 수 없어요'));
  });

  it('giftId가 없으면 아무것도 보내지 않는다', async () => {
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useCancelGift(null), { wrapper });
    await act(() => result.current.cancel());
    expect(await sent.lines()).toEqual([]);
  });
});

describe('선물 반환 — useReturnGift(PG-6)', () => {
  it('반환 뒤 옛 uuid의 T-2를 지우고 티켓 쿼리 전체를 무효화한다(uuid가 바뀐다)', async () => {
    const sent = recordRequests();
    const { wrapper, queryClient } = setup();
    await queryClient.fetchQuery(myTicketQuery(TICKET_UUID.received));
    await queryClient.fetchQuery(myTicketsQuery());
    const { result } = renderHook(() => useReturnGift(TICKET_UUID.received), { wrapper });
    await act(() => result.current.giveBack());
    expect(result.current.done).toBe(true);
    expect(await writes(sent)).toMatchObject([
      { method: 'POST', path: `/api/v2/me/tickets/${TICKET_UUID.received}/return` },
    ]);
    expect(queryClient.getQueryState(myTicketQuery(TICKET_UUID.received).queryKey)).toBeUndefined();
    expect(queryClient.getQueryState(myTicketsQuery().queryKey)?.isInvalidated).toBe(true);
    const { groups } = await queryClient.fetchQuery(myTicketsQuery());
    expect(groups.some((g) => !g.isMyOrder)).toBe(false);
  });

  it.each([
    ['Gift_400_8', '선물받은 티켓이 아니라 반환할 수 없어요', true],
    ['Gift_400_7', '반환할 수 없는 티켓이에요', false],
    ['IssuedTicket_404_1', '티켓 정보가 바뀌었어요', true],
  ] as const)('%s → "%s", gone=%s', async (code, message, gone) => {
    server.use(...giftHandlers.fails('return', code));
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useReturnGift(TICKET_UUID.received), { wrapper });
    await act(() => result.current.giveBack());
    await waitFor(() => expect(result.current.error?.message).toBe(message));
    expect(result.current.gone).toBe(gone);
    expect(result.current.done).toBe(false);
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(false);
  });

  it('표에 없는 코드(반환에 없는 Gift_400_1)는 전역 토스트로 간다', async () => {
    server.use(...giftHandlers.fails('return', 'Gift_400_1'));
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useReturnGift(TICKET_UUID.approved), { wrapper });
    await act(() => result.current.giveBack());
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(true);
  });
});
