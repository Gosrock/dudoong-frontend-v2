import type { ArchiveEvent, FollowingHost, RepresentativeEvent } from '../../me/schema';
import { MOCK_IMAGE_ORIGIN } from '../respond';
import { findPublicEvent } from './event';
import { P9_ORDER } from './order';

/**
 * 마이페이지 fixture — GM-4 관심 호스트, GM-5 아카이빙. 근거: 백엔드 `V2MyPageResponses.kt`·`V2ReadFollowingHostsUseCase`·
 * `V2ReadArchiveUseCase`(@432cce4). 로그인 mock 사용자(`me.ts`)는 소음공작소(12)를 팔로우한다(`host.ts` `viewerOf`와 같다).
 */

const fromEvent = (eventId: number): RepresentativeEvent => {
  const e = findPublicEvent(eventId)!;
  return {
    eventId: e.eventId,
    name: e.name,
    posterImageUrl: e.posterImageUrl,
    startAt: e.startAt,
    endAt: e.endAt,
    displayStatus: e.displayStatus,
    dDay: e.dDay,
  };
};

const pastEvent = (eventId: number, name: string, startAt: string): RepresentativeEvent => ({
  eventId,
  name,
  posterImageUrl: `${MOCK_IMAGE_ORIGIN}/event/${eventId}/poster.jpeg`,
  startAt,
  endAt: startAt,
  displayStatus: 'PAST',
  dDay: null,
});

/** 팔로우 중인 호스트(최근 팔로우 순). 25명 — 기본 페이지(20)보다 많다 */
export const followingHosts: FollowingHost[] = [
  // 진행 중·예정 공연 있음(ACTIVE)
  {
    hostId: 12,
    name: '소음공작소',
    profileImageUrl: null,
    representativeEvent: fromEvent(102),
  },
  // 끝난 공연만(ENDED)
  {
    hostId: 31,
    name: '밴드 파도',
    profileImageUrl: `${MOCK_IMAGE_ORIGIN}/host/31/profile.png`,
    representativeEvent: pastEvent(301, '파도 단독 공연', '2026.06.06 19:00'),
  },
  // 공개 공연이 없음(ALL에만)
  { hostId: 32, name: '새벽세시', profileImageUrl: null, representativeEvent: null },
  ...Array.from({ length: 22 }, (_, i): FollowingHost => ({
    hostId: 40 + i,
    name: `팔로우 호스트 ${i + 1}`,
    profileImageUrl: null,
    representativeEvent:
      i % 2 === 0
        ? {
            eventId: 400 + i,
            name: `예정 공연 ${i + 1}`,
            posterImageUrl: null,
            startAt: '2026.12.20 19:00',
            endAt: '2026.12.20 21:00',
            displayStatus: 'UPCOMING',
            dDay: 56,
          }
        : pastEvent(400 + i, `지난 공연 ${i + 1}`, '2026.03.01 19:00'),
  })),
];

/** 이 목록의 호스트가 GM-4 `status` 필터에 드는지(`V2FollowingHostFilter`) */
export function matchesFollowingFilter(host: FollowingHost, status: string) {
  const s = host.representativeEvent?.displayStatus;
  if (status === 'ACTIVE') return s === 'UPCOMING' || s === 'ONGOING';
  if (status === 'ENDED') return s === 'PAST';
  return true;
}

/** GM-5 관람 공연(최근 공연 순). 2026년 2개 · 2025년 1개 */
export const archiveEvents: ArchiveEvent[] = [
  {
    eventId: 91,
    name: '여름밤 재즈',
    posterImageUrl: findPublicEvent(91)?.posterImageUrl ?? null,
    startAt: '2026.08.23 19:00',
    host: { hostId: 12, name: '소음공작소' },
    // 선물받은 티켓으로만 입장 — 주문상세로 가지 않는다
    orderUuid: null,
  },
  {
    eventId: 90,
    name: '고스락 제36회 정기공연',
    posterImageUrl: findPublicEvent(90)?.posterImageUrl ?? null,
    startAt: '2026.05.16 18:00',
    host: { hostId: 11, name: '고스락' },
    orderUuid: P9_ORDER.pastWithGift,
  },
  {
    eventId: 80,
    name: '고스락 제35회 정기공연',
    posterImageUrl: null,
    startAt: '2025.11.15 18:00',
    host: { hostId: 11, name: '고스락' },
    orderUuid: null,
  },
];

/** 연도 탭(공연 시작 연도, 최근 순) */
export const archiveYears = [
  ...new Set(archiveEvents.map((e) => Number(e.startAt!.slice(0, 4)))),
].sort((a, b) => b - a);
