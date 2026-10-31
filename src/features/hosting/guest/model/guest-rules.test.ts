import { describe, expect, it } from 'vitest';

import {
  CANCEL_CONFIRM,
  EXACT_MATCH_HINT,
  exactMatchHintOf,
  guestsHref,
  guestsSearch,
  isDudoongOrder,
  isEventStarted,
  orderActionsOf,
  parseGuestTab,
  parseOrderParam,
  REFUSE_ERRORS,
  toCancelBody,
  toRefuseBody,
  validateRefuse,
} from './guest-rules';

const open = { status: 'OPEN', displayStatus: 'UPCOMING', myRole: 'MASTER' } as const;

describe('탭 · 주소(?tab= · ?order=)', () => {
  it.each([
    ['', 'orders'],
    ['tab=tickets', 'tickets'],
    ['tab=refunds', 'refunds'],
    ['tab=orders', 'orders'],
    ['tab=nope', 'orders'],
  ])('?%s → %s', (q, tab) => {
    expect(parseGuestTab(new URLSearchParams(q))).toBe(tab);
  });

  it('order 파라미터: 빈 값·공백은 없음', () => {
    expect(parseOrderParam(new URLSearchParams('order=abc'))).toBe('abc');
    expect(parseOrderParam(new URLSearchParams('order=%20'))).toBeNull();
    expect(parseOrderParam(new URLSearchParams(''))).toBeNull();
  });

  it.each([
    ['', { tab: 'tickets' as const }, '?tab=tickets'],
    ['?tab=tickets', { tab: 'orders' as const }, ''],
    ['?tab=refunds', { order: 'u1' }, '?tab=refunds&order=u1'],
    ['?tab=refunds&order=u1', { order: null }, '?tab=refunds'],
    ['?x=1&order=u1', { tab: 'orders' as const, order: null }, '?x=1'],
  ])('%s + %o → %s(다른 쿼리는 둔다)', (cur, change, next) => {
    expect(guestsSearch(cur, change)).toBe(next);
  });

  it('주소 — 호스트 알림 진입(P9b 링크와 같은 모양)', () => {
    expect(guestsHref(101)).toBe('/hosting/events/101/guests');
    expect(guestsHref(101, { order: 'mock-1' })).toBe('/hosting/events/101/guests?order=mock-1');
    expect(guestsHref(101, { tab: 'refunds' })).toBe('/hosting/events/101/guests?tab=refunds');
  });
});

describe('검색 안내 — 일반 멤버의 연락처·입금자명은 완전 일치(#846)', () => {
  it.each([
    ['GUEST', 'PHONE', EXACT_MATCH_HINT],
    ['GUEST', 'DEPOSITOR_NAME', EXACT_MATCH_HINT],
    ['GUEST', 'NAME', null],
    ['MANAGER', 'PHONE', null],
    ['MASTER', 'DEPOSITOR_NAME', null],
    ['UNKNOWN', 'PHONE', EXACT_MATCH_HINT],
  ] as const)('%s · %s → %s', (role, type, hint) => {
    expect(exactMatchHintOf(role, type)).toBe(hint);
  });
});

