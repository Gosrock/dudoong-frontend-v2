import { describe, expect, it } from 'vitest';

import {
  AGE_OVER_14_FIELD,
  canSubmitRegister,
  formatPhoneInput,
  hasAllConsents,
  hasRequiredConsents,
  initialRegisterValues,
  NO_CONSENTS,
  type RegisterConsents,
  type RegisterValues,
  REQUIRED_CONSENTS,
  toRegisterBody,
  validateRegister,
  visibleConsents,
  withAllConsents,
} from './register-form';

const filled: RegisterValues = { name: '새내기', email: 'newbie@example.com', phoneNumber: '' };
/** 필수 동의 셋(만 14세 · 이용약관 · 개인정보 — 만 14세 칸 2026-11-01 붙임) */
const required: RegisterConsents = {
  ageOver14: true,
  terms: true,
  privacy: true,
  marketing: false,
};
const OFF = { ageOver14: false };

describe('가입 폼 초기값', () => {
  it('카카오 프로필로 채우고 없는 값은 빈 문자열, 앞뒤 공백은 지운다', () => {
    expect(
      initialRegisterValues({
        name: ' 새내기 ',
        email: null,
        phoneNumber: '+82 10-9876-5432',
        profileImage: null,
      }),
    ).toEqual({ name: '새내기', email: '', phoneNumber: '010-9876-5432' });
  });
});

describe('전화번호 자동 하이픈(사용자 결정 2026-10-31 — 010-1234-1234)', () => {
  it.each([
    ['', ''],
    ['0', '0'],
    ['010', '010'],
    ['0101', '010-1'],
    ['0101234', '010-1234'],
    ['01012345', '010-1234-5'],
    ['01012345678', '010-1234-5678'],
    ['010123456789', '010-1234-5678'],
    ['010-1234-5678', '010-1234-5678'],
    ['010 1234 5678', '010-1234-5678'],
    ['010-', '010'],
    ['+82 10-9876-5432', '010-9876-5432'],
    ['abc', ''],
  ])('%j → %j', (raw, formatted) => {
    expect(formatPhoneInput(raw)).toBe(formatted);
  });
});

describe('가입 폼 칸 검증', () => {
  it.each<[string, Partial<RegisterValues>, ReturnType<typeof validateRegister>]>([
    ['이름·이메일이 있으면 오류 없음(전화번호는 선택)', {}, {}],
    ['이름이 비면 required', { name: '' }, { name: 'required' }],
    ['이름이 공백뿐이어도 required', { name: '   ' }, { name: 'required' }],
    ['이메일이 비면 required(카카오 이메일 미동의)', { email: '' }, { email: 'required' }],
    ['둘 다 비면 둘 다', { name: '', email: ' ' }, { name: 'required', email: 'required' }],
    ['전화번호 010-1234-5678은 통과', { phoneNumber: '010-1234-5678' }, {}],
    [
      '전화번호 하이픈 없음은 phoneFormat',
      { phoneNumber: '01012345678' },
      { phoneNumber: 'phoneFormat' },
    ],
    ['전화번호 덜 적음은 phoneFormat', { phoneNumber: '010-1234' }, { phoneNumber: 'phoneFormat' }],
    [
      '전화번호 국제 형식은 phoneFormat',
      { phoneNumber: '+82 10-1234-5678' },
      { phoneNumber: 'phoneFormat' },
    ],
    ['010이 아니면 phoneFormat', { phoneNumber: '011-123-4567' }, { phoneNumber: 'phoneFormat' }],
  ])('%s', (_, patch, expected) => {
    expect(validateRegister({ ...filled, ...patch })).toEqual(expected);
  });
});

