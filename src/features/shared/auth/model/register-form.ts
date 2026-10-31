import type { KakaoProfile, RegisterBody } from '@/api/auth/schema';
import { agreementFields } from '@/api/shared/agreement';

/**
 * 회원가입 폼 규칙(plan P4b — 가입 폼 값·동의 상태). 화면 모양(오버레이)은 V에서 정한다.
 *
 * 값은 카카오 프로필(`/oauth/kakao/info`)로 채운다. 카카오 콘솔(B8, 2026-10-31): 이메일·닉네임·프로필 사진·전화번호는 필수 동의,
 * 이름(`name`)은 **사용 안 함**. 서버 `KakaoInformationResponse.getName()`이 `kakao_account.name ?: properties.nickname`이라
 * 프로필의 `name`은 사실상 **카카오 닉네임**이다 — 그대로 이름 칸 초깃값으로 두고 사용자가 고친다(Claude 판단 2026-10-31).
 * 이메일은 필수 동의여도 카카오 계정에 없으면 빈다. 백엔드 검증은 `email`·`name`이 비지 않는 것(`@NotEmpty`, 비면 400 `BAD_REQUEST`)과
 * 전화번호(아래)다.
 *
 * 전화번호(선택)는 **`010-1234-1234` 모양만 보낸다**(사용자 결정 2026-10-31). 입력은 숫자만 남겨 `010-XXXX-XXXX`로 하이픈을
 * 자동으로 넣고(`formatPhoneInput`), 카카오 값(`+82 10-…`)도 같은 모양으로 바꿔 채운다. 서버도 가입 때 검사한다(백엔드 #896 / 2.5.2 —
 * `PhoneNumberVo.validate`): 빈 값은 null로 저장, 한국 번호는 유효 번호만(`000-0000-0000` 거절), 형식은 고정하지 않는다. 걸리면 400
 * `USER_400_2` — 서버 문구("두둥 관리자에게 문의주세요")는 가입 화면에 맞지 않아 칸 오류 `phoneInvalid`로 바꿔 보인다(`useRegisterForm`).
 *
 * 동의: 서비스 이용약관(`/meta/term`)·개인정보 처리방침(`/meta/privacy`)은 필수, 마케팅 수신은 선택(`marketingAgree`).
 * v1은 "약관 동의하고 시작하기" 한 버튼이었다 — 항목을 몇 개로 보일지는 V(디자인)에서 정하고, 필수 판정은 여기 하나다.
 * 서버 동의 기록(#840·#850)에는 이용약관 체크를 `termsAgreed`로 싣는다. 처리방침 동의는 서버가 기록하지 않는다(화면에서만 받는다).
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

/** `phoneInvalid` — 모양은 맞지만 서버가 무효 번호로 거절(`USER_400_2`). 그 번호를 고칠 때까지 유지된다 */
export type RegisterFieldError = 'required' | 'phoneFormat' | 'phoneInvalid';

/** 가입·프로필 전화번호 모양(사용자 결정 2026-10-31) — 한국 휴대폰, 하이픈 포함 */
export const PHONE_PATTERN = /^010-\d{4}-\d{4}$/;

/** 칸 오류 문구(잠정 — 디자인 전). `required`는 칸마다 화면이 정한다 */
export const PHONE_FORMAT_MESSAGE = '휴대폰 번호를 010-1234-5678 형식으로 입력해 주세요';
/** 서버 `USER_400_2` 칸 오류 문구(잠정 — 디자인 전, 백엔드 #896 안내 문구) */
export const PHONE_INVALID_MESSAGE = '전화번호를 확인해 주세요';
/** 가입 때 서버가 무효 전화번호로 거절하는 코드(백엔드 #896) */
export const PHONE_INVALID_CODE = 'USER_400_2';

/**
 * 입력 → `010-XXXX-XXXX` 모양으로 하이픈 자동 입력. 숫자만 남기고, 국가번호로 시작하면(`+82 10-…` — 카카오 프로필) `0`으로 바꾼다.
 * 11자리에서 자른다. 3자리까지는 그대로, 7자리까지 `010-1234`, 그 뒤 `010-1234-5678`. 빈 입력은 빈 문자열
 */
export function formatPhoneInput(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (raw.trim().startsWith('+') && d.startsWith('82')) d = `0${d.slice(2)}`;
  d = d.slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}
export type RegisterErrors = Partial<Record<RegisterField, RegisterFieldError>>;

/** 카카오 프로필 → 폼 초기값. 없는 값은 빈 문자열 */
export function initialRegisterValues(profile: KakaoProfile): RegisterValues {
  return {
    name: profile.name?.trim() ?? '',
    email: profile.email?.trim() ?? '',
    phoneNumber: formatPhoneInput(profile.phoneNumber ?? ''),
  };
}

/** 칸 오류. 이름·이메일은 공백만 있어도 비었다고 본다. 전화번호는 선택 — 적었으면 `010-1234-1234` 모양이어야 한다 */
export function validateRegister(values: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};
  if (values.name.trim() === '') errors.name = 'required';
  if (values.email.trim() === '') errors.email = 'required';
  const phone = values.phoneNumber.trim();
  if (phone !== '' && !PHONE_PATTERN.test(phone)) errors.phoneNumber = 'phoneFormat';
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

/**
 * 제출 본문. 앞뒤 공백을 지우고, 빈 전화번호는 `null`(칸 검증을 통과한 값만 오므로 전화번호는 `010-1234-1234` 모양이다).
 * 동의 기록: 이용약관 체크가 켜져 있으면 `termsAgreed: true` + `agreementVersion`(체크하지 않았으면 두 키 모두 없다).
 * TODO(Q42): 만 14세 확인(`ageOver14Confirmed`)은 v2 가입 계획에 칸이 없어 보내지 않는다 — 칸 없이 `true`를 만들지 않는다.
 * 백엔드가 동의 강제를 켜면 이 본문은 400 `Agreement_400_1`이 된다(mock `authHandlers.registerAgreementEnforced`).
 */
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
    ...agreementFields({ termsAgreed: input.consents.terms }),
  };
}
