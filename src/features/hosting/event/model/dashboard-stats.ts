import type { Dashboard } from '@/api/dashboard/schema';
import type { EventDisplayStatus } from '@/api/event/schema';
import { eventHref } from '@/features/hosting/shared/model/event-scope';

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
export function statCardsOf(
  d: Pick<Dashboard, 'orders'>,
  eventId: string | number,
): DashboardStatCard[] {
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
    legend: salesLegendOf(
      d.tickets.items.map((i) => ({
        id: i.ticketItemId,
        name: i.name ?? UNNAMED_TICKET,
        count: i.soldCount,
      })),
    ),
  };
}

/** 이름 없는 티켓(서버 `name` null)의 범례 이름 */
export const UNNAMED_TICKET = '이름 없는 티켓';

/** 도넛 · 범례 색 자리 — 1~6은 판매량 순서 색, `other`는 「기타」 · 판매 0(회색) */
export type SalesTone = 1 | 2 | 3 | 4 | 5 | 6 | 'other';
export type SalesLegendItem = {
  id: string | number;
  name: string;
  count: number;
  tone: SalesTone;
  /** 판매 0 — 도넛에서 빠지고 범례 맨 아래에 흐리게 */
  faded: boolean;
};

/** 색을 따로 받는 티켓 수 — 7종 이상이면 상위 5개만 각자 색 */
const MAX_TONES = 6;
const TOP_WHEN_GROUPED = 5;

/**
 * 티켓 판매 정보 도넛 · 범례 규칙 — GUI `티켓 판매 정보_색·범례 가이드`(`1904:2952`, Design Sync #331 · 2026-11-21) 그대로.
 * - 판매량이 많은 티켓부터(같으면 서버 순서) 12시에서 시계 방향으로 그리고, 범례도 같은 순서
 * - 색은 6개까지만 쓰고 반복하지 않는다. 티켓이 7종 이상이면 상위 5개만 각자 색, 나머지는 회색 「기타 (n종)」로 묶는다
 * - 판매 0장 티켓은 도넛에서 빼고 범례 맨 아래에 회색으로 흐리게. 「기타」로 묶일 때는 같이 묶는다(묶음 합이 0이면 흐리게)
 */
export function salesLegendOf(
  items: readonly { id: string | number; name: string; count: number }[],
): SalesLegendItem[] {
  const sorted = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.count - a.item.count || a.index - b.index)
    .map(({ item }) => item);
  const grouped = sorted.length > MAX_TONES;
  const colored = sorted
    .filter((i) => i.count > 0)
    .slice(0, grouped ? TOP_WHEN_GROUPED : MAX_TONES);
  const legend: SalesLegendItem[] = colored.map((i, n) => ({
    ...i,
    tone: (n + 1) as SalesTone,
    faded: false,
  }));
  const rest = sorted.slice(colored.length);
  if (grouped && rest.length > 0) {
    const count = rest.reduce((sum, i) => sum + i.count, 0);
    legend.push({
      id: 'other',
      name: `기타 (${rest.length}종)`,
      count,
      tone: 'other',
      faded: count === 0,
    });
  } else {
    legend.push(...rest.map((i) => ({ ...i, tone: 'other' as const, faded: true })));
  }
  return legend;
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

export type TimelineStepKey = 'registered' | 'promotion' | 'start' | 'done' | 'canceled';
export type TimelineStep = {
  key: TimelineStepKey;
  label: string;
  /** 'yyyy.MM.dd HH:mm' — 기간이면 from·to */
  from: string | null;
  to: string | null;
  /** `canceled` = 취소된 공연의 마지막 단계(회색 점 + 회색 상자, "진행 중" 배지 없음 — GUI `일정 패널_v2` `현재 단계=공연 취소`) */
  state: 'done' | 'current' | 'upcoming' | 'canceled';
};

const STEP_LABEL: Record<TimelineStepKey, string> = {
  registered: '공연 등록',
  promotion: '공연 홍보 · 티켓 판매',
  start: '공연 당일',
  done: '공연 완료',
  canceled: '공연 취소',
};

/**
 * 데스크탑 일정 패널 단계 타임라인(plan P13a · GUI `일정 패널_v2` `1868:2240` — Design Sync #327 · #335, 2026-11-21).
 * 공연 등록일 = 서버 `openedAt`, 홍보·판매 기간 = 등록일 ~ 공연 시작, 공연 당일 = 시작 일시, 공연 완료 = 끝 일시(`endAt`).
 * `openedAt`이 null이면(2026-10 이전 오픈) **등록 줄을 빼고** 홍보·판매는 "~ 공연 시작"으로만(design-requests Q43 기본안).
 * 지금 단계는 표시 상태로: 예정 = 홍보·판매, 진행중 = 공연 당일, 지난 공연 = 모두 지남(GUI `현재 단계=공연 완료` — 강조 없음).
 * 취소된 공연(`canceledAt`)은 등록 · 홍보·판매(~ 취소일) 뒤에 "공연 취소"(취소 일시)로 끝난다 — 당일 · 완료 줄은 없다
 */
export function scheduleTimelineOf(input: {
  openedAt: string | null;
  startAt: string | null;
  endAt?: string | null;
  displayStatus: EventDisplayStatus;
  canceledAt?: string | null;
}): TimelineStep[] {
  const step = (
    key: TimelineStepKey,
    state: TimelineStep['state'],
    from: string | null,
    to: string | null = null,
  ): TimelineStep => ({ key, label: STEP_LABEL[key], from, to, state });
  const registered = input.openedAt === null ? [] : [step('registered', 'done', input.openedAt)];
  if (input.canceledAt) {
    return [
      ...registered,
      step('promotion', 'done', input.openedAt, input.canceledAt),
      step('canceled', 'canceled', input.canceledAt),
    ];
  }
  const order = ['promotion', 'start', 'done'] as const;
  const at =
    input.displayStatus === 'PAST'
      ? order.length // 모두 지남
      : input.displayStatus === 'ONGOING'
        ? 1
        : 0;
  const stateAt = (i: number) => (i < at ? 'done' : i === at ? 'current' : 'upcoming');
  return [
    ...registered,
    step('promotion', stateAt(0), input.openedAt, input.startAt),
    step('start', stateAt(1), input.startAt),
    step('done', stateAt(2), input.endAt ?? null),
  ];
}
