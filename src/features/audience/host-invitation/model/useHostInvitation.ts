'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { isApiError } from '@/api/errors';
import { handleError } from '@/api/handle-error';
import { MY_HOSTS_KEY } from '@/api/host/queries';
import { acceptHostInvitationMutation } from '@/api/host-invitation/mutations';
import { hostInvitationLandingQuery } from '@/api/host-invitation/queries';
import type { HostInvitationAccept, HostInvitationLanding } from '@/api/host-invitation/schema';
import { meQuery } from '@/api/me/queries';
import { loginHref } from '@/features/shared/auth/model/login-href';

import {
  HOST_INVITATIONS_PATH,
  isInviteTokenShape,
  keepInviteTokenForLogin,
  stripInviteTokenFromUrl,
  takeInviteToken,
} from './invite-token';

/** 쓸 수 없는 초대 — 만료 `HOST_400_19` · 이미 사용 `HOST_400_20` · 없음/취소/옛 링크 `HOST_404_3` */
export type InvalidInvitation = 'expired' | 'used' | 'missing';

const INVALID_BY_CODE: Record<string, InvalidInvitation> = {
  HOST_400_19: 'expired',
  HOST_400_20: 'used',
  HOST_404_3: 'missing',
};

export type HostInvitationState =
  /** 토큰 · 세션 확인 중, 또는 로그인으로 가는 중 */
  | { status: 'checking' }
  /** 토큰이 없다 — 주소를 지운 뒤 새로고침했거나 저장소가 막힘 */
  | { status: 'noToken' }
  | { status: 'invalid'; reason: InvalidInvitation }
  /** GM-1 · H-19의 5xx · 네트워크 · 서버에 API 없음(운영 2.5.3 404) */
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; landing: HostInvitationLanding }
  | { status: 'accepted'; result: HostInvitationAccept; hostName: string | null };

const invalidOf = (error: unknown): InvalidInvitation | null =>
  isApiError(error) && error.code ? (INVALID_BY_CODE[error.code] ?? null) : null;

/**
 * 호스트 초대 수락(`/host-invitations/{token}`, H-19 · H-20 — 백엔드 #933, B33②). 로그인 필요.
 * 게이트(`(protected)`) 밖에 둔다 — 게이트는 지금 주소(토큰 포함)를 로그인 `redirect`에 넣기 때문이다. 대신 이 훅이 세션을 보고
 * 익명이면 토큰을 탭 저장소에 잠깐 두고 `/login?redirect=/host-invitations`로 보낸다(`invite-token.ts`).
 *
 * - 수락(H-20) 응답의 `role`이 내 역할이다 — 이미 멤버였으면 기존 역할(초대한 역할과 다를 수 있다, 백엔드 #928). 화면은 이 값으로 말한다
 * - 수락 뒤 `myRole`을 주는 쿼리(GM-1 `hosts` · GH-1 · 그 호스트 키)를 무효화한다
 * - 수락 실패: 만료 · 사용됨 · 없음은 `invalid`, 그 밖은 공용 토스트(handleError)
 */
export function useHostInvitation(routeToken: string | null) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // undefined = 아직 모름(서버 렌더 · 첫 그림). 한 번만 정한다(Strict Mode 이중 effect에서 저장소를 두 번 꺼내지 않게)
  const captured = useRef<string | null | undefined>(undefined);
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (captured.current === undefined) {
      if (routeToken !== null) {
        stripInviteTokenFromUrl();
        // 새 링크로 들어왔으면 예전에 남은 값은 버린다
        takeInviteToken();
        captured.current = routeToken;
      } else {
        captured.current = takeInviteToken();
      }
    }
    setToken(captured.current);
  }, [routeToken]);

  const session = useQuery({ ...meQuery(), enabled: token !== undefined && token !== null });
  const me = session.data;
  const validShape = token ? isInviteTokenShape(token) : false;

  useEffect(() => {
    if (!token || me !== null) return;
    keepInviteTokenForLogin(token);
    router.replace(loginHref(HOST_INVITATIONS_PATH));
  }, [me, router, token]);

  const landing = useQuery({
    ...hostInvitationLandingQuery(token ?? ''),
    enabled: Boolean(me) && validShape,
  });

  const [accepted, setAccepted] = useState<HostInvitationAccept | null>(null);
  const [acceptInvalid, setAcceptInvalid] = useState<InvalidInvitation | null>(null);
  const mutation = useMutation({
    ...acceptHostInvitationMutation(token ?? ''),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: meQuery().queryKey }),
        queryClient.invalidateQueries({ queryKey: MY_HOSTS_KEY }),
        queryClient.invalidateQueries({ queryKey: ['hosts', String(result.hostId)] }),
      ]);
    },
  });

  const accept = useCallback(async () => {
    if (mutation.isPending || !token || accepted) return false;
    try {
      setAccepted(await mutation.mutateAsync());
      return true;
    } catch (e) {
      const invalid = invalidOf(e);
      if (invalid) setAcceptInvalid(invalid);
      else handleError(e);
      return false;
    }
  }, [accepted, mutation, token]);

  const state: HostInvitationState = (() => {
    if (token === undefined) return { status: 'checking' };
    if (token === null) return { status: 'noToken' };
    if (session.status === 'error' && me === undefined) {
      return { status: 'error', retry: () => void session.refetch() };
    }
    if (!me) return { status: 'checking' };
    if (!validShape) return { status: 'invalid', reason: 'missing' };
    if (accepted) {
      return { status: 'accepted', result: accepted, hostName: landing.data?.hostName ?? null };
    }
    if (acceptInvalid) return { status: 'invalid', reason: acceptInvalid };
    if (landing.status === 'error') {
      const invalid = invalidOf(landing.error);
      return invalid
        ? { status: 'invalid', reason: invalid }
        : { status: 'error', retry: () => void landing.refetch() };
    }
    if (landing.status === 'pending') return { status: 'checking' };
    return { status: 'ready', landing: landing.data };
  })();

  return { state, accept, accepting: mutation.isPending };
}
