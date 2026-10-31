import { z } from 'zod';

import { TICKET_PRICE_MAX, TicketOptionTypeSchema } from '../ticket-item/schema';

/*
 * 공연 옵션 풀(호스팅 센터 P12). 기준: 백엔드 `v2/ticket/dto/response/V2TicketItemManageResponse.kt`(`V2TicketOptionResponse`)·
 * `dto/request/V2TicketOptionRequest.kt`, 도메인 `V2TicketOptionDomainService`(432cce4, dev cb8d24e까지 변경 없음).
 * 옵션은 공연 단위 풀에 있고 티켓에 붙인다(P10/O-5). 붙은 옵션은 관객에게 모두 필수 응답이다.
 */

/** 이름 1~20자(`NAME_MAX_LENGTH`) */
export const OPTION_NAME_MAX = 20;
/** 설명 1~50자(앞뒤 공백 제외, **필수** — 넘으면 `Option_Group_400_6`. 수정은 값이 바뀔 때만 검증) */
export const OPTION_DESCRIPTION_MAX = 50;
/** '네' 추가금 0 ~ 1,000만 원(네/아니오만) */
export const OPTION_PRICE_MAX = TICKET_PRICE_MAX;

/** v2에서 만들 수 있는 응답 형식(MULTIPLE_CHOICE는 400 `Option_Group_400_4`) */
export const CREATABLE_OPTION_TYPES = ['SUBJECTIVE', 'YES_NO'] as const;
export type CreatableOptionType = (typeof CREATABLE_OPTION_TYPES)[number];

/** G10/O-1 옵션 풀의 옵션(생성 순). O-2·O-3 응답도 이 모양 하나, O-4 응답은 남은 목록 */
export const TicketOptionManageSchema = z.object({
  optionId: z.number().int(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  type: TicketOptionTypeSchema.nullable(),
  /** '네' 선택 시 추가 금액. YES_NO가 아니면 null */
  yesAdditionalPrice: z.number().int().nullable(),
  /** 이 옵션이 붙은 유효 티켓 id(오름차순) */
  appliedTicketItemIds: z.array(z.number().int()),
  /** 잠긴 티켓(판매됨·승인 대기)에 붙어 있으면 true — 이름·설명만 수정, 삭제·떼기 불가 */
  isLocked: z.boolean(),
});
export const TicketOptionsManageSchema = z.array(TicketOptionManageSchema);
export type TicketOptionManage = z.infer<typeof TicketOptionManageSchema>;

/** P10/O-2 옵션 생성. 추가금은 네/아니오만(주관식에 0이 아닌 값은 400 `Option_Group_400_3`) */
export const CreateOptionRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(OPTION_NAME_MAX),
    description: z.string().trim().min(1),
    type: z.enum(CREATABLE_OPTION_TYPES),
    yesAdditionalPrice: z.number().int().min(0).max(OPTION_PRICE_MAX).optional(),
  })
  .strict();
export type CreateOptionRequest = z.infer<typeof CreateOptionRequestSchema>;

/**
 * P10/O-3 옵션 부분 수정(키 없음 = 변경 안 함). **응답 형식(`type`) 필드가 없다** — 만든 뒤 바꿀 수 없다(서버가 받지 않는다,
 * `.strict()`가 `type`을 거른다). 잠긴 옵션은 이름·설명만(추가금을 바꾸면 `Option_Group_400_5`)
 */
export const UpdateOptionRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(OPTION_NAME_MAX).optional(),
    description: z.string().trim().min(1).optional(),
    yesAdditionalPrice: z.number().int().min(0).max(OPTION_PRICE_MAX).optional(),
  })
  .strict();
export type UpdateOptionRequest = z.infer<typeof UpdateOptionRequestSchema>;
