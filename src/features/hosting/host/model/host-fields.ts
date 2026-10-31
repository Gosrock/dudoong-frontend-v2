import {
  HOST_CONTACT_VALUE_MAX,
  HOST_CONTACTS_MAX,
  HOST_CONTACTS_MIN,
  HOST_INTRODUCE_MAX,
  HOST_NAME_MAX,
  HOST_PHONE_VALUE_MAX,
  type HostContactType,
} from '@/api/host/schema';
import type { Contact } from '@/api/shared/common-schema';

/**
 * 호스트 이름·소개·대표 연락처 칸 규칙 — 호스트 만들기(PH-2, P10a)와 호스트 설정(PH-4, P10b)이 같이 쓴다.
 * 이름 1~15자, 소개 255자(Figma 100자는 서버 255자를 따른다), 연락처 1~10개(값 200자, 전화 15자) — api-contract §4 "호스트".
 * 서버 검증과 같은 값이다(`V2CreateHostRequest`·`V2UpdateHostRequest`·`V2HostDomainService.validateContacts`, 432cce4).
 */

/**
 * 연락처 유형 6종 — 서버 enum 순서. GUI 드롭다운(`748:33557`)은 5종이고 서버의 `YOUTUBE`를 더한다(design-requests Q8 기본안).
 * 라벨은 GUI 드롭다운 문구, placeholder는 GUI `748:33564`~`748:33573`과 plan P10a("유튜브 URL").
 * 이메일 placeholder "example@dudoong.com"은 Ready 기본 정보 `748:33351`·와이어 `495:14815`와 같다(design-requests Q49 닫힘 — P10a-V에서 반영).
 * `null`이면 V가 placeholder 없이 그린다.
 */
export const HOST_CONTACT_OPTIONS: readonly {
  type: HostContactType;
  label: string;
  placeholder: string | null;
}[] = [
  { type: 'PHONE', label: '전화번호', placeholder: '-없이 입력해 주세요' },
  { type: 'EMAIL', label: '이메일', placeholder: 'example@dudoong.com' },
  { type: 'INSTAGRAM', label: '인스타그램', placeholder: '@dudoong' },
  { type: 'OPEN_CHAT', label: '오픈채팅방', placeholder: 'URL' },
  { type: 'YOUTUBE', label: '유튜브', placeholder: 'URL' },
  { type: 'ETC', label: '기타', placeholder: 'URL 혹은 텍스트 입력' },
];

export const contactPlaceholder = (type: HostContactType | null) =>
  HOST_CONTACT_OPTIONS.find((o) => o.type === type)?.placeholder ?? null;

/** 연락처 한 줄. 유형을 고르기 전에는 `type: null` */
export type HostContactInput = { type: HostContactType | null; value: string };

/** 빈 연락처 한 줄(유형 미선택) */
export const emptyContact = (): HostContactInput => ({ type: null, value: '' });

/**
 * 서버 연락처(GH-3) → 폼 줄. 모르는 유형(`UNKNOWN`)은 다시 보낼 수 없어 유형 미선택으로 둔다(값은 남긴다 — 고르면 저장된다).
 * 연락처가 없으면(v1 연락처도 없는 호스트) 빈 한 줄 — 연락처는 1개 이상이어야 한다.
 */
export function contactInputsOf(contacts: readonly Contact[]): HostContactInput[] {
  if (contacts.length === 0) return [emptyContact()];
  return contacts.map((c) => ({ type: c.type === 'UNKNOWN' ? null : c.type, value: c.value }));
}

export const canAddContact = (contacts: readonly HostContactInput[]) =>
  contacts.length < HOST_CONTACTS_MAX;
export const canRemoveContact = (contacts: readonly HostContactInput[]) =>
  contacts.length > HOST_CONTACTS_MIN;

// ─── 줄 바꾸기(훅의 setState 안에서 쓴다) ────────────────────

export const withContactType = (
  contacts: readonly HostContactInput[],
  index: number,
  type: HostContactType,
) => contacts.map((c, i) => (i === index ? { ...c, type } : c));

export const withContactValue = (
  contacts: readonly HostContactInput[],
  index: number,
  value: string,
) => contacts.map((c, i) => (i === index ? { ...c, value } : c));

/** 10줄이면 그대로 */
export const withAddedContact = (contacts: readonly HostContactInput[]) =>
  canAddContact(contacts) ? [...contacts, emptyContact()] : [...contacts];

/** 1줄이면 그대로 */
export const withoutContact = (contacts: readonly HostContactInput[], index: number) =>
  canRemoveContact(contacts) ? contacts.filter((_, i) => i !== index) : [...contacts];

// ─── 칸 오류 ─────────────────────────────────────────────────

export function nameError(raw: string): string | null {
  const name = raw.trim();
  if (!name) return '호스트 이름을 입력해 주세요';
  if (name.length > HOST_NAME_MAX) return `호스트 이름은 ${HOST_NAME_MAX}자까지 입력할 수 있어요`;
  return null;
}

export function introduceError(raw: string): string | null {
  if (raw.trim().length > HOST_INTRODUCE_MAX) {
    return `소개는 ${HOST_INTRODUCE_MAX}자까지 입력할 수 있어요`;
  }
  return null;
}

export function contactError(contact: HostContactInput): string | null {
  if (contact.type === null) return '연락처 유형을 골라 주세요';
  const value = contact.value.trim();
  if (!value) return '연락처를 입력해 주세요';
  if (contact.type === 'PHONE' && value.length > HOST_PHONE_VALUE_MAX) {
    return `전화번호는 ${HOST_PHONE_VALUE_MAX}자까지 입력할 수 있어요`;
  }
  if (value.length > HOST_CONTACT_VALUE_MAX) {
    return `연락처는 ${HOST_CONTACT_VALUE_MAX}자까지 입력할 수 있어요`;
  }
  return null;
}

/** 보내는 연락처(PH-2·PH-4). 값의 앞뒤 공백을 지운다. 칸 오류가 없을 때만 부른다 — 유형 미선택 줄이 있으면 던진다 */
export function toContactsBody(contacts: readonly HostContactInput[]) {
  return contacts.map((c) => {
    if (c.type === null) throw new Error('연락처 유형이 없다 — 칸 오류를 먼저 본다');
    return { type: c.type, value: c.value.trim() };
  });
}

/**
 * 연락처 형식 서버 오류(`HOST_400_16`). 백엔드 `V2HostDomainService.validateContacts` — 0개·11개 이상, 빈 값,
 * 길이 초과(전화 15·그 밖 200)(432cce4). 서버가 어느 줄인지 알려 주지 않아 연락처 영역 전체 오류로 둔다(PH-2·PH-4 공통)
 */
export const HOST_CONTACTS_SERVER_ERROR = '연락처 형식을 확인해 주세요';
