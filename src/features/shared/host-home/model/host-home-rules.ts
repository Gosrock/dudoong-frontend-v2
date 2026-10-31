import type { HostEvent } from '@/api/host/schema';
import type { HostRole } from '@/api/shared/common-schema';
import { can, type HostAction } from '@/features/shared/permission/model/can';

/**
 * 주소의 `[hostId]` → 백엔드에 보낼 id. 숫자가 아니면 null(라우트가 `notFound()`).
 * 숫자가 아닌 id는 백엔드가 401(비로그인)·400 `BAD_REQUEST`(로그인) → 서버 조회 500이 되므로 조회 전에 404로 끊는다.
 * 앞의 0은 뗀다(공연 상세와 같은 규칙).
 */
export function parseHostIdParam(raw: string): string | null {
  if (!/^\d{1,16}$/.test(raw)) return null;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  return String(id);
}

/**
 * 호스트 공연 카드의 이동 대상. 준비중 공연은 공개 상세(`/events/[id]`)가 404라 멤버에게는 호스팅 센터로 보낸다
 * (plan P5c — `/hosting/events/[id]`는 `redirects()`로 대시보드). 비멤버 목록에는 준비중이 오지 않는다.
 */
export function hostEventHref(event: Pick<HostEvent, 'eventId' | 'status'>): string {
  return event.status === 'PREPARING'
    ? `/hosting/events/${event.eventId}`
    : `/events/${event.eventId}`;
}

export type HostManageKey = 'settings' | 'members' | 'newEvent';
export type HostManageAction = { key: HostManageKey; href: string };

/**
 * 호스트 홈 관리 버튼(설정 · 멤버 · 새 공연)과 필요한 권한(api-contract §2).
 * 멤버 목록은 일반 멤버도 읽기 전용으로 본다(GH-6 G+). 설정(PH-4)·새 공연은 매니저 이상.
 */
const MANAGE: { key: HostManageKey; action: HostAction; href: (hostId: string) => string }[] = [
  { key: 'settings', action: 'editHost', href: (id) => `/hosting/hosts/${id}/settings` },
  { key: 'members', action: 'viewManagement', href: (id) => `/hosting/hosts/${id}/members` },
  { key: 'newEvent', action: 'editEvent', href: (id) => `/hosting/new/events?hostId=${id}` },
];

/** `myRole`로 보이는 관리 버튼. 비멤버·모르는 역할은 빈 배열 */
export function hostManageActions(
  hostId: string | number,
  myRole: HostRole | null,
): HostManageAction[] {
  return MANAGE.filter((m) => can(myRole, m.action)).map((m) => ({
    key: m.key,
    href: m.href(String(hostId)),
  }));
}
