import {
  EVENT_CONTACT_VALUE_MAX,
  EVENT_CONTACTS_MAX,
  EVENT_NAME_MAX,
  EVENT_TAGS_MAX,
  type EventManage,
  type UpdateEventBasicRequest,
} from '@/api/event/schema';
import type { HostContactType } from '@/api/host/schema';
import { contactInputsOf, type HostContactInput } from '@/features/hosting/host/model/host-fields';

import {
  emptyPlace,
  isPlaceEmpty,
  isSamePlace,
  placeError,
  type PlaceInput,
  placeInputOf,
  toPlaceRequest,
} from './place';
import {
  isSameSchedule,
  SCHEDULE_ERROR,
  scheduleError,
  type ScheduleInput,
  scheduleInputOf,
  toScheduleRange,
} from './schedule';

/**
 * 기본 정보(`/hosting/events/[eventId]/info`, PE-4, plan P11) 폼 값 · 칸 오류 · 바뀐 필드만 보내는 본문.
 * 포스터·이름·일정·장소·문의처·태그·티켓 여부. 처음 값은 GE-3(공연 관리 상세)이고 PATCH는 바뀐 필드만(patterns §23).
 * 문의처 유형·placeholder는 호스트 연락처와 같은 6종(`host-fields.ts` — 서버도 같은 `HostContactType`)이지만 개수·길이 규칙은 공연 것이다
 * (0~10개, 값 200자, 전화 15자 제한 없음 — `V2EventContactRequest`·`V2EventDomainService.replaceContacts`, 432cce4).
 */

export type BasicInfoValues = {
  /** 포스터. `key`가 `undefined`면 바꾸지 않았다, `''`면 지운다(서버 "빈 문자열 = 포스터 제거") */
  poster: { url: string | null; key?: string };
  name: string;
  schedule: ScheduleInput;
  place: PlaceInput;
  contacts: HostContactInput[];
  /** 고른 태그 id(고른 순서). 보낼 때는 그대로 전체 교체 */
  tagIds: number[];
  hasTicket: boolean;
};

/** GE-3 → 폼 값. 문의처가 없으면 빈 한 줄(유형 미선택) — 비운 줄은 보내지 않는다 */
export function basicInfoValuesOf(event: EventManage): BasicInfoValues {
  return {
    poster: { url: event.posterImageUrl },
    name: event.name ?? '',
    schedule: scheduleInputOf(event.startAt, event.endAt),
    place: event.place ? placeInputOf(event.place) : emptyPlace(),
    contacts: contactInputsOf(event.contacts),
    tagIds: event.tags.map((t) => t.tagId),
    hasTicket: event.hasTicket,
  };
}

// ─── 문의처 ──────────────────────────────────────────────────

/** 유형도 값도 없는 줄 — 보내지 않는다(빈 줄 하나로 시작하므로 문의처 없이도 저장할 수 있게) */
export const isBlankContact = (c: HostContactInput) => c.type === null && !c.value.trim();

export const canAddEventContact = (contacts: readonly HostContactInput[]) =>
  contacts.length < EVENT_CONTACTS_MAX;

export function eventContactError(c: HostContactInput): string | null {
  if (isBlankContact(c)) return null;
  if (c.type === null) return '문의처 유형을 골라 주세요';
  const value = c.value.trim();
  if (!value) return '문의처를 입력해 주세요';
  if (value.length > EVENT_CONTACT_VALUE_MAX) {
    return `문의처는 ${EVENT_CONTACT_VALUE_MAX}자까지 입력할 수 있어요`;
  }
  return null;
}

/** 보내는 문의처(전체 교체). 빈 줄은 빼고 값의 앞뒤 공백을 지운다 */
export const toEventContactsBody = (contacts: readonly HostContactInput[]) =>
  contacts
    .filter((c) => !isBlankContact(c))
    .map((c) => {
      if (c.type === null) throw new Error('문의처 유형이 없다 — 칸 오류를 먼저 본다');
      return { type: c.type as HostContactType, value: c.value.trim() };
    });

const sameContacts = (a: readonly HostContactInput[], b: readonly HostContactInput[]) =>
  JSON.stringify(a.filter((c) => !isBlankContact(c))) ===
  JSON.stringify(b.filter((c) => !isBlankContact(c)));

// ─── 태그 ────────────────────────────────────────────────────

/** 태그를 켜고 끈다. 10개면 더 켜지 않는다(서버 `Event_400_23`) */
export function toggleTag(tagIds: readonly number[], tagId: number): number[] {
  if (tagIds.includes(tagId)) return tagIds.filter((id) => id !== tagId);
  return tagIds.length >= EVENT_TAGS_MAX ? [...tagIds] : [...tagIds, tagId];
}

const sameTags = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

// ─── 칸 오류 ─────────────────────────────────────────────────

export type BasicInfoErrors = {
  name: string | null;
  schedule: string | null;
  place: string | null;
  /** 줄마다(같은 순서) */
  contacts: (string | null)[];
};

