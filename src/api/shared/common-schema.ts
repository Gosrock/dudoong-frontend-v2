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

/**
 * 연락처 요청 값 상한 — 백엔드 `HostContact`·`EventContact` `VALUE_MAX_LENGTH` 200(dev `f45882e`, 2026-11-02 확인).
 * 전화(`PHONE`) 15자는 **호스트 연락처만**이다(`HostContact.PHONE_MAX_LENGTH` — v1 `tbl_host.contact_number` varchar(15)). 공연 문의처에는 없다
 */
export const CONTACT_VALUE_MAX = 200;
export const HOST_PHONE_CONTACT_MAX = 15;

/**
 * 연락처 한 줄 요청(`V2HostContactRequest`·`V2EventContactRequest` 공통 — `@NotNull type`, `@NotBlank @Size(max = 200) value`, 서버가 앞뒤 공백을 지운다).
 * 호스트 쪽은 `hostContactRequestSchema`(전화 15자)를 쓴다
 */
export const contactRequestSchema = z.object({
  type: z.enum(CONTACT_TYPES),
  value: z.string().trim().min(1).max(CONTACT_VALUE_MAX),
});

/** 호스트 연락처 한 줄(PH-2·PH-4) — 공통 규칙 + 전화 15자 */
export const hostContactRequestSchema = contactRequestSchema.refine(
  (c) => c.type !== 'PHONE' || c.value.length <= HOST_PHONE_CONTACT_MAX,
);

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
