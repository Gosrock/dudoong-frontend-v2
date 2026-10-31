import type { EventManage, EventStatus } from '@/api/event/schema';
import { type ActorRole, can, superAdminOrRole } from '@/features/shared/permission/model/can';

/**
 * 공연 스코프(`/hosting/events/[eventId]/…`, plan P11) 규칙 — 등록 상태별 메뉴, 읽기 전용 판정, 티켓 여부 잠금, 삭제 가능.
 * 근거: api-contract §2(권한)·§6(공연 — 등록 후 `hasTicket`만 잠김, 정산중·지난 공연 수정 불가, 삭제는 준비중만),
 * tech-decisions §3(공연 사이드바 — 등록 전 4 / 등록 후 6), 백엔드 `V2EventDomainService.validateEditable`·`deleteEventSoft`(432cce4).
 */

/** 주소의 공연 id — 숫자만(아니면 요청 없이 공용 404). 호스트 id(`parseHostIdParam`)와 같은 규칙 */
export function parseEventIdParam(value: string): string | null {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? value : null;
}

/** 등록(OPEN)된 적이 있는 공연인지 — 준비중이 아니면 등록 뒤다(OPEN → PREPARING은 없다, api-contract §3) */
export const isRegistered = (status: EventStatus) => status !== 'PREPARING';

export const eventHref = (eventId: string | number, menu: EventMenuKey) =>
  `/hosting/events/${eventId}/${menu}`;

/** 공연 메뉴 — 순서는 GUI 사이드바(`727:23210`, 등록 후 `669:2350`) */
const MENU = [
  { key: 'dashboard', label: '대시보드', registeredOnly: false },
  { key: 'info', label: '기본 정보', registeredOnly: false },
  { key: 'detail', label: '상세 정보', registeredOnly: false },
  { key: 'tickets', label: '티켓 관리', registeredOnly: false },
  { key: 'guests', label: '예매자 관리', registeredOnly: true },
  { key: 'qr', label: 'QR 체크인', registeredOnly: true },
] as const;
export type EventMenuKey = (typeof MENU)[number]['key'];

export type EventMenuItem = { key: EventMenuKey; label: string; href: string };

/** 등록 전 4개(대시보드 · 기본 정보 · 상세 정보 · 티켓 관리) / 등록 후 6개(+ 예매자 관리 · QR 체크인) */
export function eventMenuOf(eventId: string | number, status: EventStatus): EventMenuItem[] {
  const registered = isRegistered(status);
  return MENU.filter((m) => registered || !m.registeredOnly).map((m) => ({
    key: m.key,
    label: m.label,
    href: eventHref(eventId, m.key),
  }));
}

/** "공연 페이지 보기"(등록 후만) — 관객 공연 상세 */
export const eventPublicHref = (eventId: string | number, status: EventStatus) =>
  isRegistered(status) ? `/events/${eventId}` : null;

/**
 * 읽기 전용인 이유. `role` — 일반 멤버(관리 화면은 볼 수만 있다, api-contract §2), `ended` — 정산중·지난 공연(`Event_400_17`).
 * 둘 다면 역할을 먼저 말한다. 모르는 상태(`UNKNOWN`)도 수정하지 않는다(서버가 상태를 늘려도 잘못 열리지 않게).
 * GE-3은 일반 멤버 이상(G+) 조회라 `myRole: null`은 멤버가 아닌 SUPER_ADMIN이다 — 막지 않는다(`superAdminOrRole`, 사용자 결정 2026-10-31)
 */
export type ReadOnlyReason = 'role' | 'ended';

export function readOnlyReasonOf(
  event: Pick<EventManage, 'myRole' | 'status'>,
): ReadOnlyReason | null {
  if (!can(superAdminOrRole(event.myRole), 'editEvent')) return 'role';
  if (event.status !== 'PREPARING' && event.status !== 'OPEN') return 'ended';
  return null;
}

export const READ_ONLY_MESSAGE: Record<ReadOnlyReason, string> = {
  role: '일반 멤버는 공연 정보를 볼 수만 있어요',
  ended: '끝난 공연은 수정할 수 없어요',
};

/** 티켓 여부는 준비중일 때만 바꿀 수 있다(등록 후 잠금 — `Event_400_18`) */
export const isHasTicketLocked = (status: EventStatus) => status !== 'PREPARING';

/**
 * 공연을 지울 수 있는지(DE-9) — 준비중 공연 + 매니저 이상만. 등록 후에는 삭제가 없다(`Event_400_19`).
 * 공연준비 홈 공연 카드의 ⋮(P10a — GE-1 `myRole`)와 공연 화면(GE-3 — `useEventScope().role`, SUPER_ADMIN 포함)이 같이 쓴다
 */
export const canDeleteEvent = (event: { status: EventStatus; myRole: ActorRole | null }) =>
  event.status === 'PREPARING' && can(event.myRole, 'editEvent');