export function nameError(raw: string): string | null {
  const name = raw.trim();
  if (!name) return '공연 이름을 입력해 주세요';
  if (name.length > EVENT_NAME_MAX) return `공연 이름은 ${EVENT_NAME_MAX}자까지 입력할 수 있어요`;
  return null;
}

/**
 * 지금 값의 칸 오류. **바뀐 칸만** 본다 — 손대지 않은 옛 값(이름이 빈 v1 공연, 지난 시작 시각 등)이 다른 칸 저장을 막지 않게.
 * 등록된 공연의 시작 시각은 지금 이후로만 바꿀 수 있다(`Event_400_24`)
 */
export function validateBasicInfo(
  base: BasicInfoValues,
  values: BasicInfoValues,
  { registered, now }: { registered: boolean; now: Date },
): BasicInfoErrors {
  const changed = changedBasicFields(base, values);
  return {
    name: changed.name ? nameError(values.name) : null,
    schedule: changed.schedule
      ? scheduleError(values.schedule, {
          requireFuture: registered && values.schedule.date !== '' && startChanged(base, values),
          now,
        })
      : null,
    place: changed.place ? placeError(values.place) : null,
    contacts: values.contacts.map((c) => (changed.contacts ? eventContactError(c) : null)),
  };
}

/** 시작 일시가 바뀌었는지(같은 값으로 두면 등록된 공연도 지난 시작을 그대로 둘 수 있다 — 서버도 같은 값은 허용) */
function startChanged(base: BasicInfoValues, values: BasicInfoValues) {
  return toScheduleRange(base.schedule)?.startAt !== toScheduleRange(values.schedule)?.startAt;
}

export const hasBasicInfoErrors = (e: BasicInfoErrors) =>
  e.name !== null || e.schedule !== null || e.place !== null || e.contacts.some((c) => c !== null);

// ─── 바뀐 필드 ───────────────────────────────────────────────

export function changedBasicFields(base: BasicInfoValues, values: BasicInfoValues) {
  return {
    poster: values.poster.key !== undefined,
    name: base.name !== values.name,
    schedule: !isSameSchedule(base.schedule, values.schedule),
    // 장소 칸을 모두 비우면 보낼 수 없다(서버는 장소를 지우는 수정을 받지 않는다) — 바뀌지 않은 것으로 본다
    place: !isSamePlace(base.place, values.place) && !isPlaceEmpty(values.place),
    contacts: !sameContacts(base.contacts, values.contacts),
    tagIds: !sameTags(base.tagIds, values.tagIds),
    hasTicket: base.hasTicket !== values.hasTicket,
  };
}

export const isBasicInfoDirty = (base: BasicInfoValues, values: BasicInfoValues) =>
  Object.values(changedBasicFields(base, values)).some(Boolean);

/**
 * 보내는 본문(PE-4) — 바뀐 필드만. 장소를 고치면 상세주소까지 통째로(`toPlaceRequest`), 문의처·태그는 전체.
 * 일정은 시작·종료를 함께 보낸다(종료 ≤ 시작이면 다음 날). 칸 오류가 없을 때만 부른다
 */
export function toUpdateEventBasicBody(
  base: BasicInfoValues,
  values: BasicInfoValues,
): UpdateEventBasicRequest {
  const changed = changedBasicFields(base, values);
  const body: UpdateEventBasicRequest = {};
  if (changed.poster) body.posterImageKey = values.poster.key;
  if (changed.name) body.name = values.name.trim();
  if (changed.schedule) {
    const range = toScheduleRange(values.schedule);
    if (!range) throw new Error('일정 칸이 비었다 — 칸 오류를 먼저 본다');
    body.startAt = range.startAt;
    body.endAt = range.endAt;
  }
  if (changed.place) body.place = toPlaceRequest(values.place);
  if (changed.contacts) body.contacts = toEventContactsBody(values.contacts);
  if (changed.tagIds) body.tagIds = [...values.tagIds];
  if (changed.hasTicket) body.hasTicket = values.hasTicket;
  return body;
}

// ─── 서버 오류(patterns §24 P11 행) ──────────────────────────

/** 칸에 붙이는 PE-4 코드와 문구. 그 밖(검증 실패 400 `BAD_REQUEST` 등)은 전역 토스트 */
export const BASIC_INFO_FIELD_ERRORS = {
  Event_400_2: { field: 'schedule', message: SCHEDULE_ERROR.Event_400_2 },
  Event_400_24: { field: 'schedule', message: '등록된 공연은 지금 이후로만 바꿀 수 있어요' },
  Event_400_20: { field: 'contacts', message: '문의처 형식을 확인해 주세요' },
  Event_400_23: { field: 'tags', message: '태그를 다시 골라 주세요' },
  Event_400_22: { field: 'poster', message: '포스터를 다시 올려 주세요' },
  Event_400_25: {
    field: 'hasTicket',
    message: '티켓이 있는 공연은 티켓 없음으로 바꿀 수 없어요',
  },
} as const;
export type BasicInfoServerField =
  (typeof BASIC_INFO_FIELD_ERRORS)[keyof typeof BASIC_INFO_FIELD_ERRORS]['field'];
