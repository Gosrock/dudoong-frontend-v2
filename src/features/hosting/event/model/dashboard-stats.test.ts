import { describe, expect, it } from 'vitest';

import type { Dashboard } from '@/api/dashboard/schema';

import {
  entranceProgressOf,
  newBadgeCountOf,
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

describe('일정 타임라인', () => {
  const steps = (s: ReturnType<typeof scheduleTimelineOf>) =>
    s.map((x) => [x.key, x.from, x.to, x.state]);

  it('등록일 = openedAt, 홍보·판매 = 등록일 ~ 공연 시작, 예정이면 홍보·판매가 지금 단계', () => {
    expect(
      steps(
        scheduleTimelineOf({
          openedAt: '2026.10.20 12:00',
          startAt: '2026.11.21 19:00',
          displayStatus: 'UPCOMING',
        }),
      ),
    ).toEqual([
      ['registered', '2026.10.20 12:00', null, 'done'],
      ['promotion', '2026.10.20 12:00', '2026.11.21 19:00', 'current'],
      ['start', '2026.11.21 19:00', null, 'upcoming'],
      ['done', null, null, 'upcoming'],
    ]);
  });

  it('openedAt이 null이면(2026-10 이전 오픈) 등록 줄을 빼고 홍보·판매는 "~ 공연 시작"만(Q43 기본안)', () => {
    expect(
      steps(
        scheduleTimelineOf({
          openedAt: null,
          startAt: '2026.11.21 19:00',
          displayStatus: 'UPCOMING',
        }),
      ),
    ).toEqual([
      ['promotion', null, '2026.11.21 19:00', 'current'],
      ['start', '2026.11.21 19:00', null, 'upcoming'],
      ['done', null, null, 'upcoming'],
    ]);
  });

  it.each([
    ['ONGOING', 'start'],
    ['PAST', 'done'],
    ['UNKNOWN', 'promotion'],
  ] as const)('%s → 지금 단계 %s', (displayStatus, current) => {
    const s = scheduleTimelineOf({ openedAt: null, startAt: null, displayStatus });
    expect(s.find((x) => x.state === 'current')?.key).toBe(current);
  });
});
