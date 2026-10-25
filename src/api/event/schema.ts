import { z } from 'zod';

import { ContactSchema, HostRoleSchema, PlaceSchema } from '../shared/common-schema';
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
  displayStatus: EventDisplayStatusSchema,
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
  displayStatus: EventDisplayStatusSchema,
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
