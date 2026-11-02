import { z } from 'zod';

import {
  CONTACT_VALUE_MAX,
  contactRequestSchema,
  ContactSchema,
  HostRoleSchema,
  PlaceSchema,
} from '../shared/common-schema';
import { kstDateTime } from '../shared/date';
import { openEnum } from '../shared/open-enum';
import { pageSchema } from '../shared/page';

/**
 * 공연 탐색(공개) 응답. 기준: 백엔드 `v2/event/dto/response/V2EventBrowseResponses.kt`·`V2EventSectionResponse.kt`,
 * `v2/tag/dto/V2TagResponse.kt`(dev 24aa595). 응답 필드는 키가 항상 있고 값이 없으면 `null`(api-contract §1).
 */

// ─── enum ────────────────────────────────────────────────────

export const TAG_CATEGORIES = ['EVENT_TYPE', 'GENRE', 'AREA', 'TEAM'] as const;
export const TagCategorySchema = openEnum('TagCategory', TAG_CATEGORIES);

/** 공연 표시 상태. 서버가 요청 시점에 계산한다(patterns §14). 공개 API에는 PREPARING이 오지 않는다 */
export const EVENT_DISPLAY_STATUSES = ['PREPARING', 'UPCOMING', 'ONGOING', 'PAST'] as const;
export const EventDisplayStatusSchema = openEnum('EventDisplayStatus', EVENT_DISPLAY_STATUSES);
export type EventDisplayStatus = z.infer<typeof EventDisplayStatusSchema>;

/** 공연 저장 상태(api-contract §3) */
export const EVENT_STATUSES = ['PREPARING', 'OPEN', 'CALCULATING', 'CLOSED', 'DELETED'] as const;
export const EventStatusSchema = openEnum('EventStatus', EVENT_STATUSES);
export type EventStatus = z.infer<typeof EventStatusSchema>;

export const SECTION_CONTENT_FORMATS = ['HTML', 'MARKDOWN'] as const;
export const SectionContentFormatSchema = openEnum('SectionContentFormat', SECTION_CONTENT_FORMATS);

/** GP-2 정렬. 지금은 공연임박순 하나(patterns §13) */
export const EVENT_SORTS = ['UPCOMING'] as const;
export type EventSort = (typeof EVENT_SORTS)[number];

// ─── 태그 (GE-11) ────────────────────────────────────────────

export const TagGroupSchema = z.object({
  category: TagCategorySchema,
  tags: z.array(z.object({ tagId: z.number().int(), name: z.string() })),
});
export const TagGroupsSchema = z.array(TagGroupSchema);
export type TagGroup = z.infer<typeof TagGroupSchema>;

/** 공연 리스트·상세의 태그(분류 순 → 분류 안 순서) */
export const TagSchema = z.object({
  tagId: z.number().int(),
  category: TagCategorySchema,
  name: z.string(),
});
export type Tag = z.infer<typeof TagSchema>;

// ─── 홈 (GP-1) ───────────────────────────────────────────────

export const HomeEventSchema = z.object({
  eventId: z.number().int(),
  name: z.string().nullable(),
  posterImageUrl: z.string().nullable(),
  startAt: kstDateTime.nullable(),
  placeName: z.string().nullable(),
  hostName: z.string().nullable(),
  /** UPCOMING(시작 전) / ONGOING(진행 중) */
  displayStatus: EventDisplayStatusSchema /**
   * 카드 가격 줄 값(백엔드 #925 — 2.5.6, 스테이징만). 운영 2.5.3 응답에는 없어 optional — 없으면 가격 줄을 그리지 않는다.
   * '판매 중' = 판매 중단 아님 + 판매 기간 안(O-0과 같은 기준), 잔여 = 재고 − 승인 대기
   */,
  hasTicket: z.boolean().optional(),
  /** 판매 중 티켓의 최저가(원). 판매 중 티켓이 없거나 지난 공연이면 null */
  minPrice: z.number().int().nullable().optional(),
  /** 판매 중 티켓이 있고 모두 0원 */
  isFree: z.boolean().optional(),
  /** 판매 중 티켓이 있고 모두 매진(GP-5 `isSoldOut`과 같은 기준) */
  isSoldOut: z.boolean().optional(),
});
/** 종료 전 OPEN 공연, 시작 임박순(진행 중이 앞) 최대 10개 */
export const HomeSchema = z.object({ events: z.array(HomeEventSchema) });
export type HomeEvent = z.infer<typeof HomeEventSchema>;
export type Home = z.infer<typeof HomeSchema>;

