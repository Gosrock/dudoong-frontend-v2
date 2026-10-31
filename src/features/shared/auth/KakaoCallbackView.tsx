'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { EmptyState, EmptyStateAction } from '@/ui/components/EmptyState/EmptyState';
import { Spinner } from '@/ui/components/Loader/Loader';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { browserLocation } from './browser-location';
import * as s from './KakaoCallbackView.css';
import { loginHref } from './login-href';
import { AUTH_FAILURE_MESSAGE } from './model/auth-outcome';
import { readLoginRedirect } from './model/login-redirect';
import { type KakaoCallbackState, useKakaoCallback } from './model/useKakaoCallback';
import { RegisterOverlay } from './ui/RegisterOverlay';

/**
 * 카카오 콜백(`/kakao/callback`) — 대기·실패 안내와 회원가입 오버레이(P4b-V). **디자인 없음**(GUI·와이어 모두 없음) —
 * DS 컴포넌트로만: 대기는 Spinner + 문구, 실패는 EmptyState(문구 + 검정 버튼), 가입은 ResponsiveOverlay(모바일 시트 · PC 모달).
 * 주소를 읽는 것은 말단 `CallbackScreen`(자체 Suspense — patterns §6).
 */
export function KakaoCallbackView() {
  return (
    <main className={s.main}>
      <Suspense fallback={null}>
        <CallbackScreen />
      </Suspense>
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

function CallbackScreen() {
  const state = useKakaoCallback(useSearchParams());
  switch (state.status) {
    case 'pending':
    case 'redirecting':
    case 'restarting':
      return (
        <Flex direction="column" align="center" gap={3}>
          <Spinner size="md" />
          <Txt as="h1" typography="bodyLg" color={colors.textSecondary}>
            {TITLE[state.status]}
          </Txt>
        </Flex>
      );
    case 'error':
      return (
        <>
          <VisuallyHidden asChild>
            <h1>{TITLE.error}</h1>
          </VisuallyHidden>
          <EmptyState
            title={<span role="alert">{AUTH_FAILURE_MESSAGE[state.failure]}</span>}
            action={<EmptyStateAction href={state.loginHref}>다시 로그인</EmptyStateAction>}
          />
        </>
      );
    case 'register':
      return (
        <RegisterOverlay
          form={state.form}
          // 가입을 그만두면(닫기·Esc·뒤로가기) 로그인 화면으로 — 쓴 인가 코드가 든 콜백 주소를 기록에 남기지 않는다
          onCancel={() => browserLocation.replace(loginHref(readLoginRedirect()))}
        />
      );
  }
}
