import type { HostViewer, UpdateHostRequest } from '@/api/host/schema';
import { UPLOAD_INVALID_EXTENSION, UPLOAD_PUT_FAILED } from '@/api/upload';

import {
  contactError,
  contactInputsOf,
  HOST_CONTACTS_SERVER_ERROR,
  type HostContactInput,
  introduceError,
  nameError,
  toContactsBody,
} from './host-fields';

/**
 * 호스트 설정(`/hosting/hosts/[hostId]/settings`, PH-4 · PH-15, plan P10b) 폼. 칸 규칙은 호스트 만들기와 같다(`host-fields.ts`).
 * PATCH라 **바뀐 필드만** 보낸다(patterns §23) — 처음 값(서버 값)과 지금 값을 비교한다. 바뀐 칸만 검증한다
 * (손대지 않은 칸 때문에 다른 칸을 저장하지 못하는 일이 없게 — 예: 서버가 모르는 연락처 유형을 준 경우).
 */

/** 호스트 이미지 두 자리(PH-15 `purpose`) — 프로필(원형 로고)·커버(배너). 칸 위치는 디자인 대기(plan P10b V) */
export const HOST_IMAGE_SLOTS = ['PROFILE', 'COVER'] as const;
export type HostImageSlot = (typeof HOST_IMAGE_SLOTS)[number];

/**
 * 이미지 한 자리. `key`가 없으면 바꾸지 않는다. 올리면 PH-15가 발급한 key, 기본 이미지로 되돌리면 `''`(api-contract §1 이미지 업로드).
 * 저장(PH-4) 전에는 서버에 반영되지 않는다(patterns §23) — `url`은 미리보기용.
 */
export type HostImageValue = { url: string | null; key?: string };

export type HostSettingsValues = {
  name: string;
  introduce: string;
  contacts: HostContactInput[];
  images: Record<HostImageSlot, HostImageValue>;
};

/** 서버 값(GH-3 viewer · PH-4 응답) → 폼 값. 저장이 끝나면 이 값이 새 기준이 된다 */
export const hostSettingsValuesOf = (host: HostViewer): HostSettingsValues => ({
  name: host.name ?? '',
  introduce: host.introduce ?? '',
  contacts: contactInputsOf(host.contacts),
  images: {
    PROFILE: { url: host.profileImageUrl },
    COVER: { url: host.coverImageUrl },
  },
});

const sameContacts = (a: readonly HostContactInput[], b: readonly HostContactInput[]) =>
  a.length === b.length &&
  a.every((c, i) => c.type === b[i]!.type && c.value.trim() === b[i]!.value.trim());

/** 바뀐 필드. 이름·소개는 앞뒤 공백을 지운 값으로 비교한다 */
export function changedHostFields(base: HostSettingsValues, values: HostSettingsValues) {
  return {
    name: values.name.trim() !== base.name.trim(),
    introduce: values.introduce.trim() !== base.introduce.trim(),
    contacts: !sameContacts(base.contacts, values.contacts),
    profileImage: values.images.PROFILE.key !== undefined,
    coverImage: values.images.COVER.key !== undefined,
  };
}

export const isHostSettingsDirty = (base: HostSettingsValues, values: HostSettingsValues) =>
  Object.values(changedHostFields(base, values)).some(Boolean);

export type HostSettingsErrors = {
  name: string | null;
  introduce: string | null;
  /** 줄마다(같은 순서). 연락처를 바꾸지 않았으면 모두 null */
  contacts: (string | null)[];
};

/** 바뀐 칸의 오류(언제 보여 줄지는 화면이 정한다) */
export function validateHostSettings(
  base: HostSettingsValues,
  values: HostSettingsValues,
): HostSettingsErrors {
  const changed = changedHostFields(base, values);
  return {
    name: changed.name ? nameError(values.name) : null,
    introduce: changed.introduce ? introduceError(values.introduce) : null,
    contacts: values.contacts.map((c) => (changed.contacts ? contactError(c) : null)),
  };
}

export const hasHostSettingsErrors = (errors: HostSettingsErrors) =>
  errors.name !== null || errors.introduce !== null || errors.contacts.some((e) => e !== null);

/**
 * 보내는 본문(PH-4) — 바뀐 필드만. 이름·소개·연락처 값의 앞뒤 공백을 지운다.
 * 소개를 비우면 `''`(서버가 비운다 — PATCH의 `null`은 "변경 안 함"이라 쓰지 않는다). 연락처는 전체 교체.
 * 칸 오류가 없을 때만 부른다.
 */
export function toUpdateHostBody(
  base: HostSettingsValues,
  values: HostSettingsValues,
): UpdateHostRequest {
  const changed = changedHostFields(base, values);
  return {
    ...(changed.name && { name: values.name.trim() }),
    ...(changed.introduce && { introduce: values.introduce.trim() }),
    ...(changed.contacts && { contacts: toContactsBody(values.contacts) }),
    ...(changed.profileImage && { profileImageKey: values.images.PROFILE.key }),
    ...(changed.coverImage && { coverImageKey: values.images.COVER.key }),
  };
}

/** 화면이 처리하는 PH-4 코드(patterns §24 P10b). 그 밖(400 `BAD_REQUEST`·403 등)은 전역 토스트 */
export const HOST_SETTINGS_ERROR_MESSAGE = {
  /** 연락처 형식 — 연락처 영역 전체 오류, 연락처를 고치면 지운다 */
  HOST_400_16: HOST_CONTACTS_SERVER_ERROR,
  /** 이 호스트에 발급한 이미지 key가 아님 — 올린 이미지를 버리고 업로드를 처음부터(발급부터) */
  HOST_400_17: '이미지를 다시 올려 주세요',
} as const;

/** 이미지 자리의 업로드 오류(`src/api/upload.ts`가 만드는 코드). 발급의 429·네트워크 등은 전역 토스트 */
export const HOST_IMAGE_ERROR_MESSAGE = {
  [UPLOAD_INVALID_EXTENSION]: 'JPG·PNG 이미지만 올릴 수 있어요',
  [UPLOAD_PUT_FAILED]: '이미지를 올리지 못했어요. 다시 시도해 주세요',
} as const;
