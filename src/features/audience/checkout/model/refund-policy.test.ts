import { describe, expect, it } from 'vitest';

import { REFUND_DEADLINE, refundPolicyItems } from './refund-policy';

/** 백엔드 #274 §2 제안 원문(legal-copy A-7 "BE-274 확정 문구") */
const BE_274 = [
  '취소 기한: 공연 시작 전까지 티켓 예매 상세 > 예매 취소에서 직접 취소할 수 있습니다. 입장 확인된 티켓, 선물 중이거나 선물한 티켓이 있으면 취소할 수 없습니다.',
  '두둥티켓(계좌이체): 대금은 호스트 계좌로 직접 입금되며 두둥에서 자동으로 환불되지 않습니다. 취소할 때 환불받을 계좌를 입력하면 호스트가 확인 후 지체 없이 송금합니다.',
  '호스트가 예매 전에 공연 상세에 게시한 취소·환불 기준이 있으면 그 기준이 우선합니다. 단, 승인 거절·공연 취소 등 호스트 사유로 인한 취소는 전액 환불됩니다.',
  '무료 티켓은 취소하면 바로 반영됩니다. 환불 문의는 호스트 연락처 또는 두둥 카카오톡 채널로 해 주세요.',
];

describe('체크아웃 환불 규정(legal-copy A-7 — BE-274 확정 문구, 이슈 #105 · #274)', () => {
  it('취소 기한 행은 A-7 공통 행 원문', () => {
    expect(REFUND_DEADLINE).toEqual({ label: '취소 기한', value: '공연 시작 전 까지' });
  });

  it.each(['DUDOONG', 'FREE'] as const)('%s — 제안 원문 네 줄 그대로', (payType) => {
    expect(refundPolicyItems(payType)).toEqual(BE_274);
  });

  it('카드 결제 · 즉시 취소 문구(v2에 없음)와 옛 "승인 전 앱 취소 불가"는 없다', () => {
    const text = refundPolicyItems('DUDOONG')!.join('');
    expect(text).not.toContain('카드사');
    expect(text).not.toContain('즉시 취소');
    expect(text).not.toContain('승인 전에는 앱에서 취소할 수 없습니다');
  });

  it('그 밖(PG 유료 · 모름)은 그리지 않는다', () => {
    expect(refundPolicyItems('PRICE')).toBeNull();
    expect(refundPolicyItems(null)).toBeNull();
  });
});
