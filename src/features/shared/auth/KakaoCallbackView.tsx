'use client';

import { useSearchParams } from 'next/navigation';

import { AUTH_FAILURE_MESSAGE } from './model/auth-outcome';
import { type KakaoCallbackState, useKakaoCallback } from './model/useKakaoCallback';
import type { RegisterSubmitError } from './model/useRegisterForm';

const REGISTER_ERROR_MESSAGE: Record<RegisterSubmitError, string> = {
  invalid: '입력한 정보를 확인해 주세요.',
  ...AUTH_FAILURE_MESSAGE,
};

/**
 * 카카오 콜백(`/kakao/callback`) — 스타일 없는 최소 마크업(P4b-L). 훅 상태를 그대로 보여 준다.
 * 대기·실패 안내 화면과 회원가입 오버레이 모양은 P4b-V.
 */
export function KakaoCallbackView() {
  const state = useKakaoCallback(useSearchParams());
  return (
    <main>
      <h1>{TITLE[state.status]}</h1>
      <CallbackBody state={state} />
    </main>
  );
}

const TITLE: Record<KakaoCallbackState['status'], string> = {
  pending: '로그인하는 중',
  redirecting: '로그인하는 중',
  restarting: '로그인 화면으로 돌아가는 중',
  register: '회원가입',
  error: '로그인하지 못했어요',
};

function CallbackBody({ state }: { state: KakaoCallbackState }) {
  switch (state.status) {
    case 'pending':
    case 'redirecting':
    case 'restarting':
      return <p aria-busy>잠시만 기다려 주세요.</p>;
    case 'error':
      return (
        <>
          <p role="alert">{AUTH_FAILURE_MESSAGE[state.failure]}</p>
          <a href={state.loginHref}>다시 로그인</a>
        </>
      );
    case 'register':
      return <RegisterForm form={state.form} />;
  }
}

function RegisterForm({
  form,
}: {
  form: Extract<KakaoCallbackState, { status: 'register' }>['form'];
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
    >
      <label>
        이름
        <input
          name="name"
          value={form.values.name}
          onChange={(e) => form.setValue('name', e.target.value)}
          aria-invalid={!!form.errors.name}
        />
      </label>
      <label>
        이메일
        <input
          name="email"
          type="email"
          value={form.values.email}
          onChange={(e) => form.setValue('email', e.target.value)}
          aria-invalid={!!form.errors.email}
        />
      </label>
      <label>
        전화번호
        <input
          name="phoneNumber"
          type="tel"
          inputMode="numeric"
          value={form.values.phoneNumber}
          onChange={(e) => form.setValue('phoneNumber', e.target.value)}
          aria-invalid={!!form.errors.phoneNumber}
        />
      </label>
      <fieldset>
        <legend>약관 동의</legend>
        <label>
          <input
            type="checkbox"
            checked={form.allAgreed}
            onChange={(e) => form.setAllConsents(e.target.checked)}
          />
          전체 동의
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.consents.terms}
            onChange={(e) => form.setConsent('terms', e.target.checked)}
          />
          (필수) <a href="/meta/term">서비스 이용약관</a> 동의
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.consents.privacy}
            onChange={(e) => form.setConsent('privacy', e.target.checked)}
          />
          (필수) <a href="/meta/privacy">개인정보 처리방침</a> 동의
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.consents.marketing}
            onChange={(e) => form.setConsent('marketing', e.target.checked)}
          />
          (선택) 마케팅 정보 수신 동의
        </label>
      </fieldset>
      {form.error && <p role="alert">{REGISTER_ERROR_MESSAGE[form.error]}</p>}
      <button type="submit" disabled={!form.canSubmit} aria-busy={form.submitting}>
        동의하고 시작하기
      </button>
    </form>
  );
}
