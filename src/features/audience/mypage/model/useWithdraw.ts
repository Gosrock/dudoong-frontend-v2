'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { handleError } from '@/api/handle-error';
import { clearSessionFlag } from '@/api/session-flag';
import { withdrawAccount } from '@/api/user/calls';
import { browserLocation } from '@/features/shared/auth/browser-location';

export const WITHDRAW_MASTER_MESSAGE = '마스터를 양도한 뒤 탈퇴해 주세요';

/**
 * 회원 탈퇴(v1 `DELETE /api/v1/auth/me`). 확인 팝업("보낸 선물 중 대기 중인 것은 취소된다")은 V가 연다.
 * - 성공 → 로그아웃과 같은 정리(캐시 비우기, `dd:session` 제거) 뒤 홈으로 하드 이동. 응답이 토큰 쿠키를 지운다
 * - `USER_400_6`(마스터인 호스트에 다른 활성 멤버·OPEN·정산중 공연) → `error`에 "마스터를 양도한 뒤 탈퇴해 주세요"
 */
export function useWithdraw() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  // 세션 정리·이동은 화면이 사라져도 해야 하므로 옵션의 onSuccess에 둔다
  const mutation = useMutation({
    mutationKey: ['me', 'withdraw'],
    mutationFn: withdrawAccount,
    onSuccess: () => {
      queryClient.clear();
      clearSessionFlag();
      browserLocation.assign('/');
    },
  });
  const withdraw = useCallback(async () => {
    if (mutation.isPending || mutation.isSuccess) return;
    setError(null);
    try {
      await mutation.mutateAsync();
    } catch (e) {
      handleError(e, { USER_400_6: () => setError(WITHDRAW_MASTER_MESSAGE) });
    }
  }, [mutation]);
  return { withdraw, pending: mutation.isPending || mutation.isSuccess, error };
}