// ─── 공연 리스트 (GP-2) ──────────────────────────────────────

export const EventListItemSchema = z.object({
  eventId: z.number().int(),
  name: z.string().nullable(),
  posterImageUrl: z.string().nullable(),
  startAt: kstDateTime.nullable(),
  endAt: kstDateTime.nullable(),
  placeName: z.string().nullable(),
  hostName: z.string().nullable(),
  tags: z.array(TagSchema),
  /** UPCOMING / ONGOING / PAST(종료·정산중·지난공연) */
  displayStatus: EventDisplayStatusSchema /**
   * 카드 가격 줄 값(백엔드 #925 — 2.5.6, 스테이징만). 운영 2.5.3 응답에는 없어 optional — 없으면 가격 줄을 그리지 않는다.
   * '판매 중' = 판매 중단 아님 + 판매 기간 안(O-0과 같은 기준), 잔여 = 재고 − 승인 대기
   */,
  hasTicket: z.boolean().optional(),
  /** 판매 중 티켓의 최저가(원). 판매 중 티켓이 없거나 지난 공연이면 null */
  minPrice: z.number().int().nullable().optional(),
  /** 판매 중 티켓이 있고 모두 0원 */
  isFree: z.boolean().optional(),
  /** 판매 중 티켓이 있고 모두 매진(GP-5 `isSoldOut`과 같은 기준) */
  isSoldOut: z.boolean().optional(),
});
export const EventListPageSchema = pageSchema(EventListItemSchema);
export type EventListItem = z.infer<typeof EventListItemSchema>;

// ─── 공연 상세 (GP-3) ────────────────────────────────────────

export const EventHostSummarySchema = z.object({
  hostId: z.number().int(),
  name: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
});

export const EventDetailSchema = z.object({
  eventId: z.number().int(),
  name: z.string().nullable(),
  posterImageUrl: z.string().nullable(),
  startAt: kstDateTime.nullable(),
  endAt: kstDateTime.nullable(),
  /** 진행 시간(분) */
  runTime: z.number().int().nullable(),
  /** 미입력이면 null */
  place: PlaceSchema.nullable(),
  /** false면 티켓 없이 정보만 공개하는 공연 */
  hasTicket: z.boolean(),
  tags: z.array(TagSchema),
  host: EventHostSummarySchema,
  /** 공연 문의처. 없으면 호스트 연락처 */
  contacts: z.array(ContactSchema),
  displayStatus: EventDisplayStatusSchema,
});
export type EventDetail = z.infer<typeof EventDetailSchema>;

// ─── 섹션 (GE-5) ─────────────────────────────────────────────

export const EventSectionSchema = z.object({
  /** 섹션이 없는 기존 공연의 v1 본문 대체 표시면 null */
  sectionId: z.number().int().nullable(),
  title: z.string(),
  content: z.string().nullable(),
  /** HTML(v2 에디터) / MARKDOWN(v1 본문) — 렌더러를 고른다 */
  contentFormat: SectionContentFormatSchema,
  sortOrder: z.number().int(),
});
export const EventSectionsSchema = z.array(EventSectionSchema);
export type EventSection = z.infer<typeof EventSectionSchema>;

// ─── 내 공연 (GE-1) ──────────────────────────────────────────

/**
 * 내가 활성 멤버인 호스트들의 공연(공연준비 홈 공연 탭). 준비중 포함, 최신 생성 순.
 * 기준: 백엔드 `v2/event/dto/response/V2MyEventResponse.kt`(dev 432cce4).
 * 장소는 `place` 객체가 아니라 평평한 세 필드다(미입력이면 `null`).
 */
export const MyEventSchema = z.object({
  eventId: z.number().int(),
  hostId: z.number().int(),
  hostName: z.string().nullable(),
  /** 이 공연 호스트에서 내 역할. 일반 멤버는 공연을 지울 수 없다 — 카드 ⋮ 표시용(P11) */
  myRole: HostRoleSchema,
  name: z.string().nullable(),
  posterImageUrl: z.string().nullable(),
  startAt: kstDateTime.nullable(),
  endAt: kstDateTime.nullable(),
  /** 공연장 이름. 미입력이면 null */
  placeName: z.string().nullable(),
  placeAddress: z.string().nullable(),
  /** 상세주소(없으면 null, #740) */
  placeDetailAddress: z.string().nullable(),
  /** 저장 상태(PREPARING / OPEN / CALCULATING / CLOSED) */
  status: EventStatusSchema,
  displayStatus: EventDisplayStatusSchema,
  /** D-n의 n(당일 0). UPCOMING일 때만, 아니면 null */
  dDay: z.number().int().nullable(),
});
export const MyEventPageSchema = pageSchema(MyEventSchema);
export type MyEvent = z.infer<typeof MyEventSchema>;

