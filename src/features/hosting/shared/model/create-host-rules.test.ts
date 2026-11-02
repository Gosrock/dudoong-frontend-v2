import { describe, expect, it } from 'vitest';

import { CreateHostRequestSchema } from '@/api/host/schema';
import { CONTACT_TYPES } from '@/api/shared/common-schema';

import {
  type CreateHostValues,
  hasCreateHostErrors,
  initialCreateHostValues,
  toCreateHostBody,
  validateCreateHost,
} from './create-host-form';
import {
  canAddContact,
  canRemoveContact,
  contactError,
  contactPlaceholder,
  HOST_CONTACT_OPTIONS,
  introduceError,
  nameError,
} from './host-fields';

describe('연락처 유형 6종과 유형별 placeholder(plan P10a, Q8)', () => {
  it('서버 enum 6종(YOUTUBE 포함)을 모두, 서버 순서로', () => {
    expect(HOST_CONTACT_OPTIONS.map((o) => o.type)).toEqual([...CONTACT_TYPES]);
  });

  it.each([
    ['PHONE', '전화번호', '-없이 입력해 주세요'],
    ['INSTAGRAM', '인스타그램', '@dudoong'],
    ['OPEN_CHAT', '오픈채팅방', 'URL'],
    ['ETC', '기타', 'URL 혹은 텍스트 입력'],
    ['YOUTUBE', '유튜브', 'URL'],
    // 문서·GUI에 없다 — design-requests 확인 요청
    ['EMAIL', '이메일', 'example@dudoong.com'],
  ] as const)('%s — 라벨 "%s", placeholder %j', (type, label, placeholder) => {
    const option = HOST_CONTACT_OPTIONS.find((o) => o.type === type);
    expect(option).toEqual({ type, label, placeholder });
    expect(contactPlaceholder(type)).toBe(placeholder);
  });

  it('유형을 고르기 전에는 placeholder가 없다', () => {
    expect(contactPlaceholder(null)).toBeNull();
  });
});

describe('칸 오류 — 이름 1~15자 · 소개 255자 · 연락처 값 200자(전화 15자)', () => {
  it.each([
    ['', '호스트 이름을 입력해 주세요'],
    ['   ', '호스트 이름을 입력해 주세요'],
    ['가'.repeat(15), null],
    [` ${'가'.repeat(15)} `, null],
    ['가'.repeat(16), '호스트 이름은 15자까지 입력할 수 있어요'],
  ])('이름 %j → %j', (name, error) => {
    expect(nameError(name)).toBe(error);
  });

  it.each([
    ['', null],
    ['가'.repeat(255), null],
    ['가'.repeat(256), '소개는 255자까지 입력할 수 있어요'],
  ])('소개 %j자 → %j', (introduce, error) => {
    expect(introduceError(introduce)).toBe(error);
  });

  it.each([
    [{ type: null, value: '010' }, '연락처 유형을 골라 주세요'],
    [{ type: 'PHONE', value: '  ' }, '연락처를 입력해 주세요'],
    [{ type: 'PHONE', value: '0'.repeat(15) }, null],
    [{ type: 'PHONE', value: '0'.repeat(16) }, '전화번호는 15자까지 입력할 수 있어요'],
    [{ type: 'ETC', value: '가'.repeat(200) }, null],
    [{ type: 'ETC', value: '가'.repeat(201) }, '연락처는 200자까지 입력할 수 있어요'],
  ] as const)('연락처 %j → %j', (contact, error) => {
    expect(contactError(contact)).toBe(error);
  });

  it('처음 값은 연락처 한 줄(유형 미선택)이라 그대로는 낼 수 없다', () => {
    const errors = validateCreateHost(initialCreateHostValues());
    expect(errors).toEqual({
      name: '호스트 이름을 입력해 주세요',
      introduce: null,
      contacts: ['연락처 유형을 골라 주세요'],
    });
    expect(hasCreateHostErrors(errors)).toBe(true);
  });

  it('연락처는 1~10줄 — 1줄이면 지울 수 없고 10줄이면 더할 수 없다', () => {
    const row = { type: 'ETC', value: 'x' } as const;
    expect(canRemoveContact([row])).toBe(false);
    expect(canRemoveContact([row, row])).toBe(true);
    expect(canAddContact(Array(9).fill(row))).toBe(true);
    expect(canAddContact(Array(10).fill(row))).toBe(false);
  });
});

describe('보내는 본문(PH-2)', () => {
  it('앞뒤 공백을 지우고 빈 소개는 null — 요청 스키마를 통과한다', () => {
    const values: CreateHostValues = {
      name: ' 새 밴드 ',
      introduce: '  ',
      contacts: [
        { type: 'PHONE', value: ' 01012345678 ' },
        { type: 'YOUTUBE', value: 'https://youtube.com/@band' },
      ],
    };
    expect(hasCreateHostErrors(validateCreateHost(values))).toBe(false);
    const body = toCreateHostBody(values);
    expect(body).toEqual({
      name: '새 밴드',
      introduce: null,
      contacts: [
        { type: 'PHONE', value: '01012345678' },
        { type: 'YOUTUBE', value: 'https://youtube.com/@band' },
      ],
    });
    expect(CreateHostRequestSchema.safeParse(body).success).toBe(true);
  });
});
