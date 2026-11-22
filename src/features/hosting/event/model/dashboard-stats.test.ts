import { describe, expect, it } from 'vitest';

import type { Dashboard } from '@/api/dashboard/schema';

import {
  entranceProgressOf,
  newBadgeCountOf,
  salesLegendOf,
  scheduleTimelineOf,
  statCardsOf,
  ticketSalesOf,
} from './dashboard-stats';

const dashboard = (over: Partial<Dashboard> = {}): Dashboard => ({
  orders: { pendingApprove: 3, approved: 5, refused: 1, refundRequested: 2 },
  tickets: {
    totalSoldCount: 8,
    totalSupplyCount: 100,
    items: [
      {
        ticketItemId: 1,
        name: 'A',
        payType: 'DUDOONG',
        soldCount: 6,
        supplyCount: 50,
        pendingApproveCount: 2,
      },
      {
        ticketItemId: 2,
        name: 'B',
        payType: 'FREE',
        soldCount: 2,
        supplyCount: 50,
        pendingApproveCount: 0,
      },
    ],
  },
  salesAmount: 90000,
  entranceStats: { issuedCount: 8, enteredCount: 2, notEnteredCount: 6, entranceRate: 25 },
  displayStatus: 'UPCOMING',
  dDay: 3,
  openedAt: '2026.10.20 12:00',
  ...over,
});

describe('등록 후 대시보드(GD-1) 파생값', () => {
  it('통계 카드 4개 — 순서와 링크(환불 요청은 환불 탭)', () => {
    expect(statCardsOf(dashboard(), 101).map((c) => [c.label, c.count, c.href])).toEqual([
      ['승인 대기', 3, '/hosting/events/101/guests'],
      ['승인 완료', 5, '/hosting/events/101/guests'],
      ['승인 거절', 1, '/hosting/events/101/guests'],
      ['환불 요청', 2, '/hosting/events/101/guests?tab=refunds'],
    ]);
  });

  it('NEW 배지 수 = 승인 대기 수', () => {
    expect(newBadgeCountOf(dashboard())).toBe(3);
    expect(
      newBadgeCountOf(
        dashboard({ orders: { pendingApprove: 0, approved: 0, refused: 0, refundRequested: 0 } }),
      ),
    ).toBe(0);
  });

  it('판매: 몫 = 판매 매수 / 총 판매 매수, 0이면 판매 전', () => {
    const s = ticketSalesOf(dashboard());
    expect([s.state, s.items.map((i) => i.share)]).toEqual(['selling', [0.75, 0.25]]);
    const none = ticketSalesOf(
      dashboard({ tickets: { totalSoldCount: 0, totalSupplyCount: null, items: [] } }),
    );
    expect([none.state, none.totalSupplyCount]).toEqual(['beforeSale', null]);
  });

  it.each([
    [{ issuedCount: 8, enteredCount: 2, notEnteredCount: 6, entranceRate: 25 }, '2/8', 0.25],
    [{ issuedCount: 0, enteredCount: 0, notEnteredCount: 0, entranceRate: 0 }, '0/0', 0],
  ])('입장 현황 분모 = 발급 수 %o → %s', (entranceStats, label, ratio) => {
    const e = entranceProgressOf({ entranceStats });
    expect([e.label, e.ratio]).toEqual([label, ratio]);
  });
});