// ─── 공연 관리 (호스팅 센터 P11) ─────────────────────────────

/*
 * 입력 규칙 — 백엔드 소스와 같은 값(api-contract §4 "공연"·"섹션").
 * 기준: `V2CreateEventRequest`·`V2UpdateEventBasicRequest`(`V2EventPlaceRequest`·`V2EventContactRequest`)·`V2EventSectionRequest`,
 * 도메인 `V2EventDomainService`(MAX_CONTACT_COUNT 10 · MAX_SECTION_COUNT 10 · MAX_TAG_COUNT = `EventTag.MAX_PER_EVENT` 10),
 * `EventSection`(TITLE_MAX_LENGTH 20 · CONTENT_MAX_LENGTH 20,000), `EventContact.VALUE_MAX_LENGTH` 200 (dev 432cce4 — cb8d24e까지 공연 API 변경 없음)
 */
export const EVENT_NAME_MAX = 25;
/** 공연장 이름·주소·상세주소 255자 */
export const EVENT_PLACE_TEXT_MAX = 255;
/** 공연 문의처 0~10개(체크리스트 ①은 1개 이상), 값 200자. 호스트 연락처와 달리 전화 15자 제한이 없다 */
export const EVENT_CONTACTS_MAX = 10;
export const EVENT_CONTACT_VALUE_MAX = CONTACT_VALUE_MAX;
/** 태그는 중복을 뺀 뒤 10개까지(넘으면 `Event_400_23`) */
export const EVENT_TAGS_MAX = 10;
export const EVENT_POSTER_KEY_MAX = 255;
export const EVENT_SECTIONS_MIN = 1;
export const EVENT_SECTIONS_MAX = 10;
export const EVENT_SECTION_TITLE_MAX = 20;
/** 본문 HTML 길이(서버가 sanitize한 뒤 잰다 — `Event_400_21`) */
export const EVENT_SECTION_CONTENT_MAX = 20_000;

/**
 * GE-7 등록 체크리스트(GE-3 `checklist`도 같은 모양). 기준: `V2EventChecklistResponse`·`V2EventDomainService.checklist`(432cce4).
 * ① `isBasicFilled` 포스터·이름·일정·장소 4필드·문의처 1개 이상 ② `isDetailFilled` 본문 있는 섹션 1개 이상
 * ③ `hasValidTicket` 유효 티켓(면제와 무관한 실제 값), `ticketRequired` false면 ③ 면제(`hasTicket=false`).
 * `canOpen` = 셋 충족 + 준비중 + 시작 전
 */
export const EventChecklistSchema = z.object({
  isBasicFilled: z.boolean(),
  isDetailFilled: z.boolean(),
  hasValidTicket: z.boolean(),
  ticketRequired: z.boolean(),
  canOpen: z.boolean(),
});
export type EventChecklist = z.infer<typeof EventChecklistSchema>;

/**
 * GE-3 공연 관리 상세(일반 멤버 이상) — PE-4 응답도 같은 모양. 기준: `V2EventManageResponse`(432cce4).
 * `myRole`은 멤버가 아닌 SUPER_ADMIN이면 `null`. `checklist`가 함께 온다(GE-7과 같은 값 — 문서에는 없던 필드).
 */
