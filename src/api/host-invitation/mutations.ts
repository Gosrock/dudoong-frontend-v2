import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import { invitationsPath } from './queries';
import {
  type CreateHostInvitationRequest,
  HostInvitationAcceptSchema,
  HostInvitationCreatedSchema,
  HostInvitationsSchema,
} from './schema';

/**
 * H-16 초대 링크 발급(매니저 이상, 매니저는 `GUEST`만 — 403 `HOST_400_11`). 같은 이메일에 대기 초대가 있으면 새 링크로 바꾼다(옛 링크 무효).
 * - `HOST_400_15` 이미 멤버인 계정의 이메일 · `HOST_400_21` 발급 한도(호스트 24시간 20건 · 초대한 사람 24시간 50건)
 * - 서버가 링크 메일을 보내지만 실패할 수 있어 화면은 링크 복사를 준다
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
