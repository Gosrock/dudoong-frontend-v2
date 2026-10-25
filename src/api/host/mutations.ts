import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import { type CreateHostRequest, CreateHostResponseSchema, HostFollowSchema } from './schema';

/**
 * PH-13 팔로우(로그인). 멱등이라 같은 요청을 다시 보내도 200이다(백엔드 e2e `test_13_follow_idempotent`).
 * 응답 `{hostId, isFollowing, followerCount}`로 viewer 키(`['hosts', id, 'viewer']`)를 갱신한다 — 캐시 반영은 화면이 한다.
 * `followerCount`는 화면에 그리지 않아 공개 키는 무효화하지 않는다(tech-decisions §4).
 */
export const followHostMutation = (hostId: string | number) =>
  mutationOptions({
    mutationFn: () => api.put(`hosts/${encodeURIComponent(hostId)}/follow`, HostFollowSchema),
  });

/** PH-13 팔로우 해제(로그인, 멱등). 관심 호스트 목록(P9)의 해제도 이것을 쓴다. */
export const unfollowHostMutation = (hostId: string | number) =>
  mutationOptions({
    mutationFn: () => api.delete(`hosts/${encodeURIComponent(hostId)}/follow`, HostFollowSchema),
  });

/**
 * PH-2 호스트 만들기(로그인). 만든 사람이 마스터가 된다. 응답은 `{hostId}`뿐이라 화면이 GH-1(`MY_HOSTS_KEY`)을 무효화한다.
 * - `HOST_400_16` 연락처 형식 오류, `GLOBAL_400_1` 검증 오류(이름 1~15자, 연락처 1~10개 등 — 폼이 먼저 막는다)
 */
export const createHostMutation = () =>
  mutationOptions({
    mutationFn: (body: CreateHostRequest) => api.post('hosts', CreateHostResponseSchema, body),
  });
