'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';

import { handleError } from '@/api/handle-error';
import { createHostMutation } from '@/api/host/mutations';
import type { HostContactType } from '@/api/host/schema';
import { HOSTING_HOME_HOSTS_HREF } from '@/features/hosting/shared/routes';
import { toast } from '@/ui/components/Toast/Toast';
import { tryCatch } from '@/utils/try-catch';

import {
  CREATE_HOST_DONE_TOAST,
  CREATE_HOST_ERROR_MESSAGE,
  type CreateHostValues,
  initialCreateHostValues,
  toCreateHostBody,
  validateCreateHost,
} from './create-host-form';
import { invalidateAfterCreateHost } from './host-cache';
import { canAddContact, canRemoveContact, emptyContact, HOST_CONTACT_OPTIONS } from './host-fields';
import { EDIT_FORM_OPTIONS, resolverFrom, serverErrorOf, useClearServerErrors } from './rhf-form';

/** 서버 칸 → 그 칸을 이루는 값(고치면 서버 오류를 지운다) */
const SERVER_FIELDS = { contacts: ['contacts'] } as const;

/**
 * 호스트 만들기(`/hosting/new/hosts`, PH-2, plan P10a). RHF 폼(칸 연결은 V)·연락처 줄·칸 오류·제출만 돌려주고 UI 동작은 없다(plan §0).
 *
 * - 폼: RHF(patterns §23 — 연락처 반복). 검증은 `validateCreateHost`를 resolver로(`rhf-form.ts`). 연락처 줄은 `useFieldArray`
 * - CTA는 "만들기"(design-requests Q19 기본안 — GUI `61:3484`는 "다음")
 * - 제출: 칸 오류가 있으면 요청하지 않는다(`attempted` = `formState.isSubmitted`, 오류를 언제 보일지는 V). 요청 중·이동 중에는 다시 보내지 않는다
 * - 성공: 응답이 `{hostId}`뿐이라 GH-1(`MY_HOSTS_KEY`)을 무효화하고(새 호스트가 목록에 나온다), GM-1 세션(`hosts`·`hostCount` —
 *   햄버거 호스트 줄)도 다시 읽는다. 그 뒤 공연준비 홈 호스트 탭으로 `replace`(Q19 기본안, 뒤로가기로 폼에 돌아와 다시 내지 못하게)
 * - 에러: `HOST_400_16`(연락처 형식) → 연락처 영역 오류(`setError('root.contacts')`), 토스트 없음. 그 밖은 공용 토스트(handleError)
 * - `onCreated`를 주면 이동하지 않고 만든 호스트 id를 넘긴다 — 간편 공연 만들기 Step1 안의 호스트 만들기(P11: 만든 호스트를 고른 채 Step2로)
 */
export function useCreateHost({ onCreated }: { onCreated?: (hostId: number) => void } = {}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const form = useForm<CreateHostValues>({
    ...EDIT_FORM_OPTIONS,
    defaultValues: initialCreateHostValues(),
    resolver: resolverFrom(validateCreateHost),
  });
  const contactRows = useFieldArray({ control: form.control, name: 'contacts' });
  const values = useWatch({ control: form.control }) as CreateHostValues;
  const { isSubmitted, errors: formErrors } = form.formState;
  useClearServerErrors(form, SERVER_FIELDS);
  /** 요청 중·이동 중 — 같은 렌더 안의 두 번 누름도 막는다(`isPending`은 다음 렌더에야 바뀐다) */
  const inflight = useRef(false);

  // 목록·세션 무효화는 화면이 사라져도 해야 하므로 옵션의 onSuccess에 둔다
  const mutation = useMutation({
    ...createHostMutation(),
    onSuccess: () => invalidateAfterCreateHost(queryClient),
  });

  const submit = useCallback(async () => {
    const createdId = await form.handleSubmit(async (valid) => {
      if (inflight.current) return;
      inflight.current = true;
      // 성공 뒤 `onCreated`(부르는 쪽 콜백)가 던진 것까지 공용 토스트로 삼키지 않게 tryCatch로 받는다
      const [created, error] = await tryCatch(mutation.mutateAsync(toCreateHostBody(valid)));
      if (error) {
        inflight.current = false;
        // 표에 없는 실패는 공용 토스트
        handleError(error, {
          HOST_400_16: () =>
            form.setError('root.contacts', { message: CREATE_HOST_ERROR_MESSAGE.HOST_400_16 }),
        });
        return;
      }
      if (onCreated) return created.hostId;
      // 이동하는 동안 inflight를 유지해 다시 낼 수 없게 둔다. 토스트는 와이어 `495:14931`(공연준비홈_새 호스트 만들기_완료)
      toast(CREATE_HOST_DONE_TOAST);
      router.replace(HOSTING_HOME_HOSTS_HREF);
    })();
    if (createdId === undefined || !onCreated) return;
    // 이동하지 않으니 폼을 비우고 다시 만들 수 있게 푼다. `handleSubmit`이 끝난 뒤에 비워야 `isSubmitted`도 풀린다
    inflight.current = false;
    form.reset(initialCreateHostValues());
    onCreated(createdId);
  }, [form, mutation, onCreated, router]);

  return {
    /** RHF 폼 — 이름·소개는 `register`, 연락처 유형은 `Controller`(V) */
    form,
    /** 지금 값(연락처 유형별 placeholder·길이 등 화면 계산용) */
    values,
    contacts: {
      /** 줄 키(`id`) — 값은 `values.contacts` */
      rows: contactRows.fields,
      add: () => {
        if (canAddContact(form.getValues('contacts'))) contactRows.append(emptyContact());
      },
      remove: (index: number) => {
        if (canRemoveContact(form.getValues('contacts'))) contactRows.remove(index);
      },
      /** 유형 고르기(드롭다운 — `register`가 닿지 않는 Radix 칸) */
      setType: (index: number, type: HostContactType) =>
        form.setValue(`contacts.${index}.type`, type, { shouldDirty: true }),
      canAdd: canAddContact(values.contacts),
      canRemove: canRemoveContact(values.contacts),
      /** 연락처 유형 6종(라벨·placeholder) */
      options: HOST_CONTACT_OPTIONS,
      /** 서버 `HOST_400_16`(어느 줄인지 모른다 — 연락처 영역 전체). 연락처를 고치면 지운다 */
      serverError: serverErrorOf(formErrors, 'contacts'),
    },
    /** 지금 값의 칸 오류 */
    errors: validateCreateHost(values),
    /** [만들기]를 한 번이라도 눌렀는지 — 칸 오류를 보일 시점의 기준 */
    attempted: isSubmitted,
    // 이동하는 동안(성공 뒤)도 막는다. `onCreated`면 이동하지 않으므로 요청 중만
    submitting: mutation.isPending || (mutation.isSuccess && !onCreated),
    submit,
  };
}