export const EventManageSchema = z.object({
  eventId: z.number().int(),
  hostId: z.number().int(),
  hostName: z.string().nullable(),
  myRole: HostRoleSchema.nullable(),
  /** PE-4 `posterImageKey`로 다시 보낼 수 있는 값. 포스터가 없으면 null */
  posterImageKey: z.string().nullable(),
  posterImageUrl: z.string().nullable(),
  name: z.string().nullable(),
  startAt: kstDateTime.nullable(),
  endAt: kstDateTime.nullable(),
  /** 진행 시간(분, v1 호환) */
  runTime: z.number().int().nullable(),
  /** 이름·주소가 모두 없으면 null */
  place: PlaceSchema.nullable(),
  contacts: z.array(ContactSchema),
  hasTicket: z.boolean(),
  tags: z.array(TagSchema),
  /** PREPARING / OPEN / CALCULATING / CLOSED */
  status: EventStatusSchema,
  displayStatus: EventDisplayStatusSchema,
  /** UPCOMING일 때만 */
  dDay: z.number().int().nullable(),
  /** 최초 등록 시각(#802). 준비중이거나 2026-10 이전 오픈이면 null(design-requests Q43) */
  openedAt: kstDateTime.nullable(),
  checklist: EventChecklistSchema,
});
export type EventManage = z.infer<typeof EventManageSchema>;

/** 공연 문의처 한 줄(`V2EventContactRequest`) — 공용 `contactRequestSchema`(전화 15자 제한 없음) */
const eventContactRequest = contactRequestSchema;

/** PE-2 간편 공연 만들기(호스트의 매니저 이상). 시작은 현재 이후(`@Future`), 종료 > 시작(`Event_400_2`) */
export const CreateEventRequestSchema = z
  .object({
    hostId: z.number().int().positive(),
    name: z.string().trim().min(1).max(EVENT_NAME_MAX),
    startAt: kstDateTime,
    endAt: kstDateTime,
    hasTicket: z.boolean(),
  })
  .strict();
export type CreateEventRequest = z.infer<typeof CreateEventRequestSchema>;
export const CreateEventResponseSchema = z.object({ eventId: z.number().int() });

/** PE-4 장소 — 상세주소 외 필수, 통째로 교체(빼면 상세주소가 지워진다) */
export const EventPlaceRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(EVENT_PLACE_TEXT_MAX),
    address: z.string().trim().min(1).max(EVENT_PLACE_TEXT_MAX),
    latitude: z.number(),
    longitude: z.number(),
    /** 선택. 빼거나 비우면 지워진다 — 화면은 늘 보낸다(plan P11) */
    detailAddress: z.string().max(EVENT_PLACE_TEXT_MAX).nullable().optional(),
  })
  .strict();
export type EventPlaceRequest = z.infer<typeof EventPlaceRequestSchema>;

/**
 * PE-4 기본 정보 부분 수정(매니저 이상). 키가 없으면 변경 안 함(patterns §23). `posterImageKey` `""`는 포스터 제거.
 * `place`·`contacts`·`tagIds`는 통째로 교체. `hasTicket`은 준비중일 때만(`Event_400_18`)
 */
export const UpdateEventBasicRequestSchema = z
  .object({
    posterImageKey: z.string().max(EVENT_POSTER_KEY_MAX),
    name: z.string().trim().min(1).max(EVENT_NAME_MAX),
    startAt: kstDateTime,
    endAt: kstDateTime,
    place: EventPlaceRequestSchema,
    contacts: z.array(eventContactRequest).max(EVENT_CONTACTS_MAX),
    hasTicket: z.boolean(),
    tagIds: z.array(z.number().int()).max(EVENT_TAGS_MAX),
  })
  .partial()
  .strict();
export type UpdateEventBasicRequest = z.infer<typeof UpdateEventBasicRequestSchema>;

/** PE-6 섹션 하나. `content`는 에디터 HTML(서버가 sanitize해 HTML로 저장) */
export const EventSectionRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(EVENT_SECTION_TITLE_MAX),
    content: z.string().max(EVENT_SECTION_CONTENT_MAX).nullable(),
    sortOrder: z.number().int(),
  })
  .strict();
/** PE-6 섹션 전체 교체 `{sections}`(1~10개, 빠진 섹션은 지워진다 — #755로 객체로 감쌌다) */
export const UpdateEventSectionsRequestSchema = z
  .object({
    sections: z.array(EventSectionRequestSchema).min(EVENT_SECTIONS_MIN).max(EVENT_SECTIONS_MAX),
  })
  .strict();
export type UpdateEventSectionsRequest = z.infer<typeof UpdateEventSectionsRequestSchema>;

/** PE-8 등록 · DE-9 삭제 응답(`V2EventStatusResponse`). 화면을 채울 값이 아니라 쿼리를 무효화한다(patterns §23) */
export const EventStatusResultSchema = z.object({
  eventId: z.number().int(),
  status: EventStatusSchema,
  displayStatus: EventDisplayStatusSchema,
});
