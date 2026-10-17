import { z } from 'zod';

import { HostRoleSchema } from '../shared/common-schema';

/** 내 프로필. 기준: 백엔드 `v2/mypage/dto/response/V2MyPageResponses.kt`(`V2MeResponse`, dev 24aa595). PM-2 응답도 같다 */

export const MeHostSchema = z.object({
  hostId: z.number().int(),
  name: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
  myRole: HostRoleSchema,
});

export const MeSchema = z.object({
  userId: z.number().int(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  /** 기본 이미지면 null */
  profileImageUrl: z.string().nullable(),
  /** 소속(활성) 호스트, 합류 최신순 최대 10개 */
  hosts: z.array(MeHostSchema),
  /** 소속 호스트 전체 수. hosts보다 많으면 GH-1로 전체 목록 */
  hostCount: z.number().int(),
});
export type Me = z.infer<typeof MeSchema>;
export type MeHost = z.infer<typeof MeHostSchema>;
