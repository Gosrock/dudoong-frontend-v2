import type { MyTicketGroup, MyTicketState, NewApproved } from '@/api/my-ticket/schema';
import { MY_TICKET_STATES } from '@/api/my-ticket/schema';

import { TICKET_STATE_ORDER, ticketStateView, type TicketTone } from './my-ticket-state';

/** 묶음 카드의 상태별 개수 배지 하나 */
export type StateCount = { state: MyTicketState; label: string; tone: TicketTone; count: number };

const KNOWN = new Set<string>(MY_TICKET_STATES);

/**
 * `counts`(키가 열려 있는 맵) → 배지 목록. 정해진 순서로, 0개는 빼고, 모르는 상태는 UNKNOWN 하나로 합친다.
 */
export function stateCounts(
  counts: Record<string, number>,
  /** 묶음의 승인형 여부(#924). `false`면 승인완료 배지가 '발급 완료' */
  approvalRequired?: boolean,
): StateCount[] {
  const merged = new Map<MyTicketState, number>();
  for (const [key, count] of Object.entries(counts)) {
    if (!Number.isFinite(count) || count <= 0) continue;
    const state = (KNOWN.has(key) ? key : 'UNKNOWN') as MyTicketState;
    merged.set(state, (merged.get(state) ?? 0) + count);
  }
  return TICKET_STATE_ORDER.filter((s) => merged.has(s)).map((state) => ({
    state,
    ...ticketStateView(state, approvalRequired),
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
    counts: stateCounts(group.counts, group.approvalRequired),
    orderHref: group.orderUuid ? orderDetailHref(group.orderUuid) : null,
    orderOnly: group.tickets.length === 0,
    total: group.tickets.length,
  };
}

/**
 * 캐러셀 순서. 서버 T-1은 공연 임박순(종료 전 → 지난 공연)이지만 삭제된 공연(`event=null`) 묶음이 섞여 와
 * 앞쪽 카드를 가린다(이슈 #93 §3 — 스테이징 계정에 10장 넘게). 다가오는·진행 중 → 지난 공연 → 삭제된 공연으로 모으고,
 * 같은 무리 안에서는 서버 순서를 그대로 둔다(안정 정렬). 숨기지는 않는다 — 지난/삭제 티켓을 따로 보일지는 design-requests Q64
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
 * 티켓탭 공지 바(GUI `908:3276` — 승인 `939:29784` · 승인거절 `939:25571` · 공연중 `939:25755`, design-requests Q55).
 * - `REFUSED`: T-3 `refusedOrderUuids`(2.5.4~)가 있으면 "티켓 주문 승인이 거절되었습니다." + [티켓보기] → **O-3 주문 상세**
 *   (`refusedOrderUuids[0]`). O-3을 열어야 서버가 푼다(백엔드 #905 §2-2) — 티켓탭 묶음으로 넘기지 않는다
 * - `APPROVED`: `hasNew`면 "티켓 주문이 승인되었습니다!" + [티켓보기] → `orderUuids[0]`의 묶음(목록에 없으면 버튼 없이).
 *   티켓탭 진입만으로는 풀리지 않는다 — T-2를 열거나 알림을 읽어야 서버가 푼다
 * - `ONGOING`: 서버 값이 없다 — 티켓이 있는 묶음 중 공연이 진행 중이면(T-1 `event.displayStatus === 'ONGOING'`, 서버가 요청 시점에
 *   시작 ≤ 지금 < 종료로 계산 — T-1에는 종료 시각 필드가 없다) "공연이 시작되었습니다!"
 * - `DEFAULT`: 기본 Notice
 *
 * 우선순위 거절 > 승인 > 공연 중 > 기본 — Figma에 없어 정함(🤖 Claude 판단 2026-11-01: 놓치면 안 되는 것 · 할 일이 있는 것 먼저.
 * Figma 코멘트로 물음). T-3이 실패하거나 아직이면 승인·거절 없이 공연 중 · 기본만 본다.
 */
export type TicketNoticeBar =
  | { kind: 'REFUSED'; orderHref: string }
  | { kind: 'APPROVED'; targetGroupKey: string | null }
  | { kind: 'ONGOING' }
  | { kind: 'DEFAULT' };

/** T-3 응답. `refusedOrderUuids`는 2.5.4부터라 없을 수 있다(스키마는 빈 배열로 채운다) */
type NoticeInput = {
  hasNew: NewApproved['hasNew'];
  orderUuids: readonly string[];
  refusedOrderUuids?: readonly string[];
};

export function noticeBar(
  notice: NoticeInput | undefined,
  groups: readonly Pick<MyTicketGroup, 'groupKey' | 'orderUuid' | 'event' | 'tickets'>[],
): TicketNoticeBar {
  const refused = notice?.refusedOrderUuids?.[0];
  if (refused) return { kind: 'REFUSED', orderHref: orderDetailHref(refused) };
  if (notice?.hasNew) {
    const first = notice.orderUuids[0];
    const target = groups.find((g) => g.orderUuid !== null && g.orderUuid === first);
    return { kind: 'APPROVED', targetGroupKey: target?.groupKey ?? null };
  }
  if (groups.some((g) => g.tickets.length > 0 && g.event?.displayStatus === 'ONGOING')) {
    return { kind: 'ONGOING' };
  }
  return { kind: 'DEFAULT' };
}
