import { describe, expect, it } from 'vitest';

import { AGREEMENT_VERSION, agreementFields } from './agreement';

describe('동의 기록 필드(#840·#850) — 사용자가 체크한 것만, 하나라도 있으면 버전을 같이', () => {
  it('버전 상수는 2026-11(약관 일부 개정 2026-11-07 시행 — v1 Front #385. 처음 값 2026-10은 백엔드 Develop 기획서·v1 AGREEMENT_VERSION)', () => {
    expect(AGREEMENT_VERSION).toBe('2026-11');
  });

  it.each([
    ['체크 하나', { termsAgreed: true }, { termsAgreed: true, agreementVersion: '2026-11' }],
    [
      '체크 둘',
      { hostProvisionAgreed: true, dudoongTicketNoticeConfirmed: true },
      {
        hostProvisionAgreed: true,
        dudoongTicketNoticeConfirmed: true,
        agreementVersion: '2026-11',
      },
    ],
    [
      '체크한 것과 안 한 것이 섞이면 체크한 것만',
      { hostProvisionAgreed: true, dudoongTicketNoticeConfirmed: false },
      { hostProvisionAgreed: true, agreementVersion: '2026-11' },
    ],
    ['체크 안 함 → 키가 하나도 없다', { termsAgreed: false }, {}],
    ['입력 없음 → 키가 하나도 없다', {}, {}],
  ])('%s', (_, input, expected) => {
    expect(agreementFields(input as Record<string, boolean>)).toStrictEqual(expected);
  });
});
