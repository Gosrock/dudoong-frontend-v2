'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { handleError } from '@/api/handle-error';
import { updateMeMutation } from '@/api/me/mutations';
import { meQuery } from '@/api/me/queries';
import { useSession } from '@/features/shared/auth/useSession';

import { MARKETING_ERROR_MESSAGE, marketingResultMessage } from './profile';

export type MarketingNotice = { tone: 'success' | 'error'; message: string };

/**
 * 마이페이지 마케팅 수신 설정(legal-copy B-6·B-7, v1-additions E-1). 보호 화면이라 세션(`Me`)은 이미 있다.
 * - 현재 값은 GM-1 `marketingAgree`(세션 키 `['me']`) — 백엔드 #888(B17). v1 `GET /api/v1/users/me`로 읽지 않는다
 * - `set(값)`은 PM-2 `{marketingAgree}` — 값 지정이라 재시도해도 같은 값이다(v1 반전 API `PATCH /api/v1/users/me/marketing`는 쓰지 않는다)
 * - 낙관 갱신 없음: 요청 중에는 `pending`(토글 비활성), 성공 응답(`Me`)을 세션 키에 넣고 처리 결과 통지(전송자·일자·처리 내용 —
 *   정보통신망법 제50조⑧)를 `notice`로, 실패는 값을 그대로 두고 `notice`에 실패 문구(공용 토스트는 띄우지 않는다)
 */
export function useMarketingSetting(now: () => Date = () => new Date()) {
  const queryClient = useQueryClient();
  const session = useSession();
  const value = session.status === 'session' ? session.me.marketingAgree : undefined;
  const [notice, setNotice] = useState<MarketingNotice | null>(null);

  // 세션 키 반영은 화면이 사라져도 해야 하므로 옵션의 onSuccess에 둔다
  const mutation = useMutation({
    ...updateMeMutation(),
    onSuccess: (me) => queryClient.setQueryData(meQuery().queryKey, me),
  });

  const set = useCallback(
    async (next: boolean) => {
      if (mutation.isPending || value === undefined || next === value) return;
      setNotice(null);
      try {
        const me = await mutation.mutateAsync({ marketingAgree: next });
        setNotice({
          tone: 'success',
          message: marketingResultMessage(me.marketingAgree, now()),
        });
      } catch (e) {
        // 모든 실패를 화면이 맡는다(세션 상실은 handleError가 거른다 — `onSessionLost`가 이동시킨다)
        handleError(
          e,
          {},
          {
            otherwise: () => setNotice({ tone: 'error', message: MARKETING_ERROR_MESSAGE }),
          },
        );
      }
    },
    [mutation, value, now],
  );

  return {
    /** 현재 값(세션 전이면 undefined) */
    value,
    set,
    pending: mutation.isPending,
    /** 처리 결과(성공 통지 또는 실패). 화면이 토스트로 띄우고 `dismiss` */
    notice,
    dismiss: () => setNotice(null),
  };
}
