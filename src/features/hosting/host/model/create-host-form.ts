import type { CreateHostRequest } from '@/api/host/schema';

import {
  contactError,
  emptyContact,
  HOST_CONTACTS_SERVER_ERROR,
  type HostContactInput,
  introduceError,
  nameError,
  toContactsBody,
} from './host-fields';

/**
 * 호스트 만들기(`/hosting/new/hosts`, PH-2, plan P10a) 폼. 칸 규칙(이름·소개·연락처 유형 6종·placeholder)은 호스트 설정(P10b)과
 * 같이 쓰는 `host-fields.ts`에 있다. 이미지는 만든 뒤 설정(P10b)에서 넣는다.
 */

export type CreateHostValues = {
  name: string;
  introduce: string;
  contacts: HostContactInput[];
};

/** 처음 값 — 연락처 한 줄(유형 미선택) */
export const initialCreateHostValues = (): CreateHostValues => ({
  name: '',
  introduce: '',
  contacts: [emptyContact()],
});

export type CreateHostErrors = {
  name: string | null;
  introduce: string | null;
  /** 줄마다(같은 순서) */
  contacts: (string | null)[];
};

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
 * 보내는 본문(PH-2). 앞뒤 공백을 지운다. 소개가 비면 `null`(서버 `introduce`는 null 가능 — PH-4와 다르다).
 * 칸 오류가 없을 때만 부른다 — 유형 미선택 줄이 있으면 던진다.
 */
export function toCreateHostBody(values: CreateHostValues): CreateHostRequest {
  const introduce = values.introduce.trim();
  return {
    name: values.name.trim(),
    introduce: introduce || null,
    contacts: toContactsBody(values.contacts),
  };
}

/** 화면이 처리하는 PH-2 코드. 그 밖(400 `BAD_REQUEST` 등)은 공용 토스트(handleError) */
export const CREATE_HOST_ERROR_MESSAGE = {
  /** 연락처 형식 오류 — 연락처 영역 전체 오류(`host-fields.ts`) */
  HOST_400_16: HOST_CONTACTS_SERVER_ERROR,
} as const;
