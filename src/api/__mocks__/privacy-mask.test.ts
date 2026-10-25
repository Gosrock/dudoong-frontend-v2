import { describe, expect, it } from 'vitest';

import { maskContacts, maskEmail, maskPhone } from './privacy-mask';

/** mock 가림이 백엔드와 같은지 — 기대값은 `PrivacyMaskerTest.kt`@432cce4 그대로 */
describe('mock 연락처 가림 = 백엔드 PrivacyMasker(#822)', () => {
  it.each([
    ['010-1234-5678', '010-****-5678'],
    ['010-123-5678', '010-***-5678'],
    ['02-1234-5678', '02-****-5678'],
    ['+82 10-1234-5678', '+82 10-****-5678'],
    ['01012345678', '010****5678'],
    ['010 1234 5678', '010 **** 5678'],
    ['1234-5678', '****-5678'],
    ['12-3456', '**-3456'],
    ['1234', '****'],
    ['', ''],
    ['  ', '  '],
    ['010-1234-5678 (담당 김철수)', '010-****-5678'],
    ['01012345678 내선', '010****5678'],
    ['abc', '***'],
  ])('전화 %j → %j', (input, expected) => {
    expect(maskPhone(input)).toBe(expected);
  });

  it.each([
    ['abcd@gmail.com', 'ab***@gmail.com'],
    ['abc@gmail.com', 'ab***@gmail.com'],
    ['ab@gmail.com', '***@gmail.com'],
    ['a@x.com', '***@x.com'],
    ['not-an-email', '***'],
    ['@gmail.com', '***'],
    ['', ''],
  ])('이메일 %j → %j', (input, expected) => {
    expect(maskEmail(input)).toBe(expected);
  });

  it('전화·이메일만 가리고 나머지 유형은 그대로', () => {
    expect(
      maskContacts([
        { type: 'INSTAGRAM', value: '@gosrock_official' },
        { type: 'PHONE', value: '010-1234-5678' },
        { type: 'EMAIL', value: 'gosrock@example.com' },
        { type: 'OPEN_CHAT', value: 'https://open.kakao.com/o/mock' },
      ]),
    ).toEqual([
      { type: 'INSTAGRAM', value: '@gosrock_official' },
      { type: 'PHONE', value: '010-****-5678' },
      { type: 'EMAIL', value: 'go***@example.com' },
      { type: 'OPEN_CHAT', value: 'https://open.kakao.com/o/mock' },
    ]);
  });
});
