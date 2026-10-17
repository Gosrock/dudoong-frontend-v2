import { z } from 'zod';

import { openEnum } from './open-enum';

/**
 * 여러 도메인 응답에 같은 모양으로 나오는 조각. 도메인 폴더끼리 서로 import하면 순환이 생겨 여기 둔다.
 * 기준: 백엔드 `v2/common/V2ContactResponse`, `v2/event/dto/response/V2EventPlaceResponse`.
 */

/** 연락처 `type`(api-contract §3). 아이콘·링크 매핑은 한 곳에서(patterns §14) — UNKNOWN 분기 포함 */
export const CONTACT_TYPES = [
  'PHONE',
  'EMAIL',
  'INSTAGRAM',
  'OPEN_CHAT',
  'YOUTUBE',
  'ETC',
] as const;

/** 문의처(호스트 GH-3, 공연 상세 GP-3, 관리 상세 GE-3 공통) */
export const ContactSchema = z.object({
  type: openEnum('ContactType', CONTACT_TYPES),
  value: z.string(),
});
export type Contact = z.infer<typeof ContactSchema>;

/** 공연 장소(GP-3·GE-3·GH-14 공통). 이름·주소가 모두 없으면 응답에서 `place` 자체가 `null`이다 */
export const PlaceSchema = z.object({
  name: z.string().nullable(),
  address: z.string().nullable(),
  detailAddress: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});
export type Place = z.infer<typeof PlaceSchema>;

/** 호스트 안의 역할(api-contract §2). GH-3 `myRole`, GM-1 `hosts[].myRole` 등 */
export const HOST_ROLES = ['MASTER', 'MANAGER', 'GUEST'] as const;
export const HostRoleSchema = openEnum('HostRole', HOST_ROLES);
export type HostRole = z.infer<typeof HostRoleSchema>;
