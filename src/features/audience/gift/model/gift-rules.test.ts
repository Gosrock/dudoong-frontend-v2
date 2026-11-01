import { describe, expect, it } from 'vitest';

import { GIFT_VIEW_STATES, GiftViewStateSchema } from '@/api/gift/schema';

import { GIFT_ERROR_TABLE, giftErrorOutcome } from './gift-errors';
import { giftLandingScreen } from './gift-landing-state';
import { changeMemoBody, createGiftBody, giftMemoError } from './gift-memo';
import { giftMetadata, parseGiftToken } from './gift-metadata';
import { giftLinkUrl, giftShare } from './gift-share';

const anon = { isReceiver: false, giftId: null };
const sender = { isReceiver: false, giftId: 301 };

describe('랜딩 viewState 7종 → 화면 상태', () => {
  it.each([
    ['AVAILABLE', anon, '티켓 선물이 도착했어요', ['ACCEPT', 'REJECT'], true],
    [
      'ALREADY_ACCEPTED',
      { isReceiver: true, giftId: null },
      '이미 받은 선물이에요',
      ['GO_TICKETS'],
      false,
    ],
    ['ALREADY_ACCEPTED', anon, '이미 다른 분이 받은 선물이에요', ['GO_TICKETS'], false],
    ['REJECTED', anon, '거절한 선물이에요', ['GO_TICKETS'], false],
    ['RETURNED', anon, '보낸 분에게 돌려준 선물이에요', ['GO_TICKETS'], false],
    ['CANCELED', anon, '취소된 선물이에요', ['GO_TICKETS'], false],
    ['OWN_LINK', sender, '내가 보낸 선물 링크예요', ['CANCEL_GIFT', 'GO_TICKETS'], true],
    ['OWN_LINK', anon, '내가 보낸 선물 링크예요', ['GO_TICKETS'], true],
    ['EXPIRED', sender, '공연이 끝나 받을 수 없는 선물이에요', ['CANCEL_GIFT', 'GO_TICKETS'], true],
    ['EXPIRED', anon, '공연이 끝나 받을 수 없는 선물이에요', ['GO_TICKETS'], true],
    ['UNKNOWN', anon, '선물 상태를 확인할 수 없어요', ['GO_TICKETS'], false],
  ] as const)('%s(%o) → "%s" %o', (viewState, viewer, title, actions, showSummary) => {
    expect(giftLandingScreen(viewState, viewer)).toMatchObject({ title, actions, showSummary });
  });

  it('수락·거절 버튼은 AVAILABLE에만 있다', () => {
    for (const v of [...GIFT_VIEW_STATES, 'UNKNOWN'] as const) {
      const has = giftLandingScreen(v, sender).actions.includes('ACCEPT');
      expect(has).toBe(v === 'AVAILABLE');
    }
  });

  it('모르는 viewState는 UNKNOWN', () => {
    expect(GiftViewStateSchema.parse('HELD')).toBe('UNKNOWN');
  });
});

describe('에러 분기 — patterns §24 P8b 행', () => {
  it.each([
    ['send', 'Gift_400_1', ['ticket'], {}],
    ['send', 'Gift_400_2', ['ticket'], { showExistingLink: true }],
    ['send', 'Gift_400_9', [], { field: 'memo' }],
    ['send', 'IssuedTicket_404_1', ['tickets'], {}],
    ['accept', 'Gift_400_3', ['landing'], {}],
    ['accept', 'Gift_400_4', ['landing'], {}],
    ['accept', 'Gift_400_5', ['landing'], {}],
    ['accept', 'Gift_400_6', ['landing'], { treatAsCanceled: true }],
    ['reject', 'Gift_400_3', ['landing'], {}],
    ['reject', 'Gift_400_4', ['landing'], {}],
    ['reject', 'Gift_400_5', ['landing'], {}],
    ['reject', 'Gift_400_6', ['landing'], { treatAsCanceled: true }],
    ['cancel', 'Gift_400_3', ['ticket', 'landing'], {}],
    ['cancel', 'Gift_404_1', ['tickets'], {}],
    ['memo', 'Gift_400_3', ['ticket'], {}],
    ['memo', 'Gift_400_9', [], { field: 'memo' }],
    ['memo', 'Gift_404_1', ['tickets'], {}],
    ['return', 'Gift_400_8', ['tickets'], {}],
    ['return', 'Gift_400_7', ['ticket'], {}],
    ['return', 'IssuedTicket_404_1', ['tickets'], {}],
  ] as const)('%s %s → 다시 읽기 %o', (action, code, refetch, extra) => {
    expect(giftErrorOutcome(action, code)).toMatchObject({ refetch, ...extra });
  });

  it.each([
    ['send', 'Gift_400_3'],
    ['accept', 'GLOBAL_500_1'],
    ['accept', null],
  ] as const)('%s %s → 표에 없음(전역 reason 토스트)', (action, code) => {
    expect(giftErrorOutcome(action, code)).toBeNull();
  });

  it('표의 모든 행에 화면 문구가 있다', () => {
    for (const table of Object.values(GIFT_ERROR_TABLE)) {
      for (const outcome of Object.values(table)) expect(outcome.message).not.toBe('');
    }
  });
});

