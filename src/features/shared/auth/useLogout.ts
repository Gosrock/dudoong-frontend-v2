'use client';

import { type QueryClient, useIsMutating, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { requestLogout } from '@/api/auth/calls';
import { isApiError } from '@/api/errors';
import { clearSessionFlag } from '@/api/session-flag';
import { log } from '@/utils/log';

import { browserLocation } from './browser-location';

/**
 * 로그아웃. 응답과 상관없이(401·5xx·네트워크 포함) 로컬을 정리하고 하드 이동한다(tech-decisions §4 인증 표).
 * 만료·잘못된 액세스 쿠키가 실려 있으면 백엔드가 401을 내고 쿠키를 지우지 않는다 — 그래도 `dd:session`을 지워
 * 이 브라우저는 익명으로 시작한다. 다른 탭은 `storage` 이벤트로 따라온다.
 */
export async function logoutAndLeave(queryClient: QueryClient, to = '/') {
  try {
    await requestLogout();
  } catch (e) {
    log('warn', 'auth.logout_failed', isApiError(e) ? { status: e.status, code: e.code } : {});
  }
  queryClient.clear();
  clearSessionFlag();
  browserLocation.assign(to);
}

/**
 * 로그아웃 버튼용. 진행 중인 변경이 있으면 `disabled` — 하드 이동이 진행 중인 POST(주문 생성 등)를 끊지 않게.
 * `<Button onClick={logout} disabled={disabled} loading={pending}>로그아웃</Button>`
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const mutating = useIsMutating();
  const [pending, setPending] = useState(false);
  const logout = useCallback(async () => {
    if (pending) return;
    setPending(true);
    await logoutAndLeave(queryClient);
  }, [pending, queryClient]);
  return { logout, pending, disabled: pending || mutating > 0 };
}
