import { describe, expect, it } from 'vitest';

import { PRE_APPROVAL_CANCEL_TERMS_EFFECTIVE_AT } from '@/api/shared/agreement';

import { REFUND_DEADLINE, refundPolicyItems } from './refund-policy';

const BEFORE = PRE_APPROVAL_CANCEL_TERMS_EFFECTIVE_AT - 1;
const AFTER = PRE_APPROVAL_CANCEL_TERMS_EFFECTIVE_AT;
const B18_5 =
  '입금 후 승인 전에도 취소할 수 있습니다. 이미 입금했다면 취소할 때 입력한 환불 계좌로 호스트가 환불합니다.';

describe('체크아웃 환불 규정(legal-copy A-7, 이슈 #105)', () => {
  it('취소 기한 행은 A-7 공통 행 원문', () => {
    expect(REFUND_DEADLINE).toEqual({ label: '취소 기한', value: '공연 시작 전 까지' });
  });

  it('두둥 — 개정 약관 시행 전에는 ⑤(B18 확정 문구)를 뺀 다섯 줄, v1 ⑤는 어느 때도 없다', () => {
    const items = refundPolicyItems('DUDOONG', BEFORE)!;
    expect(items).toHaveLength(5);
    expect(items).not.toContain(B18_5);
    expect(items.join('')).not.toContain('승인 전에는 앱에서 취소할 수 없습니다');
    expect(items[0]).toBe('취소기한 이전까지 수수료 없이 취소 가능합니다.');
  });

  it('두둥 — 시행 뒤에는 ④와 ⑥ 사이에 B18 ⑤', () => {
    const items = refundPolicyItems('DUDOONG', AFTER)!;
    expect(items).toHaveLength(6);
    expect(items[4]).toBe(B18_5);
  });

  it('무료는 세 줄, 그 밖(PG 유료 · 모름)은 그리지 않는다', () => {
    expect(refundPolicyItems('FREE')).toEqual([
      '취소기한 이전까지 취소할 수 있습니다.',
      '공연 입장확인이 된 티켓이 있을경우 취소가 불가합니다.',
      '취소 방법 : 티켓 예매 상세내역>예매취소',
    ]);
    expect(refundPolicyItems('PRICE')).toBeNull();
    expect(refundPolicyItems(null)).toBeNull();
  });
});
