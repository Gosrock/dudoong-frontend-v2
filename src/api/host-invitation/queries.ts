import { queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { HostInvitationLandingSchema, HostInvitationsSchema } from './schema';

/** H-16 · H-17 · H-18 경로 */
export const invitationsPath = (hostId: string | number) =>
  `hosts/${encodeURIComponent(hostId)}/invitations`;

/**
 * H-17 대기 중인 초대(매니저 이상, 브라우저에서만). 만료·수락·취소된 초대는 빠진다. 이메일 원문이 온다(`@PrivacyAccess(LIST)`).
 * 호스트 키 아래 `['hosts', id, 'invitations']` — H-16 발급 · H-18 취소 뒤 화면이 바꾼다
 */
export const hostInvitationsQuery = (hostId: string | number) =>
  queryOptions({
    queryKey: ['hosts', String(hostId), 'invitations'],
    queryFn: ({ signal }) => api.get(invitationsPath(hostId), HostInvitationsSchema, { signal }),
  });

/**
 * H-19 초대 수락 화면(로그인, 브라우저에서만). `HOST_404_3` 없음·취소·옛 링크 · `HOST_400_20` 사용됨 · `HOST_400_19` 만료.
 * 토큰은 키에만 두고(메모리) 저장소·로그에 남기지 않는다. 실패를 다시 시도해도 결과가 같은 4xx는 재시도하지 않는다(전역 기본값)
 */
export const hostInvitationLandingQuery = (token: string) =>
  queryOptions({
    queryKey: ['host-invitations', token],
    staleTime: Infinity,
    queryFn: ({ signal }) =>
      api.get(`host-invitations/${encodeURIComponent(token)}`, HostInvitationLandingSchema, {
        signal,
      }),
  });
