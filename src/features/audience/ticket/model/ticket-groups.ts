import type {
  MyTicketElement,
  MyTicketGroup,
  MyTicketState,
  NewApproved,
} from '@/api/my-ticket/schema';
import { MY_TICKET_STATES } from '@/api/my-ticket/schema';
import { orderHref } from '@/features/shared/routes';

import { TICKET_STATE_ORDER, ticketStateView, type TicketTone } from './my-ticket-state';

const KNOWN = new Set<string>(MY_TICKET_STATES);

/**
 * 묶음 카드 오른쪽 위 칩 하나(GUI `908:11275` 한 주문 2장 이상도 칩 하나 · 개수 없음 — 사용자 결정 2026-11-08, 카드 `1262:286`).
 * - 티켓이 있으면 **지금 페이저로 보고 있는 티켓**(`selectedTicket`)의 상태. 섞인 주문에서 어느 칩을 보일지는 GUI에 없어
 *   정함(🤖 Claude 판단 2026-11-08 — 되돌리기 쉬운 쪽. Figma 코멘트 #1989727894 답글)
 * - 티켓 없는 승인 대기·거절 주문은 `counts`의 상태(정해진 순서 첫 번째, 모르는 키는 UNKNOWN)
 * - 공연 진행 중이면 승인완료 대신 "공연중 ON AIR"(`939:25755`)
 */
export type CardChip =
  { kind: 'ON_AIR' } | { kind: 'STATE'; state: MyTicketState; label: string; tone: TicketTone };

/** 티켓 없는 묶음의 상태 — `counts`(키가 열린 맵)에서 0개를 빼고 정해진 순서 첫 번째. 없으면 null */
export function headState(counts: Record<string, number>): MyTicketState | null {
  const present = new Set<MyTicketState>();
  for (const [key, count] of Object.entries(counts)) {
    if (!Number.isFinite(count) || count <= 0) continue;
    present.add((KNOWN.has(key) ? key : 'UNKNOWN') as MyTicketState);
  }
  return TICKET_STATE_ORDER.find((s) => present.has(s)) ?? null;
}

export function cardChip(
  group: Pick<MyTicketGroup, 'counts' | 'approvalRequired' | 'event'>,
  ticket: Pick<MyTicketElement, 'state'> | null,
): CardChip | null {
  const state = ticket?.state ?? headState(group.counts);
  if (state === null) return null;
  if (state === 'APPROVED' && group.event?.displayStatus === 'ONGOING') return { kind: 'ON_AIR' };
  return { kind: 'STATE', state, ...ticketStateView(state, group.approvalRequired) };
}

/** 묶음 카드에 필요한 파생값 */
export type TicketGroupView = {
  group: MyTicketGroup;
  key: string;
  /** [주문상세] 주소. 받은 티켓 묶음(`orderUuid=null`)은 null — 버튼을 두지 않는다 */
  orderHref: string | null;
  /** 티켓 없이 주문만 있는 묶음(승인 대기·거절). 캐러셀·QR이 없다 */
  orderOnly: boolean;
  /** 티켓 장수(캐러셀 페이지 수) */
  total: number;
};

export function toTicketGroupView(group: MyTicketGroup): TicketGroupView {
  return {
    group,
    key: group.groupKey,
    orderHref: group.orderUuid ? orderHref(group.orderUuid) : null,
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
  if (refused) return { kind: 'REFUSED', orderHref: orderHref(refused) };
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
