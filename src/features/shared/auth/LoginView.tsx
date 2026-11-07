'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { Button } from '@/ui/components/Button/Button';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './LoginView.css';
import { AUTH_FAILURE_MESSAGE } from './model/auth-outcome';
import { useKakaoLogin } from './model/useKakaoLogin';

/** 일러스트 아래 안내 — 로그인은 GUI `1175:16956` 글자 그대로. 세션 만료는 GUI가 없어 같은 자리에 문구만 바꾼다(Q183) */
const DESCRIPTION = {
  login: '두둥에 로그인하고 다양한 공연을 즐겨보세요!',
  expired: '로그인이 만료됐어요. 다시 로그인해 주세요.',
} as const;

/** 일러스트 표시 폭 — GUI 인스턴스 `1175:16954`(DS `img_login` 285×273을 170×163으로 줄여 씀) */
const ILLUSTRATION_WIDTH = 170;

/**
 * 로그인(`/login`)·세션 만료 안내(`/login/expired`) — **GUI 근거** `1175:16950`("로그인", Ready 2026-11-07).
 * 일러스트(DS `img_login`) + 안내 한 줄 + [카카오 로그인하기](DS Button Primary Large). 와이어의 말풍선은 GUI에서 빠졌다.
 * 둘 다 `?redirect=`로 돌아올 곳을 받는다 — 읽는 것은 말단 `KakaoLoginAction`(patterns §6).
 */
export function LoginView({ expired = false }: { expired?: boolean }) {
  return (
    <main className={s.main}>
      <VisuallyHidden asChild>
        <h1>{expired ? '로그인이 만료됐어요' : '로그인'}</h1>
      </VisuallyHidden>
      <div className={s.content}>
        <Illustration name="login" width={ILLUSTRATION_WIDTH} />
        <Txt as="p" typography="labelMd" color={colors.textSecondaryLabel} align="center">
          {expired ? DESCRIPTION.expired : DESCRIPTION.login}
        </Txt>
        <div className={s.action}>
          <Suspense fallback={null}>
            <KakaoLoginAction />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

/** [카카오 로그인하기] + 실패 안내. `?redirect=`를 읽는 말단(자체 Suspense — patterns §6) */
function KakaoLoginAction() {
  const redirect = useSearchParams().get('redirect');
  const { state, start } = useKakaoLogin(redirect);
  return (
    <Flex direction="column" align="center" gap={3} fullWidth>
      {/* GUI `1175:16958` — DS Button Primary Large(채움 override는 Primary와 같은 색, 좌우 70 → 폭 254) */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={state.status === 'starting'}
        onClick={() => void start()}
      >
        카카오 로그인하기
      </Button>
      {state.status === 'error' && (
        <div role="alert">
          <Txt as="p" typography="bodyMd" color={colors.textDangerLabel} align="center">
            {AUTH_FAILURE_MESSAGE[state.failure]}
          </Txt>
        </div>
      )}
    </Flex>
  );
}
