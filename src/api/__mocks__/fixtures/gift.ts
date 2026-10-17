import type { GiftLandingViewer } from '../../gift/schema';
import { MOCK_IMAGE_ORIGIN } from '../respond';

/**
 * 선물 랜딩 fixture(GG-3). 키는 선물 토큰. 값은 익명이 보는 응답이고,
 * 로그인 요청에는 핸들러가 `viewerGifts`의 값을 쓴다(보낸 사람 본인 링크 등).
 * 대기 중(PENDING)이 아니면 `senderName`·`event`·`ticket`이 null이다.
 */
const event = {
  eventId: 101,
  name: '고스락 제37회 정기공연',
  posterImageUrl: `${MOCK_IMAGE_ORIGIN}/event/101/poster.jpeg`,
  startAt: '2026.10.17 19:00',
  placeName: '홍대 롤링홀',
};

const anonymous = { isLoggedIn: false, isReceiver: false, giftId: null } as const;
const closed = { senderName: null, event: null, ticket: null } as const;

export const gifts: Record<string, GiftLandingViewer> = {
  'mock-gift-available': {
    status: 'PENDING',
    viewState: 'AVAILABLE',
    senderName: '김*수',
    event,
    ticket: { ticketName: '일반 예매', unitPrice: 15000 },
    ...anonymous,
  },
  'mock-gift-accepted': {
    status: 'ACCEPTED',
    viewState: 'ALREADY_ACCEPTED',
    ...closed,
    ...anonymous,
  },
  'mock-gift-rejected': { status: 'REJECTED', viewState: 'REJECTED', ...closed, ...anonymous },
  'mock-gift-canceled': { status: 'CANCELED', viewState: 'CANCELED', ...closed, ...anonymous },
  // 대기 중인데 공연이 끝남. 대기 중이라 요약은 온다
  'mock-gift-expired': {
    status: 'PENDING',
    viewState: 'EXPIRED',
    senderName: '이*',
    event: { ...event, eventId: 90, name: '고스락 제36회 정기공연', startAt: '2026.05.16 18:00' },
    ticket: { ticketName: '무료 초대', unitPrice: 0 },
    ...anonymous,
  },
};

/** 로그인한 mock 사용자가 보는 값. 없는 토큰은 익명 값에 `isLoggedIn: true`만 바꾼다 */
export const viewerGifts: Record<string, Partial<GiftLandingViewer>> = {
  // 내가 보낸 선물 링크
  'mock-gift-available': { viewState: 'OWN_LINK', giftId: 301 },
  // 내가 받은 선물
  'mock-gift-accepted': { isReceiver: true },
};

export const MISSING_GIFT_TOKEN = 'mock-gift-missing';
