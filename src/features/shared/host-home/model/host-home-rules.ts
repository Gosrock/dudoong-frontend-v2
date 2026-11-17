import type { HostEvent } from '@/api/host/schema';
import type { HostRole } from '@/api/shared/common-schema';
import { can, type HostAction } from '@/features/shared/permission/model/can';
import { eventHref } from '@/features/shared/routes';

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
    : eventHref(event.eventId);
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

/** 호스트 홈 연락처 아이콘 줄에 한 번에 보이는 수(GUI `1481:7911` 4개 이하 · `741:30896` 넘으면 3개 + ⋯) */
export const HOST_CONTACT_ICONS_MAX = 4;

/**
 * 연락처 아이콘 줄(L 변경 — P5c GUI, Design Sync #257). 4개 이하면 모두, 넘으면 앞의 3개 + [⋯ 전체 보기].
 * 같은 유형이 여럿이면 여럿 그대로 보인다(`1481:7454` — 전화 2개). 순서는 서버 순서.
 */
export function contactIconsOf<T>(items: readonly T[]): { shown: T[]; more: boolean } {
  if (items.length <= HOST_CONTACT_ICONS_MAX) return { shown: [...items], more: false };
  return { shown: items.slice(0, HOST_CONTACT_ICONS_MAX - 1), more: true };
}

/** 취소된 공연 카드 칩(H-14 `canceledAt` — 백엔드 #274 §1-1, 디자인 없음 Q124 · 공연준비 홈 카드와 같은 글자 · 모양) */
export const HOST_EVENT_CANCELED_LABEL = '취소됨';

/** 호스트 공연 리스트 화면(GUI `1423:2651` · `1478:8878`, Design Sync #262) */
export const hostEventsHref = (hostId: string | number) => `/hosts/${hostId}/events`;

/**
 * 호스트 홈 연락처 아이콘 하나를 눌렀을 때(L 변경 — Design Sync #281 · #287 · #291, 2026-11-16 Ready).
 * - `login` — 로그인 전 가린 값(전화 · 이메일)을 익명이 누름 → "로그인이 필요해요"(GUI `1484:8106` · PC `1495:9888`)
 * - `sheet` — 가린 값인데 아직 내가 누군지 모름(확인 중 · 실패) → 연락처 전체 보기(원문이 오면 바뀐다)
 * - `link` — 인스타그램 · 유튜브 · 오픈채팅 · 기타(링크)는 바로 연다(#281 "바로 링크가 열림")
 * - `popup` — 전화 · 이메일 · 기타(글자)는 연락처 팝업(`1529:13695` — 값 + 복사 + [전화 걸기] · [메일 쓰기] · [닫기])
 * 링크로 열 수 없는 인스타그램 · 유튜브 · 오픈채팅 값(형식이 안 맞는 글자)은 팝업으로 글자를 보여 준다(🤖 — Figma에 없음).
 */
export type HostContactTap = 'login' | 'sheet' | 'link' | 'popup';

export function hostContactTapOf(
  contact: { type: string; href: string | null; masked: boolean },
  anonymous: boolean,
): HostContactTap {
  if (contact.masked) return anonymous ? 'login' : 'sheet';
  if (contact.type === 'PHONE' || contact.type === 'EMAIL') return 'popup';
  return contact.href ? 'link' : 'popup';
}

/** 연락처 팝업 버튼(`1529:13695`) — 전화 [전화 걸기] · 이메일 [메일 쓰기]는 링크, 그 밖(기타 글자 · 형식이 안 맞는 값)은 [닫기] */
export function hostContactPopupActionOf(contact: {
  type: string;
  href: string | null;
}): { label: string; href: string } | null {
  if (!contact.href) return null;
  if (contact.type === 'PHONE') return { label: '전화 걸기', href: contact.href };
  if (contact.type === 'EMAIL') return { label: '메일 쓰기', href: contact.href };
  return null;
}
