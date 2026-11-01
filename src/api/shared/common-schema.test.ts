import { describe, expect, it } from 'vitest';

import { contactRequestSchema, hostContactRequestSchema } from './common-schema';

describe('연락처 요청 스키마(A21)', () => {
  it('공통 — 값 1~200자, 앞뒤 공백을 지운다', () => {
    expect(contactRequestSchema.parse({ type: 'INSTAGRAM', value: '  @dudoong ' })).toEqual({
      type: 'INSTAGRAM',
      value: '@dudoong',
    });
    expect(contactRequestSchema.safeParse({ type: 'ETC', value: '   ' }).success).toBe(false);
    expect(contactRequestSchema.safeParse({ type: 'ETC', value: 'a'.repeat(200) }).success).toBe(
      true,
    );
    expect(contactRequestSchema.safeParse({ type: 'ETC', value: 'a'.repeat(201) }).success).toBe(
      false,
    );
  });

  it('보내지 않는 유형(UNKNOWN)은 거른다', () => {
    expect(contactRequestSchema.safeParse({ type: 'UNKNOWN', value: 'x' }).success).toBe(false);
  });

  it('공연 문의처는 전화 15자 제한이 없다', () => {
    const phone = { type: 'PHONE', value: '0'.repeat(20) };
    expect(contactRequestSchema.safeParse(phone).success).toBe(true);
  });

  it('호스트 연락처는 전화 15자까지', () => {
    expect(
      hostContactRequestSchema.safeParse({ type: 'PHONE', value: '0'.repeat(15) }).success,
    ).toBe(true);
    expect(
      hostContactRequestSchema.safeParse({ type: 'PHONE', value: '0'.repeat(16) }).success,
    ).toBe(false);
    expect(
      hostContactRequestSchema.safeParse({ type: 'EMAIL', value: 'a'.repeat(100) }).success,
    ).toBe(true);
  });
});
