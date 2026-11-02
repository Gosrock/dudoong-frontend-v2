import { act, renderHook } from '@testing-library/react';
import {
  type DefaultValues,
  type FieldPath,
  type FieldValues,
  type PathValue,
  useForm,
  type UseFormReturn,
} from 'react-hook-form';

import { dirtyKeysOf } from './rhf-form';

/**
 * 훅 테스트에서 칸을 고친다 — 화면의 `register`·`Controller`처럼 바뀐 칸(`dirtyFields`)으로 표시한다.
 * `setValue`는 `shouldDirty` 없이 부르면 dirty가 남지 않아 PATCH 본문이 화면과 달라진다
 */
export function typeInto<V extends FieldValues, N extends FieldPath<V>>(
  form: UseFormReturn<V>,
  name: N,
  value: PathValue<V, N>,
) {
  act(() => form.setValue(name, value, { shouldDirty: true }));
}

/**
 * 순수 함수 본문과 RHF 경로 본문을 대 보는 테스트용 — 실제 `useForm`에 `base`를 `defaultValues`로 넣고 `patch`의 칸을
 * 화면처럼(`shouldDirty`) 고친 뒤 지금 값과 `dirtyFields`의 맨 위 칸을 돌려준다
 */
export function editInRhf<V extends FieldValues>(
  base: V,
  patch: Partial<{ [K in FieldPath<V>]: PathValue<V, K> }>,
) {
  const { result } = renderHook(() => {
    const form = useForm<V>({ defaultValues: base as DefaultValues<V> });
    // 훅처럼 렌더 중에 읽어 둔다 — RHF는 읽은(구독한) formState만 계산한다
    void form.formState.dirtyFields;
    return form;
  });
  for (const [name, value] of Object.entries(patch)) {
    typeInto(result.current, name as FieldPath<V>, value as PathValue<V, FieldPath<V>>);
  }
  return {
    values: result.current.getValues(),
    dirty: dirtyKeysOf(result.current.formState.dirtyFields),
  };
}
