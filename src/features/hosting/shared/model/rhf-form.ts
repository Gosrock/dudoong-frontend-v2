'use client';

import { useEffect, useEffectEvent } from 'react';
import type { FieldErrors, FieldValues, Resolver, UseFormReturn } from 'react-hook-form';

/**
 * 호스팅 복잡한 폼(patterns §23 "⑥" 7개)의 RHF 공용 부품. 원칙(patterns §4-4 · §23):
 *
 * - 처음 값은 `defaultValues`로 한 번만. 다시 온 쿼리가 편집 중인 값을 덮지 않는다(`values`·`resetOptions`를 쓰지 않는다).
 *   저장이 성공한 뒤에만 `reset(saved)` — 그때 `defaultValues`가 새 기준이 된다
 * - 검증은 기존 순수 함수(`validateX`)를 `resolverFrom`으로 감싼다 — 오류가 있으면 `handleSubmit`이 저장 함수를 부르지 않는다.
 *   화면에 보이는 칸 오류는 같은 순수 함수를 **지금 값**으로 다시 계산해 `formState.isSubmitted`(= 한 번 눌렀다) 뒤에 보인다.
 *   규칙이 칸끼리 얽혀 있어(바뀐 칸만 검사 · 무제한 ↔ 재고 등) RHF의 칸 단위 재검증으로는 옆 칸 오류가 남는다 — 그래서
 *   `reValidateMode: 'onSubmit'`으로 두고 표시만 순수 함수로 한다(`EDIT_FORM_OPTIONS`)
 * - 칸별 서버 에러는 `setError('root.<칸>')`. `handleSubmit`이 다음 제출 때 비우고, 그 칸을 고치면 `useClearServerErrors`가 지운다
 * - PATCH 본문은 `dirtyFields`(어느 칸을 건드렸나) → 순수 함수(공백 · 순서만 다른 "같은 값" 거르기) 두 단계(`dirtyKeysOf`)
 */

/** 순수 검증 결과 — 문구 · `null`(오류 없음) · 그 배열/객체 */
export type ErrorTree =
  string | null | undefined | readonly ErrorTree[] | { readonly [key: string]: ErrorTree };

function toFieldErrors(tree: ErrorTree): unknown {
  if (tree === null || tree === undefined) return undefined;
  if (typeof tree === 'string') return { type: 'validate', message: tree };
  if (Array.isArray(tree)) {
    const items = tree.map(toFieldErrors);
    return items.some((e) => e !== undefined) ? items : undefined;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(tree)) {
    const e = toFieldErrors(value);
    if (e !== undefined) out[key] = e;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * 순수 검증 → resolver. 결과 트리의 문구를 RHF 오류로 옮긴다(경로는 값과 같은 모양 — `contacts.0`).
 * 하나라도 있으면 `handleSubmit`이 저장 함수를 부르지 않는다. `useForm`은 렌더마다 옵션을 새로 받으므로 지금 기준값을 그대로 닫아 둔다
 */
export function resolverFrom<V extends FieldValues>(
  validate: (values: V) => ErrorTree,
): Resolver<V> {
  return (values) => {
    const errors = toFieldErrors(validate(values)) as FieldErrors<V> | undefined;
    return errors ? { values: {}, errors } : { values, errors: {} };
  };
}

/**
 * 편집 폼 공통 옵션. 칸 오류 표시는 순수 함수가 맡아(위) RHF 재검증을 끄고, 오류 칸으로 초점을 옮기지 않는다
 * (전환 전 화면은 [저장]을 눌러도 초점이 버튼에 남았다 — 동작을 바꾸지 않는다)
 */
export const EDIT_FORM_OPTIONS = {
  mode: 'onSubmit',
  reValidateMode: 'onSubmit',
  shouldFocusError: false,
} as const;

/** `dirtyFields`(true/배열/객체 트리)에서 하나라도 건드린 맨 위 칸 이름 */
export function dirtyKeysOf(dirtyFields: object): ReadonlySet<string> {
  const touched = (node: unknown): boolean =>
    node === true ||
    (Array.isArray(node) && node.some(touched)) ||
    (typeof node === 'object' && node !== null && Object.values(node).some(touched));
  return new Set(Object.keys(dirtyFields).filter((key) => touched((dirtyFields as never)[key])));
}

/** 모든 칸을 건드린 것으로 본다 — 순수 함수를 RHF 없이 부를 때(테스트 · 만들기 폼)의 기본값 */
export const ALL_DIRTY: ReadonlySet<string> = {
  has: () => true,
} as unknown as ReadonlySet<string>;

/**
 * 칸 값이 바뀔 때마다 그 이름(`contacts.0.value` · 줄 추가/삭제는 `contacts`)으로 부른다 — 사용자 입력 · `setValue` · `useFieldArray`
 * 모두 같은 길. `reset`(이름 없음)은 부르지 않는다 — reset이 오류를 함께 비운다
 */
export function useFieldChange<V extends FieldValues>(
  form: Pick<UseFormReturn<V>, 'subscribe'>,
  onChange: (name: string) => void,
) {
  const { subscribe } = form;
  const changed = useEffectEvent(onChange);
  useEffect(
    () =>
      subscribe({
        formState: { values: true },
        callback: ({ name }) => {
          if (name) changed(name);
        },
      }),
    [subscribe],
  );
}

/**
 * 값이 바뀌면 그 칸에 붙은 서버 오류(`root.<서버 칸>`)를 지운다. `fields`는 서버 칸 → 그 칸을 이루는 값 이름(맨 위 이름)
 */
export function useClearServerErrors<V extends FieldValues>(
  form: Pick<UseFormReturn<V>, 'subscribe' | 'clearErrors'>,
  fields: Readonly<Record<string, readonly string[]>>,
) {
  useFieldChange(form, (name) => {
    const top = name.split('.')[0]!;
    for (const [serverField, names] of Object.entries(fields)) {
      if (names.includes(top)) form.clearErrors(`root.${serverField}`);
    }
  });
}

/** `root.<칸>` 서버 오류 문구(없으면 null) */
export const serverErrorOf = (errors: FieldErrors, field: string): string | null => {
  const root = errors.root as Record<string, { message?: string } | undefined> | undefined;
  return root?.[field]?.message ?? null;
};
