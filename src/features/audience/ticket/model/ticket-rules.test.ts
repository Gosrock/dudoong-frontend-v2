import { describe, expect, it } from 'vitest';

import {
  MY_TICKET_STATES,
  type MyTicketDetail,
  type MyTicketGroup,
  MyTicketStateSchema,
} from '@/api/my-ticket/schema';

import {
  cardTarget,
  ENTRY_QR_NOTICE,
  entryQr,
  TICKET_STATE_VIEW,
  ticketStateView,
} from './my-ticket-state';
import {
  clampIndex,
  noticeBar,
  pagerLabel,
  sortTicketGroups,
  stateCounts,
  toTicketGroupView,
} from './ticket-groups';

describe('티켓 state 11값 → 표시', () => {
  it.each([
    ['PENDING_APPROVE', '승인 대기', 'waiting'],
    ['REFUSED', '승인 거절', 'negative'],
    ['APPROVED', '승인완료', 'positive'],
    ['GIFT_PENDING', '선물 대기중', 'gift'],
    ['GIFT_EXPIRED', '선물 만료', 'negative'],
    ['GIFT_SENT', '선물완료', 'muted'],
    ['RECEIVED', '받은 선물', 'gift'],
    ['ENTERED', '입장 완료', 'muted'],
    ['CANCELED', '취소됨', 'negative'],
    ['REFUND_REQUESTED', '환불 요청', 'waiting'],
    ['REFUNDED', '환불 완료', 'muted'],
    ['UNKNOWN', '상태 확인 필요', 'muted'],
  ] as const)('%s → %s', (state, label, tone) => {
    expect(ticketStateView(state)).toEqual({ label, tone });
  });

  it('서버 enum 11값이 모두 매핑에 있다(+UNKNOWN)', () => {
    expect(Object.keys(TICKET_STATE_VIEW).sort()).toEqual([...MY_TICKET_STATES, 'UNKNOWN'].sort());
  });

  it('모르는 state 문자열은 UNKNOWN으로 파싱되어 "상태 확인 필요"로 그린다', () => {
    const state = MyTicketStateSchema.parse('GIFT_FROZEN');
    expect(state).toBe('UNKNOWN');
    expect(ticketStateView(state).label).toBe('상태 확인 필요');
  });
});

describe('입장 QR — qrValue가 있으면 그대로, 없으면 사유 안내', () => {
  const event = {
    eventId: 101,
    name: '공연',
    posterImageUrl: null,
    startAt: null,
    displayStatus: 'UPCOMING' as const,
  };
  const d = (patch: Partial<MyTicketDetail>) =>
    ({ qrValue: null, state: 'APPROVED', event, ...patch }) as Pick<
      MyTicketDetail,
      'qrValue' | 'state' | 'event'
    >;

  it('QR 값은 티켓 uuid를 가공하지 않는다', () => {
    expect(entryQr(d({ qrValue: 'mock-ticket-a1' }))).toEqual({
      kind: 'qr',
      value: 'mock-ticket-a1',
    });
  });

  it('입장 완료 티켓도 qrValue가 오면 QR(다시 찍으면 서버가 ALREADY_ENTERED)', () => {
    expect(entryQr(d({ state: 'ENTERED', qrValue: 'u' })).kind).toBe('qr');
  });

  it.each([
    ['GIFT_PENDING', 'GIFT_PENDING'],
    ['GIFT_EXPIRED', 'GIFT_EXPIRED'],
    ['GIFT_SENT', 'GIFT_SENT'],
    ['CANCELED', 'CANCELED'],
    ['REFUND_REQUESTED', 'CANCELED'],
    ['REFUNDED', 'CANCELED'],
    ['APPROVED', 'UNAVAILABLE'],
    ['UNKNOWN', 'UNAVAILABLE'],
  ] as const)('qrValue null + %s → 안내 %s', (state, reason) => {
    expect(entryQr(d({ state }))).toEqual({
      kind: 'notice',
      reason,
      message: ENTRY_QR_NOTICE[reason],
    });
  });

  it('삭제된 공연(event null)은 "공연 정보를 찾을 수 없어" 안내', () => {
    expect(entryQr(d({ event: null }))).toMatchObject({ kind: 'notice', reason: 'EVENT_REMOVED' });
  });
});

