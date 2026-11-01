import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  CHECK_IN_TOKEN,
  GIFT_TOKEN,
  resetTicketStore,
  SENT_GIFT_ID,
  setUnreadRefused,
  TICKET_UUID,
} from '@/api/__mocks__/fixtures/my-ticket';
import { P9_ORDER } from '@/api/__mocks__/fixtures/order';
import { myTicketHandlers } from '@/api/__mocks__/my-ticket.handlers';
import { server } from '@/api/__mocks__/server';
import { selfCheckInMutation } from '@/api/check-in/mutations';
import { installLoggedInFetch } from '@/test/login-fetch';

import { ApiError } from '../errors';
import { acceptGiftMutation, createGiftMutation } from '../gift/mutations';
import { giftLandingQuery, giftLandingViewerQuery, sentGiftTicketQuery } from '../gift/queries';
import { myOrderQuery } from '../order/queries';
import { myTicketQuery, myTicketsQuery, newApprovedTicketsQuery } from './queries';
import { MY_TICKET_STATES, MyTicketDetailSchema, MyTicketsSchema } from './schema';

/**
 * 스키마 — mock 응답(백엔드 DTO `V2GiftResponses.kt`·`V2CheckInResponses.kt`와 같은 모양)이 조회 정의의 스키마를 통과한다(plan §0 테스트 2).
 * 티켓탭·선물·체크인은 로그인 API라 `pnpm check:contract`(공개 GET) 대상이 아니다.
 */
let restore: () => void;
beforeEach(() => {
  resetTicketStore();
  restore = installLoggedInFetch();
});
afterEach(() => restore());

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const rejection = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error('성공하면 안 된다');
    },
    (e: unknown) => e as ApiError,
  );

describe('G11/T-1 · T-2 · T-3', () => {
  it('목록은 묶음 단위이고, 승인 대기·거절 주문은 티켓 없이 수량만 counts에 온다', async () => {
    const { groups } = await client().fetchQuery(myTicketsQuery());
    expect(MyTicketsSchema.safeParse({ groups }).success).toBe(true);
    const waiting = groups.filter((g) => g.tickets.length === 0);
    expect(waiting.map((g) => g.counts)).toEqual(
      expect.arrayContaining([{ PENDING_APPROVE: 2 }, { REFUSED: 1 }]),
    );
    const received = groups.find((g) => !g.isMyOrder)!;
    expect(received).toMatchObject({
      orderUuid: null,
      orderNo: null,
      groupKey: expect.stringMatching(/^ticket:/),
    });
  });

  it('공연 임박순 — 끝나지 않은 공연(시작 임박순) 다음에 지난 공연', async () => {
    const { groups } = await client().fetchQuery(myTicketsQuery());
    const statuses = groups.map((g) => g.event?.displayStatus);
    expect(statuses.lastIndexOf('UPCOMING')).toBeLessThan(statuses.indexOf('PAST'));
  });

  it('mock이 내는 티켓 state가 모두 서버 enum 안에 있다(10종 — 거절·승인 대기는 counts에만)', async () => {
    const { groups } = await client().fetchQuery(myTicketsQuery());
    const states = new Set(
      groups.flatMap((g) => [...g.tickets.map((t) => t.state), ...Object.keys(g.counts)]),
    );
    for (const s of states) expect(MY_TICKET_STATES).toContain(s);
    expect([...states].sort()).toEqual(
      [
        'APPROVED',
        'ENTERED',
        'GIFT_EXPIRED',
        'GIFT_PENDING',
        'GIFT_SENT',
        'PENDING_APPROVE',
        'RECEIVED',
        'REFUND_REQUESTED',
        'REFUSED',
      ].sort(),
    );
  });

  it('T-2: 승인 티켓은 qrValue = uuid, 선물 대기 티켓은 qrValue null + 링크', async () => {
    const approved = await client().fetchQuery(myTicketQuery(TICKET_UUID.approved));
    expect(MyTicketDetailSchema.safeParse(approved).success).toBe(true);
    expect(approved).toMatchObject({
      qrValue: TICKET_UUID.approved,
      canGift: true,
      canReturn: false,
    });
    const pending = await client().fetchQuery(myTicketQuery(TICKET_UUID.giftPending));
    expect(pending).toMatchObject({
      qrValue: null,
      state: 'GIFT_PENDING',
      gift: { giftId: 301, linkPath: `/gifts/${GIFT_TOKEN.mine}`, memo: '동생' },
      canGift: false,
    });
  });

  it('T-2: 남의 티켓·없는 uuid는 404 IssuedTicket_404_1', async () => {
    const e = await rejection(client().fetchQuery(myTicketQuery(TICKET_UUID.othersInSameEvent)));
    expect(e).toMatchObject({ status: 404, code: 'IssuedTicket_404_1' });
  });

  it('T-3: T-2로 그 주문 티켓을 열면 공지 바가 풀린다(목록만으로는 풀리지 않음)', async () => {
    const qc = client();
    await qc.fetchQuery(myTicketsQuery());
    expect(await client().fetchQuery(newApprovedTicketsQuery())).toEqual({
      hasNew: true,
      orderUuids: ['mock-order-tickets-a'],
      refusedOrderUuids: [],
    });
    await client().fetchQuery(myTicketQuery(TICKET_UUID.approved));
    expect(await client().fetchQuery(newApprovedTicketsQuery())).toEqual({
      hasNew: false,
      orderUuids: [],
      refusedOrderUuids: [],
    });
  });

  it('T-3 refusedOrderUuids(2.5.4): 거절 주문 상세(O-3)를 열면 빠진다', async () => {
    setUnreadRefused([P9_ORDER.refusedDeposit, P9_ORDER.refusedEtc]);
    expect((await client().fetchQuery(newApprovedTicketsQuery())).refusedOrderUuids).toEqual([
      P9_ORDER.refusedDeposit,
      P9_ORDER.refusedEtc,
    ]);
    await client().fetchQuery(myOrderQuery(P9_ORDER.refusedDeposit));
    expect((await client().fetchQuery(newApprovedTicketsQuery())).refusedOrderUuids).toEqual([
      P9_ORDER.refusedEtc,
    ]);
  });

  it('T-3: 운영 2.5.3처럼 refusedOrderUuids 키가 없으면 빈 배열로 읽는다', async () => {
    server.use(...myTicketHandlers.noticeWithoutRefused);
    expect(await client().fetchQuery(newApprovedTicketsQuery())).toEqual({
      hasNew: true,
      orderUuids: ['mock-order-tickets-a'],
      refusedOrderUuids: [],
    });
  });

  it('GG-7a: 선물 완료 상세는 uuid·QR이 없다, 선물 완료가 아니면 Gift_404_1', async () => {
    const sent = await client().fetchQuery(sentGiftTicketQuery(SENT_GIFT_ID));
    expect(sent).toMatchObject({
      ticketUuid: null,
      qrValue: null,
      state: 'GIFT_SENT',
      gift: { receiverName: '이영희' },
    });
    const e = await rejection(client().fetchQuery(sentGiftTicketQuery(301)));
    expect(e).toMatchObject({ status: 404, code: 'Gift_404_1' });
  });
});

