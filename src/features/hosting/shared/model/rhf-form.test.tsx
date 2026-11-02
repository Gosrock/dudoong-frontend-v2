import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import {
  dirtyKeysOf,
  EDIT_FORM_OPTIONS,
  resolverFrom,
  serverErrorOf,
  useClearServerErrors,
} from './rhf-form';

type Values = { name: string; contacts: { value: string }[]; note: string };
const validate = (v: Values) => ({
  name: v.name.trim() ? null : '이름을 입력해 주세요',
  contacts: v.contacts.map((c) => (c.value ? null : '연락처를 입력해 주세요')),
});

function setup() {
  return renderHook(() => {
    const form = useForm<Values>({
      ...EDIT_FORM_OPTIONS,
      defaultValues: { name: '두둥', contacts: [{ value: 'a' }, { value: 'b' }], note: '' },
      resolver: resolverFrom(validate),
    });
    useClearServerErrors(form, { contacts: ['contacts'] });
    void form.formState.dirtyFields;
    void form.formState.errors;
    return form;
  });
}

describe('rhf-form — 순수 검증 resolver · dirtyFields · 서버 오류', () => {
  it('순수 검증에 오류가 있으면 handleSubmit이 저장 함수를 부르지 않고, 문구를 같은 경로에 옮긴다', async () => {
    const { result } = setup();
    act(() => result.current.setValue('contacts.1.value', ''));
    let called = false;
    await act(() =>
      result.current.handleSubmit(() => {
        called = true;
      })(),
    );
    expect(called).toBe(false);
    expect(result.current.formState.errors.contacts?.[1]).toMatchObject({
      message: '연락처를 입력해 주세요',
    });
    expect(result.current.formState.errors.name).toBeUndefined();
    expect(result.current.formState.isSubmitted).toBe(true);
  });

  it('오류가 없으면 저장 함수의 결과를 그대로 돌려준다', async () => {
    const { result } = setup();
    let out: string | undefined;
    await act(async () => {
      out = await result.current.handleSubmit(() => 'saved')();
    });
    expect(out).toBe('saved');
  });

  it('dirtyKeysOf — 하나라도 건드린 맨 위 칸(배열 안쪽 포함). 되돌리면 빠진다', () => {
    const { result } = setup();
    act(() => result.current.setValue('contacts.1.value', 'c', { shouldDirty: true }));
    expect([...dirtyKeysOf(result.current.formState.dirtyFields)]).toEqual(['contacts']);
    act(() => result.current.setValue('contacts.1.value', 'b', { shouldDirty: true }));
    expect([...dirtyKeysOf(result.current.formState.dirtyFields)]).toEqual([]);
  });

  it('서버 오류(root.<칸>)는 그 칸을 이루는 값을 고치면 지우고, 다른 칸을 고치면 남는다', () => {
    const { result } = setup();
    act(() => result.current.setError('root.contacts', { message: '형식을 확인해 주세요' }));
    act(() => result.current.setValue('note', '메모', { shouldDirty: true }));
    expect(serverErrorOf(result.current.formState.errors, 'contacts')).toBe('형식을 확인해 주세요');
    act(() => result.current.setValue('contacts.0.value', 'z', { shouldDirty: true }));
    expect(serverErrorOf(result.current.formState.errors, 'contacts')).toBeNull();
  });

  it('다음 제출은 지난 서버 오류를 비운다', async () => {
    const { result } = setup();
    act(() => result.current.setError('root.contacts', { message: '형식을 확인해 주세요' }));
    await act(() => result.current.handleSubmit(() => undefined)());
    expect(serverErrorOf(result.current.formState.errors, 'contacts')).toBeNull();
  });
});
