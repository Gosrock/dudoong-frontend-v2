'use client';

import { useForm, useWatch } from 'react-hook-form';

import {
  dirtyKeysOf,
  EDIT_FORM_OPTIONS,
  resolverFrom,
  serverErrorOf,
  useClearServerErrors,
} from '@/features/hosting/shared/model/rhf-form';

import {
  initialOptionFormValues,
  type OptionFormErrors,
  type OptionFormField,
  type OptionFormValues,
} from './option-form';

/** 서버 칸 → 그 칸을 이루는 값(고치면 서버 오류를 지운다 — 형식을 바꾸면 추가금 오류도 지운다) */
const SERVER_FIELDS = {
  name: ['name'],
  description: ['description'],
  yesAdditionalPrice: ['type', 'yesAdditionalPrice'],
} as const satisfies Record<OptionFormField, readonly (keyof OptionFormValues)[]>;

/** 옵션 칸 묶음 — 새 옵션(`useTicketOptions`) · 옵션 수정(`useOptionEditor`)이 같은 모양으로 돌려준다(`OptionFields`가 그린다) */
export type OptionFormApi = {
  values: OptionFormValues;
  set: {
    name: (name: string) => void;
    description: (description: string) => void;
    type: (type: OptionFormValues['type']) => void;
    yesAdditionalPrice: (price: string) => void;
  };
  /** 지금 값의 칸 오류 */
  errors: OptionFormErrors;
  /** 칸에 붙은 서버 오류(`OPTION_FIELD_ERRORS`) — 그 칸을 고치면 지운다 */
  serverErrors: Partial<Record<OptionFormField, string>>;
  /** 저장(만들기)을 한 번이라도 눌렀는지(`formState.isSubmitted`) */
  attempted: boolean;
};

/**
 * 옵션 폼(RHF — patterns §23 "옵션 만들기·수정": 칸별 서버 에러). 검증은 `validateOptionForm`을 resolver로(`rhf-form.ts`).
 * `editable`이 거짓인 칸은 바꾸지 않는다(읽기 전용 · 잠긴 옵션의 추가금). `validate`는 처음 값(`defaultValues`)도 받는다
 */
export function useOptionForm(
  validate: (values: OptionFormValues, base: OptionFormValues) => OptionFormErrors,
  editable: { fields: boolean; price: boolean },
) {
  const form = useForm<OptionFormValues>({
    ...EDIT_FORM_OPTIONS,
    defaultValues: initialOptionFormValues(),
    resolver: resolverFrom((v: OptionFormValues) => validate(v, base)),
  });
  const values = useWatch({ control: form.control }) as OptionFormValues;
  const { defaultValues, dirtyFields, isDirty, isSubmitted, errors: rhfErrors } = form.formState;
  const base = defaultValues as OptionFormValues;
  useClearServerErrors(form, SERVER_FIELDS);

  const setField = <K extends keyof OptionFormValues>(key: K, value: OptionFormValues[K]) =>
    form.setValue(key, value as never, { shouldDirty: true });

  const serverErrors: OptionFormApi['serverErrors'] = {};
  for (const field of Object.keys(SERVER_FIELDS) as OptionFormField[]) {
    const message = serverErrorOf(rhfErrors, field);
    if (message) serverErrors[field] = message;
  }

  const api: OptionFormApi = {
    values,
    set: {
      name: (name) => editable.fields && setField('name', name),
      description: (description) => editable.fields && setField('description', description),
      type: (type) => editable.fields && setField('type', type),
      yesAdditionalPrice: (price) =>
        editable.fields && editable.price && setField('yesAdditionalPrice', price),
    },
    errors: validate(values, base),
    serverErrors,
    attempted: isSubmitted,
  };
  return {
    form,
    api,
    /** 처음 값(수정은 채운 옵션, 저장 뒤 `reset`이 새 기준) */
    base,
    dirtyKeys: dirtyKeysOf(dirtyFields),
    isDirty,
    /** 칸에 서버 오류를 붙인다 */
    setServerError: (field: OptionFormField, message: string) =>
      form.setError(`root.${field}`, { message }),
  };
}
