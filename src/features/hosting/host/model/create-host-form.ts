import {
  type CreateHostRequest,
  HOST_CONTACT_VALUE_MAX,
  HOST_CONTACTS_MAX,
  HOST_CONTACTS_MIN,
  HOST_INTRODUCE_MAX,
  HOST_NAME_MAX,
  HOST_PHONE_VALUE_MAX,
  type HostContactType,
} from '@/api/host/schema';

/**
 * 호스트 만들기(`/hosting/new/hosts`, PH-2, plan P10a) 폼 규칙. 이름 1~15자, 소개 255자(Figma 100자는 서버 255자를 따른다),
 * 대표 연락처 1~10개(값 200자, 전화 15자) — api-contract §3 "호스트". 이미지는 만든 뒤 설정(P10b)에서 넣는다.
 */

/**
 * 연락처 유형 6종 — 서버 enum 순서. GUI 드롭다운(`748:33557`)은 5종이고 서버의 `YOUTUBE`를 더한다(design-requests Q8 기본안).
 * 라벨은 GUI 드롭다운 문구, placeholder는 GUI `748:33564`~`748:33573`과 plan P10a("유튜브 URL").
 * **이메일 placeholder는 GUI·문서에 없다**(design-requests 확인 요청) — `null`이면 V가 placeholder 없이 그린다.
 */
export const HOST_CONTACT_OPTIONS: readonly {
  type: HostContactType;
  label: string;
  placeholder: string | null;
}[] = [
  { type: 'PHONE', label: '전화번호', placeholder: '-없이 입력해 주세요' },
  { type: 'EMAIL', label: '이메일', placeholder: null },
  { type: 'INSTAGRAM', label: '인스타그램', placeholder: '@dudoong' },
  { type: 'OPEN_CHAT', label: '오픈채팅방', placeholder: 'URL' },
  { type: 'YOUTUBE', label: '유튜브', placeholder: 'URL' },
  { type: 'ETC', label: '기타', placeholder: 'URL 혹은 텍스트 입력' },
];

export const contactPlaceholder = (type: HostContactType | null) =>
  HOST_CONTACT_OPTIONS.find((o) => o.type === type)?.placeholder ?? null;

/** 연락처 한 줄. 유형을 고르기 전에는 `type: null` */
export type HostContactInput = { type: HostContactType | null; value: string };

export type CreateHostValues = {
  name: string;
  introduce: string;
  contacts: HostContactInput[];
};

/** 처음 값 — 연락처 한 줄(유형 미선택) */
export const initialCreateHostValues = (): CreateHostValues => ({
  name: '',
  introduce: '',
  contacts: [{ type: null, value: '' }],
});

export const canAddContact = (contacts: readonly HostContactInput[]) =>
  contacts.length < HOST_CONTACTS_MAX;
export const canRemoveContact = (contacts: readonly HostContactInput[]) =>
  contacts.length > HOST_CONTACTS_MIN;

export type CreateHostErrors = {
  name: string | null;
  introduce: string | null;
  /** 줄마다(같은 순서) */
  contacts: (string | null)[];
};

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

/** 지금 값의 칸 오류(언제 보여 줄지는 화면이 정한다) */
export function validateCreateHost(values: CreateHostValues): CreateHostErrors {
  return {
    name: nameError(values.name),
    introduce: introduceError(values.introduce),
    contacts: values.contacts.map(contactError),
  };
}

export const hasCreateHostErrors = (errors: CreateHostErrors) =>
  errors.name !== null || errors.introduce !== null || errors.contacts.some((e) => e !== null);

/**
 * 보내는 본문(PH-2). 앞뒤 공백을 지운다. 소개가 비면 `null`(서버 `introduce`는 null 가능).
 * 칸 오류가 없을 때만 부른다 — 유형 미선택 줄이 있으면 던진다.
 */
export function toCreateHostBody(values: CreateHostValues): CreateHostRequest {
  const introduce = values.introduce.trim();
  return {
    name: values.name.trim(),
    introduce: introduce || null,
    contacts: values.contacts.map((c) => {
      if (c.type === null) throw new Error('연락처 유형이 없다 — validateCreateHost를 먼저 본다');
      return { type: c.type, value: c.value.trim() };
    }),
  };
}

/** 화면이 처리하는 PH-2 코드(백엔드 `V2HostDomainService.validateContacts` — 0개·11개 이상, 빈 값, 길이 초과(전화 15·그 밖 200)면 `HOST_400_16`, 432cce4). 그 밖(`GLOBAL_400_1` 등)은 전역 토스트 */
export const CREATE_HOST_ERROR_MESSAGE = {
  /** 연락처 형식 오류 — 서버가 어느 줄인지 알려 주지 않아 연락처 영역 전체 오류로 둔다 */
  HOST_400_16: '연락처 형식을 확인해 주세요',
} as const;