describe('선물 저장소가 이어진다', () => {
  it('PG-1로 만든 링크를 익명은 AVAILABLE, 보낸 나는 OWN_LINK로 본다', async () => {
    const created = await createGiftMutation(TICKET_UUID.approved).mutationFn!(
      { memo: '친구' },
      undefined as never,
    );
    expect(created).toMatchObject({ linkPath: `/gifts/${created.giftToken}`, memo: '친구' });
    const token = created.giftToken;
    expect((await client().fetchQuery(giftLandingQuery(token))).viewState).toBe('AVAILABLE');
    expect(await client().fetchQuery(giftLandingViewerQuery(token))).toMatchObject({
      viewState: 'OWN_LINK',
      giftId: created.giftId,
    });
  });

  it('PG-4 수락은 새 uuid를 돌려주고, 옛 uuid로 T-2는 404', async () => {
    const result = await acceptGiftMutation(GIFT_TOKEN.forMe).mutationFn!(
      undefined,
      undefined as never,
    );
    expect(result).toMatchObject({
      status: 'ACCEPTED',
      ticketUuid: expect.stringMatching(/-r\d+$/),
    });
    const fresh = await client().fetchQuery(myTicketQuery(result.ticketUuid!));
    expect(fresh).toMatchObject({ state: 'RECEIVED', canReturn: true, qrValue: result.ticketUuid });
  });
});

describe('PQ-5 셀프 체크인', () => {
  const run = (body: { token: string; ticketUuid?: string }) =>
    selfCheckInMutation().mutationFn!(body, undefined as never);

  it('1장이면 ENTERED(소유자 이름), 여러 장이면 SELECT_TICKET + 후보', async () => {
    expect(await run({ token: CHECK_IN_TOKEN.single })).toMatchObject({
      result: 'ENTERED',
      ticket: { ownerName: '두둥이', entrance: 'DONE' },
    });
    const multi = await run({ token: CHECK_IN_TOKEN.multi });
    expect(multi.result).toBe('SELECT_TICKET');
    expect(multi.candidates.map((c) => c.ticketUuid)).toEqual([
      TICKET_UUID.approved,
      TICKET_UUID.received,
    ]);
  });

  it.each([
    ['invalid-token', undefined, 'Event_400_26'],
    [CHECK_IN_TOKEN.ended, undefined, 'Event_400_5'],
    [CHECK_IN_TOKEN.multi, TICKET_UUID.othersInSameEvent, 'IssuedTicket_400_1'],
  ])('%s %s → %s', async (token, ticketUuid, code) => {
    const e = await rejection(run({ token, ...(ticketUuid ? { ticketUuid } : {}) }));
    expect(e).toMatchObject({ status: 400, code });
  });
});
