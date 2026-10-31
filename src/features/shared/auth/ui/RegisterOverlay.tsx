'use client';

import { useId, useState } from 'react';

import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { Checkbox } from '@/ui/components/Checkbox/Checkbox';
import { Input } from '@/ui/components/Input/Input';
import * as field from '@/ui/components/Input/Input.css';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { AUTH_FAILURE_MESSAGE } from '../model/auth-outcome';
import {
  PHONE_FORMAT_MESSAGE,
  PHONE_INVALID_MESSAGE,
  type RegisterField,
  type RegisterFieldError,
} from '../model/register-form';
import type { RegisterForm, RegisterSubmitError } from '../model/useRegisterForm';
import * as s from './RegisterOverlay.css';

const SUBMIT_ERROR_MESSAGE: Record<RegisterSubmitError, string> = {
  invalid: '입력한 정보를 확인해 주세요.',
  ...AUTH_FAILURE_MESSAGE,
};

/** 칸 오류 문구. `required`는 칸마다(문구 잠정 — implementation-log P4b-V 결정) */
function fieldErrorMessage(field: RegisterField, error: RegisterFieldError | undefined) {
  switch (error) {
    case undefined:
      return undefined;
    case 'phoneFormat':
      return PHONE_FORMAT_MESSAGE;
    case 'phoneInvalid':
      return PHONE_INVALID_MESSAGE;
    case 'required':
      return field === 'name' ? '이름을 입력해 주세요' : '이메일을 입력해 주세요';
  }
}

export type RegisterOverlayProps = {
  form: RegisterForm;
  /** 가입을 그만둠(닫기 버튼·Esc·뒤로가기). 제출 중에는 닫히지 않는다 */
  onCancel: () => void;
};

/**
 * 회원가입 오버레이(콜백에서 신규 사용자) — **디자인 없음**(GUI·와이어 모두 없음, design-requests Q25). DS 컴포넌트로만:
 * ResponsiveOverlay(모바일 바텀시트 · PC 모달) + Input 3칸 + Checkbox 동의 + 검정 버튼.
 * 열림은 훅 상태(`status === 'register'`)가 원본이라 `overlay.open`이 아니라 선언형으로 연다(patterns §6 — URL로 여는 오버레이와 같은
 * 이유: 상태가 바뀔 때마다 폼을 다시 그려야 한다). 뒤로가기로 닫히는 것은 ResponsiveOverlay가 맡는다.
 *
 * 동의 문구는 L(P4b-L)의 것 그대로다 — 바꾸면 `AGREEMENT_VERSION`을 올린다. 만 14세 칸은 Q42 답 전까지 없다
 * (`form.consentFields.ageOver14` false). 약관 링크는 새 탭 — 이 탭을 떠나면 메모리의 카카오 토큰과 입력이 사라진다.
 * 칸 오류는 그 칸을 떠난 뒤부터 보인다. 서버가 거절한 전화번호(`phoneInvalid`)는 바로 보인다.
 */
export function RegisterOverlay({ form, onCancel }: RegisterOverlayProps) {
  const formId = useId();
  const [touched, setTouched] = useState<Partial<Record<RegisterField, boolean>>>({});
  const touch = (field: RegisterField) => () => setTouched((t) => ({ ...t, [field]: true }));
  const show = (field: RegisterField) => {
    const error = form.errors[field];
    return touched[field] || error === 'phoneInvalid' ? fieldErrorMessage(field, error) : undefined;
  };

  return (
    <ResponsiveOverlay
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      dismissible={!form.submitting}
      title="회원가입"
      footer={
        <Flex direction="column" gap={3} fullWidth>
          {form.error && (
            <div role="alert">
              <Txt as="p" typography="bodyMd" color={colors.textDangerLabel} align="center">
                {SUBMIT_ERROR_MESSAGE[form.error]}
              </Txt>
            </div>
          )}
          <Button
            type="submit"
            form={formId}
            variant="dark"
            size="lg"
            fullWidth
            disabled={!form.canSubmit}
            loading={form.submitting}
          >
            동의하고 시작하기
          </Button>
        </Flex>
      }
    >
      <form
        id={formId}
        noValidate
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          void form.submit();
        }}
      >
        <Input
          name="name"
          label="이름"
          required
          autoComplete="name"
          value={form.values.name}
          onChange={(e) => form.setValue('name', e.target.value)}
          onBlur={touch('name')}
          error={show('name')}
        />
        <Input
          name="email"
          type="email"
          label="이메일"
          required
          autoComplete="email"
          value={form.values.email}
          onChange={(e) => form.setValue('email', e.target.value)}
          onBlur={touch('email')}
          error={show('email')}
        />
        <Input
          name="phoneNumber"
          type="tel"
          inputMode="numeric"
          label="전화번호"
          autoComplete="tel-national"
          placeholder="010-1234-5678"
          value={form.values.phoneNumber}
          onChange={(e) => form.setValue('phoneNumber', e.target.value)}
          onBlur={touch('phoneNumber')}
          error={show('phoneNumber')}
        />

        <fieldset className={s.consents}>
          <legend className={`${field.label} ${s.legend}`}>약관 동의</legend>
          <Checkbox
            label="전체 동의"
            checked={form.allAgreed}
            onCheckedChange={form.setAllConsents}
          />
          <Divider />
          <Checkbox
            label={
              <span>
                (필수){' '}
                <a href="/meta/term" target="_blank" rel="noopener noreferrer" className={s.link}>
                  서비스 이용약관
                </a>{' '}
                동의
              </span>
            }
            checked={form.consents.terms}
            onCheckedChange={(v) => form.setConsent('terms', v)}
          />
          <Checkbox
            label={
              <span>
                (필수){' '}
                <a
                  href="/meta/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.link}
                >
                  개인정보 처리방침
                </a>{' '}
                동의
              </span>
            }
            checked={form.consents.privacy}
            onCheckedChange={(v) => form.setConsent('privacy', v)}
          />
          <Checkbox
            label="(선택) 마케팅 정보 수신 동의"
            checked={form.consents.marketing}
            onCheckedChange={(v) => form.setConsent('marketing', v)}
          />
        </fieldset>
      </form>
    </ResponsiveOverlay>
  );
}
