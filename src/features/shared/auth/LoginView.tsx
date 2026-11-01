'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { Button } from '@/ui/components/Button/Button';
import { TooltipBubble } from '@/ui/components/Tooltip/Tooltip';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './LoginView.css';
import { AUTH_FAILURE_MESSAGE } from './model/auth-outcome';
import { useKakaoLogin } from './model/useKakaoLogin';

const BUBBLE = {
  login: '두둥에 로그인하고 즐거운 공연 라이프를 즐겨보세요!',
  expired: '로그인이 만료됐어요. 다시 로그인해 주세요.',
} as const;

/**
 * 로그인(`/login`)·세션 만료 안내(`/login/expired`) — **와이어 근거** `218:4792`("로그인"). GUI `331:11720`은 Ready for dev가
 * 아니라 모양을 가져오지 않는다(P4b-V). 말풍선 + 캐릭터 + [카카오 로그인/회원가입]. 세션 만료는 와이어가 없어 같은 배치에
 * 말풍선 문구만 바꾼다(implementation-log P4b-V 결정).
 * 둘 다 `?redirect=`로 돌아올 곳을 받는다 — 읽는 것은 말단 `KakaoLoginAction`(patterns §6).
 */
export function LoginView({ expired = false }: { expired?: boolean }) {
  return (
    <main className={s.main}>
      <VisuallyHidden asChild>
        <h1>{expired ? '로그인이 만료됐어요' : '로그인'}</h1>
      </VisuallyHidden>
      {/* 말풍선 + 캐릭터는 한 묶음(흐름 안) — 같이 스크롤·오버스크롤된다(이슈 #95. 전에는 말풍선만 포털 fixed라 따로 놀았다) */}
      <div className={s.hero}>
        {/* FIGMA-CUSTOM: 로그인 말풍선(wire 218:4792 "로그인") 커스텀 → DS Tooltip 모양(TooltipBubble, 흐름 안). Figma 코멘트 2026-11-01 */}
        <TooltipBubble>{expired ? BUBBLE.expired : BUBBLE.login}</TooltipBubble>
        {/* FIGMA-CUSTOM: 로그인 캐릭터(wire 218:4797 "image 129") 래스터 자리표시 → DS 일러스트 img_login(같은 285 자리). Figma 코멘트 2026-11-01 */}
        <Illustration name="login" />
      </div>
      <div className={s.action}>
        <Suspense fallback={null}>
          <KakaoLoginAction />
        </Suspense>
      </div>
    </main>
  );
}

/** [카카오 로그인/회원가입] + 실패 안내. `?redirect=`를 읽는 말단(자체 Suspense — patterns §6) */
function KakaoLoginAction() {
  const redirect = useSearchParams().get('redirect');
  const { state, start } = useKakaoLogin(redirect);
  return (
    <Flex direction="column" align="center" gap={3} fullWidth>
      <Button
        variant="dark"
        size="lg"
        fullWidth
        loading={state.status === 'starting'}
        onClick={() => void start()}
      >
        카카오 로그인/회원가입
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
