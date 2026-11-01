import type { MyTicketGroup, MyTicketState, NewApproved } from '@/api/my-ticket/schema';
import { MY_TICKET_STATES } from '@/api/my-ticket/schema';

import { TICKET_STATE_ORDER, ticketStateView, type TicketTone } from './my-ticket-state';

/** 묶음 카드의 상태별 개수 배지 하나 */
export type StateCount = { state: MyTicketState; label: string; tone: TicketTone; count: number };

const KNOWN = new Set<string>(MY_TICKET_STATES);

/**
 * `counts`(키가 열려 있는 맵) → 배지 목록. 정해진 순서로, 0개는 빼고, 모르는 상태는 UNKNOWN 하나로 합친다.
 */
export function stateCounts(counts: Record<string, number>): StateCount[] {
  const merged = new Map<MyTicketState, number>();
  for (const [key, count] of Object.entries(counts)) {
    if (!Number.isFinite(count) || count <= 0) continue;
    const state = (KNOWN.has(key) ? key : 'UNKNOWN') as MyTicketState;
    merged.set(state, (merged.get(state) ?? 0) + count);
  }
  return TICKET_STATE_ORDER.filter((s) => merged.has(s)).map((state) => ({
    state,
    ...ticketStateView(state),
    count: merged.get(state)!,
  }));
}

/** 묶음 카드에 필요한 파생값 */
export type TicketGroupView = {
  group: MyTicketGroup;
  key: string;
  counts: StateCount[];
  /** [주문상세] 주소. 받은 티켓 묶음(`orderUuid=null`)은 null — 버튼을 두지 않는다 */
  orderHref: string | null;
  /** 티켓 없이 주문만 있는 묶음(승인 대기·거절). 캐러셀·QR이 없다 */
  orderOnly: boolean;
  /** 티켓 장수(캐러셀 페이지 수) */
  total: number;
};

export const orderDetailHref = (orderUuid: string) => `/orders/${encodeURIComponent(orderUuid)}`;

export function toTicketGroupView(group: MyTicketGroup): TicketGroupView {
  return {
    group,
    key: group.groupKey,
    counts: stateCounts(group.counts),
    orderHref: group.orderUuid ? orderDetailHref(group.orderUuid) : null,
    orderOnly: group.tickets.length === 0,
    total: group.tickets.length,
  };
}

/**
 * 캐러셀 순서. 서버 T-1은 공연 임박순(종료 전 → 지난 공연)이지만 삭제된 공연(`event=null`) 묶음이 섞여 와
 * 앞쪽 카드를 가린다(이슈 #93 §3 — 스테이징 계정에 10장 넘게). 다가오는·진행 중 → 지난 공연 → 삭제된 공연으로 모으고,
 * 같은 무리 안에서는 서버 순서를 그대로 둔다(안정 정렬). 숨기지는 않는다 — 지난/삭제 티켓을 따로 보일지는 design-requests Q63
 */
const groupRank = (g: Pick<MyTicketGroup, 'event'>) =>
  g.event === null ? 2 : g.event.displayStatus === 'PAST' ? 1 : 0;

export function sortTicketGroups<T extends Pick<MyTicketGroup, 'event'>>(
  groups: readonly T[],
): T[] {
  return groups
    .map((g, i) => ({ g, i, r: groupRank(g) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.g);
}

/** 캐러셀 텍스트 페이저 `N/M`(1부터). 티켓이 없으면 null */
export const pagerLabel = (index: number, total: number) =>
  total > 0 ? `${clampIndex(index, total) + 1}/${total}` : null;

/** 묶음 안 인덱스를 범위 안으로(목록이 다시 와서 장수가 줄어도 깨지지 않게) */
export const clampIndex = (index: number, total: number) =>
  total <= 0 ? 0 : Math.min(Math.max(0, Math.trunc(index) || 0), total - 1);

/**
 * T-3 공지 바. `hasNew`면 보이고, [티켓 보러가기]는 `orderUuids[0]`의 묶음으로(목록에 없으면 첫 묶음 없이 null).
 * 티켓탭 진입만으로는 풀리지 않는다 — T-2를 열거나 알림을 읽어야 서버가 푼다.
 */
export function noticeBar(
  notice: NewApproved | undefined,
  groups: readonly Pick<MyTicketGroup, 'groupKey' | 'orderUuid'>[],
): { show: boolean; targetGroupKey: string | null } {
  if (!notice?.hasNew) return { show: false, targetGroupKey: null };
  const first = notice.orderUuids[0];
  const target = groups.find((g) => g.orderUuid !== null && g.orderUuid === first);
  return { show: true, targetGroupKey: target?.groupKey ?? null };
}
