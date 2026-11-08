import {
  EVENT_CONTACT_VALUE_MAX,
  EVENT_CONTACTS_MAX,
  EVENT_NAME_MAX,
  EVENT_TAGS_MAX,
  type EventManage,
  type UpdateEventBasicRequest,
} from '@/api/event/schema';
import type { HostContactType } from '@/api/host/schema';
import type { Contact } from '@/api/shared/common-schema';
import {
  contactInputsOf,
  type HostContactInput,
} from '@/features/hosting/shared/model/host-fields';
import { ALL_DIRTY } from '@/features/hosting/shared/model/rhf-form';

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

/**
 * 폼 처음 값(RHF `defaultValues`) — GE-3 값에서 문의처가 비었으면 호스트 대표 연락처(GH-3)로 미리 채운다(design-requests Q76 — Nemin 11-07
 * "호스트 대표 연락처 미리 채워두는것 ㅇㅋ", GUI `748:33351`). 미리 채운 값은 폼 값일 뿐 저장하지 않는다 — 다른 칸을 고쳐 [저장]하면 같이 가고
 * (`fieldsToSend`), 지우면 빈 채로 저장된다. 처음 값이 미리 채운 값이므로 이탈 경고(dirty)는 이 값 기준이다.
 * 유형을 모르는(`UNKNOWN`) 연락처는 채우지 않는다(유형 칸이 비어 저장을 막는다). 공연 문의처 상한(10개)까지만
 */
export function basicInfoDefaultsOf(
  event: EventManage,
  hostContacts: readonly Contact[] = [],
): BasicInfoValues {
  const values = basicInfoValuesOf(event);
  if (event.contacts.length > 0) return values;
  const prefill = hostContacts.filter((c) => c.type !== 'UNKNOWN').slice(0, EVENT_CONTACTS_MAX);
  return prefill.length > 0 ? { ...values, contacts: contactInputsOf(prefill) } : values;
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
  { registered, now, saved }: { registered: boolean; now: Date; saved?: BasicInfoValues },
  dirty?: ReadonlySet<string>,
): BasicInfoErrors {
  const changed = fieldsToSend(base, values, dirty, saved);
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

/**
 * 바뀐 필드. `dirty`(RHF `dirtyFields`의 맨 위 칸 — `dirtyKeysOf`)가 1차, 값 비교가 2차(빈 문의처 줄 · 태그 순서 · 같은 일정 거르기).
 * `dirty`를 주지 않으면 모든 칸을 값으로만 비교한다
 */
export function changedBasicFields(
  base: BasicInfoValues,
  values: BasicInfoValues,
  dirty: ReadonlySet<string> = ALL_DIRTY,
) {
  return {
    poster: dirty.has('poster') && values.poster.key !== undefined,
    name: dirty.has('name') && base.name !== values.name,
    schedule: dirty.has('schedule') && !isSameSchedule(base.schedule, values.schedule),
    // 장소 칸을 모두 비우면 보낼 수 없다(서버는 장소를 지우는 수정을 받지 않는다) — 바뀌지 않은 것으로 본다
    place:
      dirty.has('place') && !isSamePlace(base.place, values.place) && !isPlaceEmpty(values.place),
    contacts: dirty.has('contacts') && !sameContacts(base.contacts, values.contacts),
    tagIds: dirty.has('tagIds') && !sameTags(base.tagIds, values.tagIds),
    hasTicket: dirty.has('hasTicket') && base.hasTicket !== values.hasTicket,
  };
}

/**
 * 저장 때 보낼 필드 — 바뀐 필드(`changedBasicFields`) + 서버 값(`saved` — GE-3 그대로, 미리 채우기 전)과 다른 문의처.
 * 미리 채운 문의처(Q76)는 처음 값과 같아 "바뀐 필드"가 아니지만 서버에는 없으므로 다른 칸을 저장할 때 같이 보낸다.
 * `saved`를 주지 않으면 `base`와 같다(미리 채우지 않은 폼)
 */
export function fieldsToSend(
  base: BasicInfoValues,
  values: BasicInfoValues,
  dirty?: ReadonlySet<string>,
  saved: BasicInfoValues = base,
) {
  const changed = changedBasicFields(base, values, dirty);
  return {
    ...changed,
    contacts: changed.contacts || !sameContacts(saved.contacts, values.contacts),
  };
}

export const isBasicInfoDirty = (
  base: BasicInfoValues,
  values: BasicInfoValues,
  dirty?: ReadonlySet<string>,
) => Object.values(changedBasicFields(base, values, dirty)).some(Boolean);

/**
 * 보내는 본문(PE-4) — 바뀐 필드만. 장소를 고치면 상세주소까지 통째로(`toPlaceRequest`), 문의처·태그는 전체.
 * 일정은 시작·종료를 함께 보낸다(종료 ≤ 시작이면 다음 날). 미리 채운 문의처는 서버 값(`saved`)과 다르면 같이 보낸다. 칸 오류가 없을 때만 부른다
 */
export function toUpdateEventBasicBody(
  base: BasicInfoValues,
  values: BasicInfoValues,
  dirty?: ReadonlySet<string>,
  saved?: BasicInfoValues,
): UpdateEventBasicRequest {
  const changed = fieldsToSend(base, values, dirty, saved);
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

/** 칸에 붙이는 PE-4 코드와 문구. 그 밖(검증 실패 400 `BAD_REQUEST` 등)은 공용 토스트(handleError) */
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