describe('주문 처리 버튼', () => {
  const keys = (actions: ReturnType<typeof orderActionsOf>) =>
    actions.map((a) => `${a.key}:${a.enabled ? 'on' : (a.blockedBy ?? 'off')}`);

  it.each([
    [
      '승인 대기',
      { status: 'PENDING_APPROVE', refundStatus: 'NONE' },
      open,
      ['approve:on', 'refuse:on'],
    ],
    ['승인 완료', { status: 'APPROVED', refundStatus: 'NONE' }, open, ['cancel:on']],
    [
      '거절 + 환불 요청',
      { status: 'REFUSED', refundStatus: 'REQUESTED' },
      open,
      ['completeRefund:on'],
    ],
    ['취소 + 환불 완료', { status: 'CANCELED', refundStatus: 'COMPLETED' }, open, []],
    ['주문 실패', { status: 'FAILED', refundStatus: 'NONE' }, open, []],
    [
      '공연 시작 후 — 승인·거절 비활성',
      { status: 'PENDING_APPROVE', refundStatus: 'NONE' },
      { ...open, displayStatus: 'ONGOING' },
      ['approve:started', 'refuse:started'],
    ],
    [
      '지난 공연 — 취소 비활성, 환불 완료는 된다',
      { status: 'CANCELED', refundStatus: 'REQUESTED' },
      { ...open, status: 'CLOSED', displayStatus: 'PAST' },
      ['completeRefund:on'],
    ],
    [
      'OPEN 아님(표시 상태는 예정)',
      { status: 'APPROVED', refundStatus: 'NONE' },
      { ...open, status: 'CALCULATING' },
      ['cancel:notOpen'],
    ],
    [
      '일반 멤버 — 버튼 없음',
      { status: 'PENDING_APPROVE', refundStatus: 'REQUESTED' },
      { ...open, myRole: 'GUEST' },
      [],
    ],
    [
      'SUPER_ADMIN(GE-3 myRole null) — 매니저처럼 처리 버튼',
      { status: 'PENDING_APPROVE', refundStatus: 'NONE' },
      { ...open, myRole: 'SUPER_ADMIN' },
      ['approve:on', 'refuse:on'],
    ],
    [
      '모르는 표시 상태는 시작 후로',
      { status: 'APPROVED', refundStatus: 'NONE' },
      { ...open, displayStatus: 'UNKNOWN' },
      ['cancel:started'],
    ],
  ] as const)('%s', (_, order, event, expected) => {
    expect(keys(orderActionsOf(order, event))).toEqual(expected);
  });

  it('isEventStarted', () => {
    expect(isEventStarted({ status: 'OPEN', displayStatus: 'UPCOMING' })).toBe(false);
    expect(isEventStarted({ status: 'OPEN', displayStatus: 'ONGOING' })).toBe(true);
  });
});

describe('거절 사유(PR-4) · 취소 사유(PR-5)', () => {
  it.each([
    [{ reasonType: null, reasonText: '' }, { reasonType: REFUSE_ERRORS.reasonType }],
    [{ reasonType: 'SOLD_OUT', reasonText: '' }, {}],
    [{ reasonType: 'ETC', reasonText: '  ' }, { reasonText: REFUSE_ERRORS.reasonText }],
    [{ reasonType: 'ETC', reasonText: 'a'.repeat(20) }, {}],
    [{ reasonType: 'ETC', reasonText: 'a'.repeat(21) }, { reasonText: REFUSE_ERRORS.reasonText }],
  ] as const)('%o → %o', (form, errors) => {
    expect(validateRefuse(form)).toEqual(errors);
  });

  it('본문: 기타만 문구(trim), 그 밖은 종류만', () => {
    expect(toRefuseBody({ reasonType: 'ETC', reasonText: ' 중복 ' })).toEqual({
      reasonType: 'ETC',
      reasonText: '중복',
    });
    expect(toRefuseBody({ reasonType: 'DEPOSIT_UNCONFIRMED', reasonText: '무시' })).toEqual({
      reasonType: 'DEPOSIT_UNCONFIRMED',
    });
  });

  it('취소 사유는 선택 — 비면 본문 없이', () => {
    expect(toCancelBody('  ')).toBeUndefined();
    expect(toCancelBody(' 일정 변경 ')).toEqual({ reason: '일정 변경' });
  });
});

describe('두둥 주문 판정(legal-copy C-3·C-4, backend-questions B19)', () => {
  it.each([
    ['BANK_TRANSFER', 30000, true],
    ['TOSS_TRANSFER', 15000, true],
    ['FREE', 0, false],
    [null, 15000, true],
    [null, 0, false],
    ['UNKNOWN', 15000, false],
  ] as const)('%s · %d원 → %s', (paymentChannel, totalAmount, expected) => {
    expect(isDudoongOrder({ paymentChannel, totalAmount })).toBe(expected);
  });

  it('취소 안내 문구는 legal-copy C-4 그대로', () => {
    expect(CANCEL_CONFIRM.dudoongNotice).toBe(
      '두둥티켓은 호스트 계좌로 받은 금액이라 자동으로 환불되지 않아요. 구매자에게 지체 없이 직접 환불해 주세요',
    );
  });
});
