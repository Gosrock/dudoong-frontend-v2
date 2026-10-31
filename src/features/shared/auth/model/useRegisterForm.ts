'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { loginWithKakao, registerWithKakao } from '@/api/auth/calls';
import type { KakaoProfile } from '@/api/auth/schema';
import { getErrorCode, getErrorStatus, isValidationError } from '@/api/errors';
import { log } from '@/utils/log';

import { classifyAuthFailure } from './auth-outcome';
import { finishLogin } from './finish-login';
import {
  canSubmitRegister,
  formatPhoneInput,
  hasAllConsents,
  hasRequiredConsents,
  initialRegisterValues,
  NO_CONSENTS,
  type RegisterConsent,
  type RegisterConsents,
  type RegisterField,
  type RegisterValues,
  toRegisterBody,
  validateRegister,
} from './register-form';

/** 가입에 필요한 것 — 카카오 콜백(`useKakaoCallback`)이 신규 사용자로 판정하면 넘긴다 */
export type RegisterInput = { idToken: string; profile: KakaoProfile };

/**
 * 제출 실패.
 * - `invalid` — 400 `BAD_REQUEST`(이메일·이름이 비었음 — `isValidationError`). 폼에서 고쳐 다시 낸다
 * - `suspended` — 이미 가입한 정지 계정(`USER_400_1` → 로그인 → `USER_403_1`)
 * - `failed` — 그 밖(5xx·네트워크, 카카오 id 토큰 만료 `KAKAO_KOE403` 등). 다시 내거나 로그인을 처음부터
 */
export type RegisterSubmitError = 'invalid' | 'suspended' | 'failed';

const ALREADY_REGISTERED = 'USER_400_1';

const EMPTY_VALUES: RegisterValues = { name: '', email: '', phoneNumber: '' };

/**
 * 회원가입 폼 상태(5b `POST /oauth/kakao/register`). 값·동의·제출·에러만 돌려주고 오버레이를 열고 닫지 않는다(V).
 * 값은 카카오 프로필로 채워 시작한다. 성공하면 로그인과 같이 `finishLogin()`(세션 표시 + 돌아올 곳으로 하드 이동).
 * 이미 가입한 사람(`USER_400_1` — 두 번 누름, 다른 탭에서 먼저 가입)이면 같은 id 토큰으로 로그인한다.
 */
export function useRegisterForm(input: RegisterInput | null) {
  const [values, setValues] = useState<RegisterValues>(EMPTY_VALUES);
  const [consents, setConsents] = useState<RegisterConsents>(NO_CONSENTS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<RegisterSubmitError | null>(null);
  const inflight = useRef(false);

  // 입력(카카오 프로필)이 처음 오거나 바뀌면 폼을 새로 채운다(렌더 중 상태 조정 — effect를 쓰지 않는다)
  const [filledFor, setFilledFor] = useState<RegisterInput | null>(null);
  if (input !== filledFor) {
    setFilledFor(input);
    setValues(input ? initialRegisterValues(input.profile) : EMPTY_VALUES);
    setConsents(NO_CONSENTS);
    setError(null);
  }

  /** 전화번호는 입력하는 대로 `010-XXXX-XXXX` 모양으로 하이픈을 넣는다(`formatPhoneInput`, 사용자 결정 2026-10-31) */
  const setValue = useCallback((field: RegisterField, value: string) => {
    setValues((v) => ({
      ...v,
      [field]: field === 'phoneNumber' ? formatPhoneInput(value) : value,
    }));
  }, []);
  const setConsent = useCallback((key: RegisterConsent, value: boolean) => {
    setConsents((c) => ({ ...c, [key]: value }));
  }, []);
  /** "전체 동의" — 선택 항목까지 모두 */
  const setAllConsents = useCallback((value: boolean) => {
    setConsents({ terms: value, privacy: value, marketing: value });
  }, []);

  const errors = useMemo(() => validateRegister(values), [values]);
  const canSubmit = canSubmitRegister(values, consents) && !submitting;

  const submit = useCallback(async () => {
    if (!input || inflight.current || !canSubmitRegister(values, consents)) return;
    inflight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      try {
        await registerWithKakao(
          toRegisterBody({
            idToken: input.idToken,
            values,
            consents,
            profileImage: input.profile.profileImage,
          }),
        );
      } catch (e) {
        if (getErrorCode(e) !== ALREADY_REGISTERED) throw e;
        await loginWithKakao(input.idToken);
      }
      // 이동하는 동안 submitting을 유지해 다시 누를 수 없게 둔다
      finishLogin();
    } catch (e) {
      inflight.current = false;
      setSubmitting(false);
      log('warn', 'auth.register_failed', { status: getErrorStatus(e), code: getErrorCode(e) });
      setError(registerError(e));
    }
  }, [input, values, consents]);

  return {
    values,
    setValue,
    consents,
    setConsent,
    setAllConsents,
    /** 필수 동의를 마쳤는지 */
    requiredAgreed: hasRequiredConsents(consents),
    /** 선택까지 모두 동의했는지("전체 동의" 체크 표시) */
    allAgreed: hasAllConsents(consents),
    /** 지금 값의 칸 오류. 언제 보여 줄지는 화면이 정한다 */
    errors,
    canSubmit,
    submitting,
    error,
    submit,
  };
}

export type RegisterForm = ReturnType<typeof useRegisterForm>;

function registerError(e: unknown): RegisterSubmitError {
  if (isValidationError(e)) return 'invalid';
  const failure = classifyAuthFailure(e);
  if (failure === 'suspended') return failure;
  return 'failed';
}
