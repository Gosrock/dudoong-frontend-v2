import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import {
  type AddHostMembersRequest,
  type AssignableHostRole,
  type CreateHostRequest,
  CreateHostResponseSchema,
  HostFollowSchema,
  HostMembersSchema,
  type TransferMasterRequest,
  type UpdateHostRequest,
  UpdateHostResponseSchema,
} from './schema';

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
 * - `HOST_400_16` 연락처 형식 오류, 400 `BAD_REQUEST` 검증 오류(이름 1~15자, 연락처 1~10개 등 — 폼이 먼저 막는다)
 */
export const createHostMutation = () =>
  mutationOptions({
    mutationFn: (body: CreateHostRequest) => api.post('hosts', CreateHostResponseSchema, body),
  });

const hostPath = (hostId: string | number) => `hosts/${encodeURIComponent(hostId)}`;

/**
 * PH-4 호스트 설정(매니저 이상). 바뀐 필드만 보낸다(키가 없으면 변경 안 함, `contacts`는 전체 교체 — patterns §23).
 * 응답은 GH-3과 같은 모양(요청자 기준 `myRole`·원문 연락처)이라 화면이 viewer 키에 넣는다.
 * - `HOST_400_16` 연락처 형식, `HOST_400_17` 이 호스트에 발급한 이미지 key가 아님(업로드를 처음부터)
 */
export const updateHostMutation = (hostId: string | number) =>
  mutationOptions({
    mutationFn: (body: UpdateHostRequest) =>
      api.patch(hostPath(hostId), UpdateHostResponseSchema, body),
  });

/*
 * 멤버 변경 4종(PH-7 · PH-10 · DH-11 · PH-12)은 모두 **변경 뒤 활성 멤버 전체 목록**을 돌려준다(GH-6과 같은 모양·순서,
 * `V2ReadHostMembersUseCase.toMemberResponses`, 432cce4) — 화면이 GH-6 키에 그대로 넣는다(patterns §22).
 */

/**
 * PH-7 멤버 추가(매니저 이상, 수락 없이 바로 활성). 하나라도 문제가 있으면 아무도 추가하지 않고, 문제 이메일을
 * `reason` 끝 괄호에 `, `로 이어 붙인다(`HostErrorCode.toDetailException`): `HOST_400_13` 미가입 · `HOST_400_14` 중복(소문자) ·
 * `HOST_400_15` 이미 멤버 · `HOST_400_18` 같은 이메일 계정이 여럿. 매니저가 `MANAGER`를 보내면 403 `HOST_400_11`
 */
export const addHostMembersMutation = (hostId: string | number) =>
  mutationOptions({
    mutationFn: (body: AddHostMembersRequest) =>
      api.post(`${hostPath(hostId)}/members`, HostMembersSchema, body),
  });

/**
 * PH-10 역할 변경 일반 ↔ 매니저(마스터만). 다른 멤버의 역할이라 내 `myRole`은 바뀌지 않는다.
 * - 404 `HOST_404_2` 활성 멤버가 아님, `HOST_400_5` 마스터 대상, `HOST_400_10` MASTER 지정(화면이 미리 막는다)
 */
export const updateHostMemberRoleMutation = (hostId: string | number) =>
  mutationOptions({
    mutationFn: ({ userId, role }: { userId: number; role: AssignableHostRole }) =>
      api.patch(`${hostPath(hostId)}/members/${userId}/role`, HostMembersSchema, { role }),
  });

/**
 * DH-11 멤버 삭제(매니저 이상, 매니저는 일반 멤버만 — 아니면 403 `HOST_400_11`). 마스터는 지울 수 없다(`HOST_400_12`).
 * 본인 삭제(나가기)는 이 규칙들로 늘 막힌다(`V2RemoveHostMemberUseCase`). 404 `HOST_404_2` 이미 없는 멤버
 */
export const removeHostMemberMutation = (hostId: string | number) =>
  mutationOptions({
    mutationFn: (userId: number) =>
      api.delete(`${hostPath(hostId)}/members/${userId}`, HostMembersSchema),
  });

/**
 * PH-12 마스터 양도(마스터만). 기존 마스터(나)는 매니저가 된다 — 화면이 `myRole`을 주는 쿼리를 무효화한다(patterns §22).
 * 404 `HOST_404_2` 대상이 활성 멤버가 아님
 */
export const transferMasterMutation = (hostId: string | number) =>
  mutationOptions({
    mutationFn: (body: TransferMasterRequest) =>
      api.post(`${hostPath(hostId)}/transfer-master`, HostMembersSchema, body),
  });
