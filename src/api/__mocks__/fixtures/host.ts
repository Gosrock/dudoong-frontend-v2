import type { HostMember, HostViewer } from '../../host/schema';
import { MOCK_IMAGE_ORIGIN } from '../respond';

/**
 * 호스트 fixture(GH-3). 사용자별 필드(`isFollowing`·`myRole`)는 익명 기준 값이고,
 * 액세스 토큰 쿠키가 실린 요청에는 핸들러가 `viewerOf`로 로그인 사용자 값을 덮는다.
 */
export const hosts: HostViewer[] = [
  {
    hostId: 11,
    name: '고스락',
    introduce: '홍익대학교 중앙 락밴드 동아리 고스락입니다. 1년에 두 번 정기공연을 열어요.',
    profileImageUrl: `${MOCK_IMAGE_ORIGIN}/host/11/profile.png`,
    coverImageUrl: `${MOCK_IMAGE_ORIGIN}/host/11/cover.jpeg`,
    contacts: [
      { type: 'INSTAGRAM', value: '@gosrock_official' },
      { type: 'YOUTUBE', value: 'https://www.youtube.com/@gosrock' },
      { type: 'EMAIL', value: 'gosrock@example.com' },
    ],
    createdAt: '2022.03.02 10:00',
    memberCount: 4,
    followerCount: 128,
    isFollowing: false,
    myRole: null,
  },
  {
    hostId: 12,
    name: '소음공작소',
    // 소개·이미지·연락처가 없는 호스트
    introduce: null,
    profileImageUrl: null,
    coverImageUrl: null,
    contacts: [],
    createdAt: null,
    memberCount: 1,
    followerCount: 0,
    isFollowing: false,
    myRole: null,
  },
];

/** 로그인한 mock 사용자(`me.ts`)가 보는 값. 고스락의 마스터이고 소음공작소를 팔로우한다 */
export function viewerOf(host: HostViewer): HostViewer {
  if (host.hostId === 11) return { ...host, myRole: 'MASTER' };
  if (host.hostId === 12)
    return { ...host, isFollowing: true, followerCount: host.followerCount + 1 };
  return host;
}

export const MISSING_HOST_ID = 999999;

/**
 * GH-6 활성 멤버. 마스터 → 매니저 → 일반 순(백엔드 정렬). 수는 GH-3 `memberCount`와 같다.
 * 고스락의 마스터는 로그인 mock 사용자(`me.ts`, userId 1)다.
 */
export const hostMembers: Record<number, HostMember[]> = {
  11: [
    { userId: 1, name: '두둥이', profileImageUrl: null, role: 'MASTER' },
    {
      userId: 2,
      name: '김매니저',
      profileImageUrl: `${MOCK_IMAGE_ORIGIN}/user/2/profile.png`,
      role: 'MANAGER',
    },
    { userId: 3, name: '이드럼', profileImageUrl: null, role: 'GUEST' },
    { userId: 4, name: null, profileImageUrl: null, role: 'GUEST' },
  ],
  12: [{ userId: 21, name: '소음대장', profileImageUrl: null, role: 'MASTER' }],
};