describe('동의 상태', () => {
  const c = (p: Partial<RegisterConsents>): RegisterConsents => ({ ...NO_CONSENTS, ...p });
  it.each<[string, RegisterConsents, boolean, boolean]>([
    ['아무것도 안 함', NO_CONSENTS, false, false],
    ['이용약관만', c({ terms: true }), false, false],
    ['개인정보만', c({ privacy: true }), false, false],
    ['필수 둘(마케팅 선택 안 함)', required, true, false],
    ['마케팅만', c({ marketing: true }), false, false],
    ['만 14세 빠짐', c({ terms: true, privacy: true, marketing: true }), false, false],
    [
      '화면 항목 전부',
      c({ ageOver14: true, terms: true, privacy: true, marketing: true }),
      true,
      true,
    ],
  ])('%s → 필수 %s · 전체 %s', (_, consents, req, all) => {
    expect(hasRequiredConsents(consents)).toBe(req);
    expect(hasAllConsents(consents)).toBe(all);
  });

  it('만 14세 칸이 붙어 있다(2026-11-01) — 필수·전체 동의에 들어간다', () => {
    expect(AGE_OVER_14_FIELD).toBe(true);
    expect(REQUIRED_CONSENTS).toEqual(['ageOver14', 'terms', 'privacy']);
    expect(visibleConsents()).toEqual(['ageOver14', 'terms', 'privacy', 'marketing']);
    expect(withAllConsents(NO_CONSENTS, true)).toEqual(
      c({ ageOver14: true, terms: true, privacy: true, marketing: true }),
    );
  });

  // 칸 플래그를 끄면(되돌리기) 만 14세는 필수·전체 동의에서 빠진다
  it.each<[string, RegisterConsents, boolean, boolean]>([
    ['이용약관·개인정보만', { ...required, ageOver14: false }, true, false],
    ['마케팅까지', c({ terms: true, privacy: true, marketing: true }), true, true],
  ])('칸을 끄면 만 14세는 필수가 아니다: %s → 필수 %s · 전체 %s', (_, consents, req, all) => {
    expect(hasRequiredConsents(consents, OFF)).toBe(req);
    expect(hasAllConsents(consents, OFF)).toBe(all);
    expect(canSubmitRegister(filled, consents, OFF)).toBe(req);
  });

  it('칸을 끄면 전체 동의가 만 14세를 건드리지 않는다', () => {
    expect(withAllConsents(NO_CONSENTS, true, OFF)).toEqual(
      c({ terms: true, privacy: true, marketing: true }),
    );
  });
});

describe('제출 가능', () => {
  it.each<[string, RegisterValues, RegisterConsents, boolean]>([
    ['칸 정상 + 필수 동의', filled, required, true],
    ['칸 정상 + 필수 하나 빠짐', filled, { ...required, privacy: false }, false],
    ['필수 동의 + 이메일 빔', { ...filled, email: '' }, required, false],
    ['필수 동의 + 이름 공백', { ...filled, name: ' ' }, required, false],
    ['필수 동의 + 전화번호 모양 틀림', { ...filled, phoneNumber: '010-12' }, required, false],
  ])('%s → %s', (_, values, consents, expected) => {
    expect(canSubmitRegister(values, consents)).toBe(expected);
  });
});

describe('제출 본문(POST /oauth/kakao/register)', () => {
  it('공백을 지우고 빈 전화번호는 null, 마케팅 동의는 marketingAgree로', () => {
    expect(
      toRegisterBody({
        idToken: 'kakao-id-new',
        values: { name: ' 새내기 ', email: ' newbie@example.com ', phoneNumber: '  ' },
        consents: { ageOver14: false, terms: true, privacy: true, marketing: true },
        profileImage: 'http://k.kakaocdn.net/dn/mock/new.jpg',
      }),
    ).toEqual({
      idToken: 'kakao-id-new',
      email: 'newbie@example.com',
      phoneNumber: null,
      profileImage: 'http://k.kakaocdn.net/dn/mock/new.jpg',
      name: '새내기',
      marketingAgree: true,
      termsAgreed: true,
      agreementVersion: '2026-11',
    });
  });

  // 동의 기록(#840·#850): 사용자가 체크한 값만(true를 만들어 넣지 않는다)
  it.each<[string, boolean, boolean, Record<string, unknown>]>([
    [
      '이용약관 체크 → termsAgreed·agreementVersion',
      false,
      true,
      { termsAgreed: true, agreementVersion: '2026-11' },
    ],
    [
      '만 14세 + 이용약관 체크 → 둘 다 + agreementVersion',
      true,
      true,
      { ageOver14Confirmed: true, termsAgreed: true, agreementVersion: '2026-11' },
    ],
    [
      '만 14세만 체크 → ageOver14Confirmed·agreementVersion',
      true,
      false,
      { ageOver14Confirmed: true, agreementVersion: '2026-11' },
    ],
    ['아무것도 미체크 → 동의 키가 하나도 없다', false, false, {}],
  ])('%s', (_, ageOver14, terms, expected) => {
    const body = toRegisterBody({
      idToken: 't',
      values: filled,
      consents: { ageOver14, terms, privacy: true, marketing: false },
      profileImage: null,
    });
    const agreementKeys = ['termsAgreed', 'ageOver14Confirmed', 'agreementVersion'] as const;
    const picked = Object.fromEntries(
      agreementKeys.filter((k) => k in body).map((k) => [k, body[k]]),
    );
    expect(picked).toEqual(expected);
  });

  it('전화번호가 있으면 그대로(010-1234-1234 모양), 마케팅 미동의는 false', () => {
    const body = toRegisterBody({
      idToken: 't',
      values: { ...filled, phoneNumber: '010-9876-5432' },
      consents: required,
      profileImage: null,
    });
    expect(body.phoneNumber).toBe('010-9876-5432');
    expect(body.marketingAgree).toBe(false);
    expect(body.profileImage).toBeNull();
  });
});
