import { describe, expect, it } from 'vitest';

import { GIFT_CANCEL_REASONS, GiftCancelReasonSchema, GiftResultSchema } from './schema';

/** 근거: 백엔드 `TicketGiftCancelReason`(@432cce4 — `ADMIN`은 #819·#826) */
describe('선물 취소 이유(cancelReason)', () => {
  it('백엔드 enum 5종을 모두 안다', () => {
    expect(GIFT_CANCEL_REASONS).toEqual([
      'SENDER',
      'ORDER_CANCELED',
      'SENDER_WITHDRAWN',
      'EVENT_REMOVED',
      'ADMIN',
    ]);
  });

  it.each([
    ['보낸 사람 회수', 'SENDER', 'SENDER'],
    ['원 주문 취소', 'ORDER_CANCELED', 'ORDER_CANCELED'],
    ['보낸 사람 탈퇴·정지', 'SENDER_WITHDRAWN', 'SENDER_WITHDRAWN'],
    ['공연 삭제·비공개', 'EVENT_REMOVED', 'EVENT_REMOVED'],
    ['운영자 강제 회수(#826)는 UNKNOWN이 아니라 ADMIN', 'ADMIN', 'ADMIN'],
    ['모르는 값은 UNKNOWN', 'SOMETHING_NEW', 'UNKNOWN'],
  ])('%s', (_, raw, expected) => {
    expect(GiftCancelReasonSchema.parse(raw)).toBe(expected);
  });

  it('선물 변경 결과(GiftResult)의 cancelReason이 ADMIN이어도 그대로 읽는다', () => {
    const parsed = GiftResultSchema.parse({
      giftId: 1,
      status: 'CANCELED',
      cancelReason: 'ADMIN',
      memo: null,
      ticketUuid: null,
    });
    expect(parsed.cancelReason).toBe('ADMIN');
  });
});
