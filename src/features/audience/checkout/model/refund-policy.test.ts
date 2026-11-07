import { describe, expect, it } from 'vitest';

import { REFUND_DEADLINE, refundPolicyItems } from './refund-policy';

const B18_5 =
  '입금 후 승인 전에도 취소할 수 있습니다. 이미 입금했다면 취소할 때 입력한 환불 계좌로 호스트가 환불합니다.';

describe('체크아웃 환불 규정(legal-copy A-7, 이슈 #105)', () => {
  it('취소 기한 행은 A-7 공통 행 원문', () => {
    expect(REFUND_DEADLINE).toEqual({ label: '취소 기한', value: '공연 시작 전 까지' });
  });

  it('두둥 — 여섯 줄, ④와 ⑥ 사이에 ⑤(B18 확정 문구 — 2026-11-07 시행), v1 ⑤는 없다', () => {
    const items = refundPolicyItems('DUDOONG')!;
    expect(items).toHaveLength(6);
    expect(items[0]).toBe('취소기한 이전까지 수수료 없이 취소 가능합니다.');
    expect(items[4]).toBe(B18_5);
    expect(items.join('')).not.toContain('승인 전에는 앱에서 취소할 수 없습니다');
  });

  it('두둥 ④는 운영 확정본(B28 · 백엔드 #928) — 입력한 환불 계좌로 호스트가 환불', () => {
    const items = refundPolicyItems('DUDOONG')!;
    expect(items[3]).toBe(
      '환불 방법 : 취소할 때 입력한 환불 계좌로 호스트가 환불합니다. 환불이 늦어지면 호스트에게 연락해 주세요. 연락처는 공연 상세 페이지에서 확인할 수 있습니다.',
    );
    expect(items.join('')).not.toContain('환불받을 계좌를 알려주세요');
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
