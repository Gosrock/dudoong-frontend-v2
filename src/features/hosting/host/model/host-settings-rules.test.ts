import { describe, expect, it } from 'vitest';

import { hosts } from '@/api/__mocks__/fixtures/host';
import { UpdateHostRequestSchema } from '@/api/host/schema';

import { contactInputsOf } from './host-fields';
import {
  changedHostFields,
  type HostSettingsValues,
  hostSettingsValuesOf,
  isHostSettingsDirty,
  toUpdateHostBody,
  validateHostSettings,
} from './host-settings-form';

const gosrock = hostSettingsValuesOf(hosts[0]!);
const edit = (patch: Partial<HostSettingsValues>): HostSettingsValues => ({ ...gosrock, ...patch });

describe('서버 값 → 폼 값(GH-3 viewer)', () => {
  it('이름·소개·연락처·이미지 미리보기를 채운다', () => {
    expect(gosrock).toEqual({
      name: '고스락',
      introduce: hosts[0]!.introduce,
      contacts: [
        { type: 'INSTAGRAM', value: '@gosrock_official' },
        { type: 'YOUTUBE', value: 'https://www.youtube.com/@gosrock' },
        { type: 'EMAIL', value: 'gosrock@example.com' },
      ],
      images: {
        PROFILE: { url: hosts[0]!.profileImageUrl },
        COVER: { url: hosts[0]!.coverImageUrl },
      },
    });
  });

  it('소개·연락처가 없는 호스트는 빈 소개, 빈 연락처 한 줄', () => {
    const v = hostSettingsValuesOf(hosts[1]!);
    expect(v.introduce).toBe('');
    expect(v.contacts).toEqual([{ type: null, value: '' }]);
  });

  it('모르는 연락처 유형(UNKNOWN)은 다시 보낼 수 없어 유형 미선택으로(값은 남긴다)', () => {
    expect(contactInputsOf([{ type: 'UNKNOWN', value: 'x' }])).toEqual([
      { type: null, value: 'x' },
    ]);
  });
});

describe('바뀐 필드만 보낸다(PH-4 PATCH, patterns §23)', () => {
  it('바꾸지 않으면 dirty가 아니고 본문이 비어 있다', () => {
    expect(isHostSettingsDirty(gosrock, gosrock)).toBe(false);
    expect(toUpdateHostBody(gosrock, gosrock)).toEqual({});
  });

  it('앞뒤 공백만 바꾼 이름·소개는 바뀐 것이 아니다', () => {
    const v = edit({ name: ' 고스락 ', introduce: ` ${gosrock.introduce} ` });
    expect(changedHostFields(gosrock, v)).toMatchObject({ name: false, introduce: false });
  });

  it('이름만 바꾸면 {name}만 — 공백을 지워서', () => {
    const body = toUpdateHostBody(gosrock, edit({ name: ' 고스락 밴드 ' }));
    expect(body).toEqual({ name: '고스락 밴드' });
    expect(UpdateHostRequestSchema.parse(body)).toEqual(body);
  });

  it('소개를 비우면 ""를 보낸다(PATCH의 null은 "변경 안 함"이라 쓰지 않는다)', () => {
    expect(toUpdateHostBody(gosrock, edit({ introduce: '   ' }))).toEqual({ introduce: '' });
  });

  it('연락처는 하나만 바꿔도 전체를 보낸다(전체 교체)', () => {
    const contacts = gosrock.contacts.map((c, i) => (i === 0 ? { ...c, value: ' @new ' } : c));
    expect(toUpdateHostBody(gosrock, edit({ contacts }))).toEqual({
      contacts: [
        { type: 'INSTAGRAM', value: '@new' },
        { type: 'YOUTUBE', value: 'https://www.youtube.com/@gosrock' },
        { type: 'EMAIL', value: 'gosrock@example.com' },
      ],
    });
  });

  it('올린 이미지는 key를, 기본 이미지로 되돌리면 ""를 보낸다', () => {
    const v = edit({
      images: {
        PROFILE: { url: 'https://image/new.png', key: 'host/11/new.png' },
        COVER: { url: null, key: '' },
      },
    });
    expect(toUpdateHostBody(gosrock, v)).toEqual({
      profileImageKey: 'host/11/new.png',
      coverImageKey: '',
    });
  });
});

describe('바뀐 칸만 검증한다', () => {
  it('손대지 않은 칸의 오류는 저장을 막지 않는다(모르는 유형 연락처)', () => {
    const base = edit({ contacts: [{ type: null, value: 'x' }] });
    expect(validateHostSettings(base, edit({ ...base, name: '새 이름' }))).toEqual({
      name: null,
      introduce: null,
      contacts: [null],
    });
  });

  it.each([
    [{ name: '' }, 'name', '호스트 이름을 입력해 주세요'],
    [{ name: '가'.repeat(16) }, 'name', '호스트 이름은 15자까지 입력할 수 있어요'],
    [{ introduce: '가'.repeat(256) }, 'introduce', '소개는 255자까지 입력할 수 있어요'],
  ] as const)('%o → %s 칸 오류', (patch, field, message) => {
    expect(validateHostSettings(gosrock, edit(patch))[field]).toBe(message);
  });

  it('연락처를 바꾸면 줄마다 검증 — 전화 15자', () => {
    const v = edit({ contacts: [{ type: 'PHONE', value: '0'.repeat(16) }] });
    expect(validateHostSettings(gosrock, v).contacts).toEqual([
      '전화번호는 15자까지 입력할 수 있어요',
    ]);
  });
});