describe('티켓 판매 도넛 · 범례 규칙(GUI 가이드 1904:2952 — #331)', () => {
  const t = (id: number, count: number) => ({ id, name: `T${id}`, count });
  const look = (l: ReturnType<typeof salesLegendOf>) =>
    l.map((x) => [x.name, x.count, x.tone, x.faded]);

  it('판매량 많은 순서로 색 1~ · 판매 0은 맨 아래 회색 흐리게(예시 A)', () => {
    expect(look(salesLegendOf([t(1, 10), t(2, 0), t(3, 30), t(4, 20)]))).toEqual([
      ['T3', 30, 1, false],
      ['T4', 20, 2, false],
      ['T1', 10, 3, false],
      ['T2', 0, 'other', true],
    ]);
  });

  it('같은 판매량이면 서버 순서 · 6종까지는 각자 색(반복 없음)', () => {
    const l = salesLegendOf([1, 2, 3, 4, 5, 6].map((id) => t(id, 5)));
    expect(l.map((x) => x.tone)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(l.map((x) => x.name)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6']);
  });

  it('7종 이상이면 상위 5개만 색, 나머지는 「기타 (n종)」 — 판매 0도 같이 묶는다(예시 B)', () => {
    const l = salesLegendOf([
      t(1, 32),
      t(2, 24),
      t(3, 18),
      t(4, 12),
      t(5, 8),
      t(6, 2),
      t(7, 1),
      t(8, 0),
    ]);
    expect(look(l)).toEqual([
      ['T1', 32, 1, false],
      ['T2', 24, 2, false],
      ['T3', 18, 3, false],
      ['T4', 12, 4, false],
      ['T5', 8, 5, false],
      ['기타 (3종)', 3, 'other', false],
    ]);
  });

  it('7종 이상인데 판매된 티켓이 적으면 판매 0 묶음은 흐린 「기타」', () => {
    const l = salesLegendOf([t(1, 3), ...[2, 3, 4, 5, 6, 7].map((id) => t(id, 0))]);
    expect(look(l)).toEqual([
      ['T1', 3, 1, false],
      ['기타 (6종)', 0, 'other', true],
    ]);
  });

  it('ticketSalesOf가 범례를 같이 준다(이름 없는 티켓 이름)', () => {
    const d = dashboard();
    d.tickets.items[1]!.name = null;
    expect(ticketSalesOf(d).legend.map((x) => x.name)).toEqual(['A', '이름 없는 티켓']);
  });
});

describe('일정 타임라인(GUI 일정 패널_v2 1868:2240)', () => {
  const steps = (s: ReturnType<typeof scheduleTimelineOf>) =>
    s.map((x) => [x.key, x.from, x.to, x.state]);
  const base = {
    openedAt: '2026.10.20 12:00',
    startAt: '2026.11.21 19:00',
    endAt: '2026.11.21 21:00',
  };

  it('등록일 = openedAt, 홍보·판매 = 등록일 ~ 공연 시작, 당일 = 시작, 완료 = 끝. 예정이면 홍보·판매가 지금 단계', () => {
    expect(steps(scheduleTimelineOf({ ...base, displayStatus: 'UPCOMING' }))).toEqual([
      ['registered', '2026.10.20 12:00', null, 'done'],
      ['promotion', '2026.10.20 12:00', '2026.11.21 19:00', 'current'],
      ['start', '2026.11.21 19:00', null, 'upcoming'],
      ['done', '2026.11.21 21:00', null, 'upcoming'],
    ]);
    expect(scheduleTimelineOf({ ...base, displayStatus: 'UPCOMING' }).map((x) => x.label)).toEqual([
      '공연 등록',
      '공연 홍보 · 티켓 판매',
      '공연 당일',
      '공연 완료',
    ]);
  });

  it('openedAt이 null이면(2026-10 이전 오픈) 등록 줄을 빼고 홍보·판매는 "~ 공연 시작"만(Q43 기본안)', () => {
    expect(
      steps(scheduleTimelineOf({ ...base, openedAt: null, displayStatus: 'UPCOMING' })),
    ).toEqual([
      ['promotion', null, '2026.11.21 19:00', 'current'],
      ['start', '2026.11.21 19:00', null, 'upcoming'],
      ['done', '2026.11.21 21:00', null, 'upcoming'],
    ]);
  });

  it.each([
    ['ONGOING', 'start'],
    ['UNKNOWN', 'promotion'],
  ] as const)('%s → 지금 단계 %s', (displayStatus, current) => {
    const s = scheduleTimelineOf({ openedAt: null, startAt: null, displayStatus });
    expect(s.find((x) => x.state === 'current')?.key).toBe(current);
  });

  it('지난 공연은 모두 지남(강조 없음 — 현재 단계=공연 완료)', () => {
    const s = scheduleTimelineOf({ ...base, displayStatus: 'PAST' });
    expect(s.map((x) => x.state)).toEqual(['done', 'done', 'done', 'done']);
  });

  it('취소된 공연 — 등록 · 홍보·판매(~ 취소일) 뒤 "공연 취소"로 끝난다', () => {
    expect(
      steps(
        scheduleTimelineOf({ ...base, displayStatus: 'UPCOMING', canceledAt: '2026.11.10 14:30' }),
      ),
    ).toEqual([
      ['registered', '2026.10.20 12:00', null, 'done'],
      ['promotion', '2026.10.20 12:00', '2026.11.10 14:30', 'done'],
      ['canceled', '2026.11.10 14:30', null, 'canceled'],
    ]);
  });
});
