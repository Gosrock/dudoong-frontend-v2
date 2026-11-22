import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import { invitationsPath } from './queries';
import {
  type CreateHostInvitationRequest,
  HostInvitationAcceptSchema,
  HostInvitationCreatedSchema,
  HostInvitationRejectSchema,
  HostInvitationsSchema,
} from './schema';

/**
 * H-16 멤버 초대(매니저 이상, 매니저는 `GUEST`만 — 403 `HOST_400_11`). **가입한 이메일도 이것으로 보낸다**(B71 — 상대가 수락해야 멤버).
 * 같은 이메일에 대기 초대가 있으면 새 링크로 바꾼다(옛 링크 무효). 서버가 초대 메일을 보낸다. 여러 명은 이메일마다 부른다(묶음 API 없음).
 * - `HOST_400_15` 이미 멤버인 계정의 이메일 · `HOST_400_21` 발급 한도(호스트 24시간 20건 · 초대한 사람 24시간 50건)
 */
export const createHostInvitationMutation = (hostId: string | number) =>
  mutationOptions({
    mutationFn: (body: CreateHostInvitationRequest) =>
      api.post(invitationsPath(hostId), HostInvitationCreatedSchema, body),
  });

/** H-18 초대 취소(매니저 이상, 매니저는 GUEST 초대만). 링크는 바로 무효. 응답은 남은 대기 초대 목록. 이미 없는 초대는 404 `HOST_404_3` */
export const cancelHostInvitationMutation = (hostId: string | number) =>
  mutationOptions({
    mutationFn: (invitationId: number) =>
      api.delete(`${invitationsPath(hostId)}/${invitationId}`, HostInvitationsSchema),
  });

/**
 * H-20 초대 수락(로그인). 로그인한 사람을 초대 역할의 멤버로 넣는다(이메일 일치는 보지 않는다). 이미 멤버면 200 + `alreadyMember`.
 * 에러는 H-19와 같다(`HOST_404_3` · `HOST_400_20` · `HOST_400_19`)
 */
export const acceptHostInvitationMutation = (token: string) =>
  mutationOptions({
    mutationFn: () =>
      api.post(`host-invitations/${encodeURIComponent(token)}/accept`, HostInvitationAcceptSchema),
  });

/**
 * H-21 초대 거절(로그인, 본문 없음 — Api 2.5.16, #348 B72). 응답 `{hostId, hostName}`.
 * 에러는 H-20 수락과 같다(`HOST_404_3` 없음 · 취소 · 옛 링크 · `HOST_400_20` 사용됨(수락 · 거절) · `HOST_400_19` 만료)
 */
export const rejectHostInvitationMutation = (token: string) =>
  mutationOptions({
    mutationFn: () =>
      api.post(`host-invitations/${encodeURIComponent(token)}/reject`, HostInvitationRejectSchema),
  });