describe('메모', () => {
  it.each([
    ['', null],
    ['  ', null],
    ['가'.repeat(50), null],
    [` ${'가'.repeat(50)} `, null],
    ['가'.repeat(51), '메모는 50자까지 쓸 수 있어요'],
  ])('%j → %s', (memo, error) => {
    expect(giftMemoError(memo)).toBe(error);
  });

  it('PG-1은 빈 메모면 {}, PG-8은 빈 값 = 삭제', () => {
    expect(createGiftBody('  ')).toEqual({});
    expect(createGiftBody(' 동생 ')).toEqual({ memo: '동생' });
    expect(changeMemoBody(null)).toEqual({ memo: '' });
    expect(changeMemoBody(' 친구 ')).toEqual({ memo: '친구' });
  });
});

describe('링크와 공유 내용', () => {
  it('링크 = origin + linkPath', () => {
    expect(giftLinkUrl('https://dudoong.com/', '/gifts/abc')).toBe('https://dudoong.com/gifts/abc');
    expect(giftLinkUrl('https://dudoong.com', 'gifts/abc')).toBe('https://dudoong.com/gifts/abc');
  });

  it('[메시지]는 sms: 링크(제목 · 요약 · 링크 본문), [카카오톡]은 공유 피드 템플릿(공연·티켓 요약만)', () => {
    const share = giftShare({
      origin: 'https://dudoong.com',
      linkPath: '/gifts/abc_DEF-1',
      eventName: '고스락 제37회 정기공연',
      posterImageUrl: 'https://image.dudoong.com/p.jpeg',
      ticketName: '일반 예매',
    });
    expect(share.url).toBe('https://dudoong.com/gifts/abc_DEF-1');
    expect(share.smsHref).toBe(
      `sms:?body=${encodeURIComponent(
        '두둥 티켓 선물이 도착했어요\n고스락 제37회 정기공연 · 일반 예매\nhttps://dudoong.com/gifts/abc_DEF-1',
      )}`,
    );
    expect(share.kakao).toEqual({
      objectType: 'feed',
      content: {
        title: '두둥 티켓 선물이 도착했어요',
        description: '고스락 제37회 정기공연 · 일반 예매',
        imageUrl: 'https://image.dudoong.com/p.jpeg',
        link: { mobileWebUrl: share.url, webUrl: share.url },
      },
      buttons: [{ title: '선물 받기', link: { mobileWebUrl: share.url, webUrl: share.url } }],
    });
  });
});

describe('랜딩 OG', () => {
  const event = {
    eventId: 101,
    name: '고스락 제37회 정기공연',
    posterImageUrl: 'https://image.dudoong.com/p.jpeg',
    startAt: '2026.11.21 19:00',
    placeName: '홍대 롤링홀',
  };

  it('공연·티켓 요약만 — 보낸 사람 닉네임이 없고 noindex', () => {
    const meta = giftMetadata({ event, ticket: { ticketName: '일반 예매', unitPrice: 15000 } });
    expect(meta).toMatchObject({
      title: '고스락 제37회 정기공연 티켓 선물',
      description: '2026.11.21 19:00 · 홍대 롤링홀 · 일반 예매',
      robots: { index: false, follow: false },
    });
    expect(JSON.stringify(meta)).not.toMatch(/\*|김|senderName/);
  });

  it('대기 중이 아니면(요약 없음) 기본 문구', () => {
    expect(giftMetadata({ event: null, ticket: null })).toMatchObject({
      title: '두둥 티켓 선물',
      description: '티켓 선물이 도착했어요. 두둥에서 받아 보세요',
    });
  });

  it.each([
    ['mock-gift-available', 'mock-gift-available'],
    ['abc_DEF-123', 'abc_DEF-123'],
    ['a'.repeat(65), null],
    ['abc%2F..', null],
    ['', null],
  ])('토큰 %s → %s', (raw, token) => {
    expect(parseGiftToken(raw)).toBe(token);
  });
});
