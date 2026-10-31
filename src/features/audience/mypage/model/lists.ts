import type { ArchiveEvent, FollowingHostFilter, RepresentativeEvent } from '@/api/me/schema';

/**
 * 관심 호스트(GM-4) 필터 탭. 서버 `status` 3값을 그대로 쓴다 — 라벨은 design-requests 기본안("전체 / 공연 예정 / 지난 공연만").
 * `ACTIVE` = 진행 중·예정 공연이 있는 호스트, `ENDED` = 끝난 공개 공연만 있는 호스트(공개 공연이 없는 호스트는 `ALL`에만).
 */
export const FOLLOWING_TABS: readonly { status: FollowingHostFilter; label: string }[] = [
  { status: 'ALL', label: '전체' },
  { status: 'ACTIVE', label: '공연 예정' },
  { status: 'ENDED', label: '지난 공연만' },
];

/** 대표 공연 배지: 예정 D-n(당일 D-DAY) · 공연 중 · 공연 종료. 대표 공연이 없거나 모르는 상태면 null */
export function representativeBadge(event: RepresentativeEvent | null): string | null {
  if (!event) return null;
  switch (event.displayStatus) {
    case 'UPCOMING':
      return event.dDay === null ? null : event.dDay === 0 ? 'D-DAY' : `D-${event.dDay}`;
    case 'ONGOING':
      return '공연 중';
    case 'PAST':
      return '공연 종료';
    default:
      return null;
  }
}

export const hostHref = (hostId: number) => `/hosts/${hostId}`;
export const eventHref = (eventId: number) => `/events/${eventId}`;
export const orderHref = (orderUuid: string) => `/orders/${encodeURIComponent(orderUuid)}`;

/**
 * 아카이빙 공연 → 주문상세 주소. `orderUuid`가 null이면(선물받은 티켓으로만 입장) 주문상세로 가지 않는다(plan P9 완료 기준).
 */
export const archiveOrderHref = (event: Pick<ArchiveEvent, 'orderUuid'>) =>
  event.orderUuid ? orderHref(event.orderUuid) : null;

/** 아카이빙 연도 탭: 전체(`year` 없음) + 서버 `years`(최근 순, 전체 기준) */
export function archiveYearTabs(years: readonly number[]) {
  return [
    { year: null, label: '전체' },
    ...years.map((y) => ({ year: y as number | null, label: `${y}` })),
  ];
}
