import type { MyEvent } from '../../event/schema';
import type { MyHost } from '../../host/schema';
import type { HostRole } from '../../shared/common-schema';
import { MOCK_IMAGE_ORIGIN } from '../respond';
import { events, type MockEvent, preparingEvents } from './event';
import { hosts } from './host';

/**
 * 공연준비 홈(P10a — GH-1 · GE-1) fixture. mock 사용자의 활성 멤버십에서 목록을 만든다.
 * 기본은 GM-1(`fixtures/me.ts`)과 같다 — 고스락(11)의 마스터 하나.
 */

/** 활성 멤버십 한 줄 */
export type MockMembership = {
  hostId: number;
  name: string | null;
  profileImageUrl: string | null;
  myRole: Exclude<HostRole, 'UNKNOWN'>;
};

const hostRow = (hostId: number, myRole: MockMembership['myRole']): MockMembership => {
  const host = hosts.find((h) => h.hostId === hostId)!;
  return { hostId, name: host.name, profileImageUrl: host.profileImageUrl, myRole };
};

/** 기본 멤버십 — GM-1 `hosts`와 같다 */
export const defaultMemberships: MockMembership[] = [hostRow(11, 'MASTER')];

/** 역할이 섞인 멤버십 — 카드의 호스트별 `myRole`(고스락 마스터 · 소음공작소 일반 멤버) */
export const mixedMemberships: MockMembership[] = [hostRow(11, 'MASTER'), hostRow(12, 'GUEST')];

/** 페이지를 넘기는 멤버십(기본 + 공연 없는 호스트 22개 = 24개, 역할은 돌아가며) */
export const manyMemberships: MockMembership[] = [
  ...mixedMemberships,
  ...Array.from({ length: 22 }, (_, i): MockMembership => {
    const hostId = 500 + i;
    const roles = ['MANAGER', 'GUEST', 'MASTER'] as const;
    return {
      hostId,
      name: `밴드 ${String(i + 1).padStart(2, '0')}`,
      profileImageUrl: i % 2 === 0 ? `${MOCK_IMAGE_ORIGIN}/host/${hostId}/profile.png` : null,
      myRole: roles[i % roles.length]!,
    };
  }),
];

/** 이 호스트의 공연(준비중 포함, 삭제 제외 — GH-1 `eventCount`·GE-1 범위) */
export const hostEventsOf = (hostId: number): MockEvent[] =>
  [...events, ...preparingEvents].filter((e) => e.host.hostId === hostId && e.status !== 'DELETED');

export const toMyHost = (m: MockMembership, eventCount: number): MyHost => ({
  hostId: m.hostId,
  name: m.name,
  profileImageUrl: m.profileImageUrl,
  myRole: m.myRole,
  eventCount,
});

export const toMyEvent = (e: MockEvent, myRole: MockMembership['myRole']): MyEvent => ({
  eventId: e.eventId,
  hostId: e.host.hostId,
  hostName: e.host.name,
  myRole,
  name: e.name,
  posterImageUrl: e.posterImageUrl,
  startAt: e.startAt,
  endAt: e.endAt,
  placeName: e.place?.name ?? null,
  placeAddress: e.place?.address ?? null,
  placeDetailAddress: e.place?.detailAddress ?? null,
  status: e.status,
  displayStatus: e.displayStatus,
  dDay: e.dDay,
});

/** PH-2로 만든 호스트가 받는 id의 시작값(fixture id와 겹치지 않게) */
export const CREATED_HOST_ID_START = 9001;