describe('카드를 누르면 열 상세', () => {
  it.each([
    [
      { ticketUuid: 'u1', giftId: null, giftState: 'NONE' },
      { kind: 'ticket', ticketUuid: 'u1' },
    ],
    [
      { ticketUuid: 'u2', giftId: 301, giftState: 'PENDING' },
      { kind: 'ticket', ticketUuid: 'u2' },
    ],
    [
      { ticketUuid: null, giftId: 302, giftState: 'SENT' },
      { kind: 'sentGift', giftId: 302 },
    ],
    [{ ticketUuid: null, giftId: null, giftState: 'SENT' }, null],
    [{ ticketUuid: null, giftId: 9, giftState: 'UNKNOWN' }, null],
  ] as const)('%o → %o', (el, target) => {
    expect(cardTarget(el)).toEqual(target);
  });
});

describe('묶음 카드', () => {
  it('counts → 정해진 순서의 배지, 0개는 빼고 모르는 상태는 UNKNOWN 하나로', () => {
    expect(
      stateCounts({ GIFT_PENDING: 1, APPROVED: 2, ENTERED: 0, MYSTERY: 1, OTHER: 2 }).map(
        (c) => `${c.label} ${c.count}`,
      ),
    ).toEqual(['승인완료 2', '선물 대기중 1', '상태 확인 필요 3']);
  });

  it('즉시 발급 묶음(approvalRequired=false — #924)은 승인완료 대신 발급 완료, 값이 없으면 승인완료(운영 2.5.3)', () => {
    const labels = (approvalRequired?: boolean) =>
      stateCounts({ APPROVED: 1, ENTERED: 1 }, approvalRequired).map((c) => c.label);
    expect(labels(false)).toEqual(['발급 완료', '입장 완료']);
    expect(labels(true)).toEqual(['승인완료', '입장 완료']);
    expect(labels(undefined)).toEqual(['승인완료', '입장 완료']);
  });

  const group = {
    groupKey: 'ticket:T1000011',
    orderUuid: null,
    orderNo: null,
    isMyOrder: false,
    orderStatus: null,
    refuseReasonType: null,
    refuseReason: null,
    event: null,
    ticketName: '일반 예매',
    counts: { RECEIVED: 1 },
    tickets: [],
  };

  it('받은 티켓 묶음(orderUuid=null)에는 [주문상세]가 없다', () => {
    expect(toTicketGroupView(group).orderHref).toBeNull();
    expect(toTicketGroupView({ ...group, orderUuid: 'o-1' }).orderHref).toBe('/orders/o-1');
  });

  it('티켓 없는 승인 대기·거절 주문은 주문만 있는 묶음', () => {
    expect(toTicketGroupView(group)).toMatchObject({ orderOnly: true, total: 0 });
  });

  it.each([
    [0, 3, '1/3'],
    [2, 3, '3/3'],
    [5, 3, '3/3'],
    [-1, 3, '1/3'],
    [0, 0, null],
  ])('페이저 인덱스 %i / %i장 → %s', (i, total, label) => {
    expect(pagerLabel(i, total)).toBe(label);
  });

  it('인덱스는 장수가 줄어도 범위 안', () => {
    expect(clampIndex(4, 2)).toBe(1);
    expect(clampIndex(Number.NaN, 2)).toBe(0);
  });
});

