import type { KakaoProfile, RegisterBody } from '@/api/auth/schema';

/**
 * 회원가입 폼 규칙(plan P4b — 가입 폼 값·동의 상태). 화면 모양(오버레이)은 V에서 정한다.
 *
 * 값은 카카오 프로필(`/oauth/kakao/info`)로 채운다. 카카오 동의 항목에 따라 이메일·이름이 비어 올 수 있어
 * 사용자가 고칠 수 있게 둔다. 백엔드 검증은 `email`·`name`이 비지 않는 것뿐이다(`@NotEmpty`, 비면 400 `GLOBAL_400_1`).
 *
 * 동의: 서비스 이용약관(`/meta/term`)·개인정보 처리방침(`/meta/privacy`)은 필수, 마케팅 수신은 선택(`marketingAgree`).
 * v1은 "약관 동의하고 시작하기" 한 버튼이었다 — 항목을 몇 개로 보일지는 V(디자인)에서 정하고, 필수 판정은 여기 하나다.
 */

export type RegisterValues = {
  name: string;
  email: string;
  phoneNumber: string;
};
export type RegisterField = keyof RegisterValues;

export type RegisterConsents = {
  terms: boolean;
  privacy: boolean;
  marketing: boolean;
};
export type RegisterConsent = keyof RegisterConsents;

/** 필수 동의 항목 */
export const REQUIRED_CONSENTS: readonly RegisterConsent[] = ['terms', 'privacy'];

export const NO_CONSENTS: RegisterConsents = { terms: false, privacy: false, marketing: false };

export type RegisterFieldError = 'required';
export type RegisterErrors = Partial<Record<RegisterField, RegisterFieldError>>;

/** 카카오 프로필 → 폼 초기값. 없는 값은 빈 문자열 */
export function initialRegisterValues(profile: KakaoProfile): RegisterValues {
  return {
    name: profile.name?.trim() ?? '',
    email: profile.email?.trim() ?? '',
    phoneNumber: profile.phoneNumber?.trim() ?? '',
  };
}

/** 칸 오류. 이름·이메일은 공백만 있어도 비었다고 본다. 전화번호는 선택 */
export function validateRegister(values: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};
  if (values.name.trim() === '') errors.name = 'required';
  if (values.email.trim() === '') errors.email = 'required';
  return errors;
}

export const hasRequiredConsents = (consents: RegisterConsents) =>
  REQUIRED_CONSENTS.every((k) => consents[k]);

/** 모든 항목(선택 포함)에 동의했는지 — "전체 동의" 표시 */
export const hasAllConsents = (consents: RegisterConsents) =>
  Object.values(consents).every(Boolean);

/** 제출할 수 있는지 — 칸 오류가 없고 필수 동의를 마쳤다 */
export const canSubmitRegister = (values: RegisterValues, consents: RegisterConsents) =>
  Object.keys(validateRegister(values)).length === 0 && hasRequiredConsents(consents);

/** 제출 본문. 앞뒤 공백을 지우고, 빈 전화번호는 `null` */
export function toRegisterBody(input: {
  idToken: string;
  values: RegisterValues;
  consents: RegisterConsents;
  profileImage: string | null;
}): RegisterBody {
  const phone = input.values.phoneNumber.trim();
  return {
    idToken: input.idToken,
    email: input.values.email.trim(),
    phoneNumber: phone === '' ? null : phone,
    profileImage: input.profileImage,
    name: input.values.name.trim(),
    marketingAgree: input.consents.marketing,
  };
}
