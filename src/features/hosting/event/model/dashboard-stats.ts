import type { Dashboard } from '@/api/dashboard/schema';
import type { EventDisplayStatus } from '@/api/event/schema';

import { eventHref } from './event-scope';

/**
 * 등록 후 대시보드(GD-1, plan P13a) 파생값 — 통계 카드 4개·NEW 배지·티켓 판매 정보·입장 현황·일정 타임라인.
 * 근거: plan P13a L 범위, gui-screens §2·§3(통계 카드 승인 대기·승인 완료·승인 거절·환불 요청, 일정 패널), design-requests Q39·Q43.
 * 예매자 관리 주소는 공연 화면 경로 규칙(`eventHref`)을 따른다 — guest feature의 `guestsHref`와 같은 값.
 */

const guestsPath = (eventId: string | number, tab?: 'refunds') =>
  `${eventHref(eventId, 'guests')}${tab ? `?tab=${tab}` : ''}`;

export type DashboardStatCard = {
  key: 'pendingApprove' | 'approved' | 'refused' | 'refundRequested';
  label: string;
  count: number;
  /** ↗ 링크(예매자 관리 — 환불 요청은 환불 탭) */
  href: string;
};

/** 통계 카드 4개(GUI `669:2787` 순서). 상태 필터는 주소에 남기지 않으므로(tech-decisions §3) 주문 카드는 주문 탭으로만 간다 */
export function statCardsOf(d: Dashboard, eventId: string | number): DashboardStatCard[] {
  return [
    {
      key: 'pendingApprove',
      label: '승인 대기',
      count: d.orders.pendingApprove,
      href: guestsPath(eventId),
    },
    { key: 'approved', label: '승인 완료', count: d.orders.approved, href: guestsPath(eventId) },
    { key: 'refused', label: '승인 거절', count: d.orders.refused, href: guestsPath(eventId) },
    {
      key: 'refundRequested',
      label: '환불 요청',
      count: d.orders.refundRequested,
      href: guestsPath(eventId, 'refunds'),
    },
  ];
}

/** NEW 배지 수 = 승인 대기 주문 수(0이면 배지 없음 — 그리는 것은 V) */
export const newBadgeCountOf = (d: Pick<Dashboard, 'orders'>) => d.orders.pendingApprove;

/** 티켓 판매 정보 — 판매 0이면 "판매 전"(PC 판매 0 `745:32726`). 도넛 몫은 판매 매수 / 총 판매 매수 */
export function ticketSalesOf(d: Dashboard) {
  const total = d.tickets.totalSoldCount;
  return {
    state: total === 0 ? ('beforeSale' as const) : ('selling' as const),
    totalSoldCount: total,
    /** null = 무제한 티켓이 있다 */
    totalSupplyCount: d.tickets.totalSupplyCount,
    salesAmount: d.salesAmount,
    items: d.tickets.items.map((i) => ({
      ...i,
      share: total === 0 ? 0 : i.soldCount / total,
    })),
  };
}

/** 입장 현황 — 분모는 발급 수(`issuedCount`, 판매 장수가 아니다). 발급 0이면 0/0 */
export function entranceProgressOf(d: Pick<Dashboard, 'entranceStats'>) {
  const { issuedCount, enteredCount, entranceRate } = d.entranceStats;
  return {
    entered: enteredCount,
    issued: issuedCount,
    label: `${enteredCount}/${issuedCount}`,
    /** 0~1 — 진행 막대 */
    ratio: issuedCount === 0 ? 0 : enteredCount / issuedCount,
    rate: entranceRate,
  };
}

export type TimelineStepKey = 'registered' | 'promotion' | 'start' | 'done';
export type TimelineStep = {
  key: TimelineStepKey;
  label: string;
  /** 'yyyy.MM.dd HH:mm' — 기간이면 from·to */
  from: string | null;
  to: string | null;
  state: 'done' | 'current' | 'upcoming';
};

const STEP_LABEL: Record<TimelineStepKey, string> = {
  registered: '공연 등록',
  promotion: '공연 홍보 및 티켓 판매',
  start: '공연 시작',
  done: '공연 완료',
};

/**
 * 데스크탑 일정 패널 단계 타임라인(plan P13a). 공연 등록일 = 서버 `openedAt`, 홍보·판매 기간 = 등록일 ~ 공연 시작.
 * `openedAt`이 null이면(2026-10 이전 오픈) **등록 줄을 빼고** 홍보·판매는 "~ 공연 시작"으로만(design-requests Q43 기본안).
 * 현재 단계는 표시 상태로: 예정 = 홍보·판매, 진행중 = 공연 시작, 지난 공연 = 공연 완료. 공연 완료 단계의 날짜와 주간 줄 규칙은
 * design-requests Q39 대기 — 날짜를 넣지 않고 주간 줄은 만들지 않는다
 */
export function scheduleTimelineOf(input: {
  openedAt: string | null;
  startAt: string | null;
  displayStatus: EventDisplayStatus;
}): TimelineStep[] {
  const order: TimelineStepKey[] = ['registered', 'promotion', 'start', 'done'];
  const current: TimelineStepKey =
    input.displayStatus === 'PAST'
      ? 'done'
      : input.displayStatus === 'ONGOING'
        ? 'start'
        : 'promotion';
  const at = order.indexOf(current);
  const steps: TimelineStep[] = order.map((key, i) => ({
    key,
    label: STEP_LABEL[key],
    from:
      key === 'registered' || key === 'promotion'
        ? input.openedAt
        : key === 'start'
          ? input.startAt
          : null,
    to: key === 'promotion' ? input.startAt : null,
    state: i < at ? 'done' : i === at ? 'current' : 'upcoming',
  }));
  return input.openedAt === null ? steps.filter((s) => s.key !== 'registered') : steps;
}