describe('캐러셀 순서(이슈 #93 §3)', () => {
  const ev = (eventId: number, displayStatus: 'UPCOMING' | 'ONGOING' | 'PAST') => ({
    eventId,
    name: `공연 ${eventId}`,
    posterImageUrl: null,
    startAt: null,
    displayStatus,
  });
  it('다가오는·진행 중 → 지난 공연 → 삭제된 공연, 같은 무리 안은 서버 순서 그대로', () => {
    const groups = [
      { key: 'del1', event: null },
      { key: 'past1', event: ev(1, 'PAST') },
      { key: 'up1', event: ev(2, 'ONGOING') },
      { key: 'del2', event: null },
      { key: 'up2', event: ev(3, 'UPCOMING') },
      { key: 'past2', event: ev(4, 'PAST') },
    ];
    expect(sortTicketGroups(groups).map((g) => g.key)).toEqual([
      'up1',
      'up2',
      'past1',
      'past2',
      'del1',
      'del2',
    ]);
    // 원본 배열은 바꾸지 않는다
    expect(groups[0]!.key).toBe('del1');
  });
});

describe('공지 바(T-3 · Q55)', () => {
  const ev = (displayStatus: 'UPCOMING' | 'ONGOING' | 'PAST') => ({
    eventId: 1,
    name: '공연',
    posterImageUrl: null,
    startAt: null,
    displayStatus,
  });
  const ticket = {} as MyTicketGroup['tickets'][number];
  const groups = [
    { groupKey: 'g-a', orderUuid: 'o-a', event: ev('UPCOMING'), tickets: [ticket] },
    { groupKey: 'ticket:T1', orderUuid: null, event: null, tickets: [ticket] },
  ];
  const ongoing = [
    ...groups,
    { groupKey: 'g-on', orderUuid: 'o-on', event: ev('ONGOING'), tickets: [ticket] },
  ];

  it.each([
    ['T-3 아직', undefined, groups, { kind: 'DEFAULT' }],
    ['새 소식 없음', { hasNew: false, orderUuids: [] }, groups, { kind: 'DEFAULT' }],
    [
      '운영 2.5.3(refusedOrderUuids 없음) — 승인',
      { hasNew: true, orderUuids: ['o-a', 'o-b'] },
      groups,
      { kind: 'APPROVED', targetGroupKey: 'g-a' },
    ],
    [
      '승인 주문이 목록에 없으면 버튼 없이',
      { hasNew: true, orderUuids: ['o-x'], refusedOrderUuids: [] },
      groups,
      { kind: 'APPROVED', targetGroupKey: null },
    ],
    [
      '거절이 승인보다 먼저 — [티켓보기]는 O-3 주문 상세로',
      { hasNew: true, orderUuids: ['o-a'], refusedOrderUuids: ['o-r1', 'o-r2'] },
      ongoing,
      { kind: 'REFUSED', orderHref: '/orders/o-r1' },
    ],
    [
      '승인이 공연 중보다 먼저',
      { hasNew: true, orderUuids: ['o-a'], refusedOrderUuids: [] },
      ongoing,
      { kind: 'APPROVED', targetGroupKey: 'g-a' },
    ],
    ['새 소식 없고 공연 중', { hasNew: false, orderUuids: [] }, ongoing, { kind: 'ONGOING' }],
    ['T-3 실패해도 공연 중', undefined, ongoing, { kind: 'ONGOING' }],
    [
      '티켓 없는 주문 묶음(승인 대기 · 거절)은 공연 중으로 치지 않는다',
      { hasNew: false, orderUuids: [] },
      [{ groupKey: 'g-p', orderUuid: 'o-p', event: ev('ONGOING'), tickets: [] }],
      { kind: 'DEFAULT' },
    ],
    [
      '지난 공연은 공연 중이 아니다',
      { hasNew: false, orderUuids: [] },
      [{ groupKey: 'g-p', orderUuid: 'o-p', event: ev('PAST'), tickets: [ticket] }],
      { kind: 'DEFAULT' },
    ],
  ] as const)('%s', (_, notice, list, expected) => {
    expect(noticeBar(notice, list as unknown as Parameters<typeof noticeBar>[1])).toEqual(expected);
  });
});
