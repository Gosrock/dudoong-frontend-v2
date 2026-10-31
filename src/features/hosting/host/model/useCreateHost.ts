'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';

import { handleError } from '@/api/handle-error';
import { createHostMutation } from '@/api/host/mutations';
import { MY_HOSTS_KEY } from '@/api/host/queries';
import type { HostContactType } from '@/api/host/schema';
import { meQuery } from '@/api/me/queries';
import { HOSTING_HOME_HOSTS_HREF } from '@/features/hosting/home/model/hosting-home';
import { toast } from '@/ui/components/Toast/Toast';
import { tryCatch } from '@/utils/try-catch';

import {
  CREATE_HOST_DONE_TOAST,
  CREATE_HOST_ERROR_MESSAGE,
  type CreateHostValues,
  hasCreateHostErrors,
  initialCreateHostValues,
  toCreateHostBody,
  validateCreateHost,
} from './create-host-form';
import {
  canAddContact,
  canRemoveContact,
  HOST_CONTACT_OPTIONS,
  withAddedContact,
  withContactType,
  withContactValue,
  withoutContact,
} from './host-fields';

/**
 * 호스트 만들기(`/hosting/new/hosts`, PH-2, plan P10a). 값·칸 오류·제출만 돌려주고 UI 동작은 없다(plan §0).
 *
 * - CTA는 "만들기"(design-requests Q19 기본안 — GUI `61:3484`는 "다음")
 * - 제출: 칸 오류가 있으면 요청하지 않고 `attempted`만 켠다(오류를 언제 보일지는 V). 요청 중·이동 중에는 다시 보내지 않는다
 * - 성공: 응답이 `{hostId}`뿐이라 GH-1(`MY_HOSTS_KEY`)을 무효화하고(새 호스트가 목록에 나온다), GM-1 세션(`hosts`·`hostCount` —
 *   햄버거 호스트 줄)도 다시 읽는다. 그 뒤 공연준비 홈 호스트 탭으로 `replace`(Q19 기본안, 뒤로가기로 폼에 돌아와 다시 내지 못하게)
 * - 에러: `HOST_400_16`(연락처 형식) → 연락처 영역 오류(`contactsServerError`), 토스트 없음. 그 밖은 공용 토스트(handleError)
 * - `onCreated`를 주면 이동하지 않고 만든 호스트 id를 넘긴다 — 간편 공연 만들기 Step1 안의 호스트 만들기(P11: 만든 호스트를 고른 채 Step2로)
 */
export function useCreateHost({ onCreated }: { onCreated?: (hostId: number) => void } = {}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [values, setValues] = useState<CreateHostValues>(initialCreateHostValues);
  const [attempted, setAttempted] = useState(false);
  const [contactsServerError, setContactsServerError] = useState<string | null>(null);
  /** 요청 중·이동 중 — 같은 렌더 안의 두 번 누름도 막는다(`isPending`은 다음 렌더에야 바뀐다) */
  const inflight = useRef(false);

  const errors = useMemo(() => validateCreateHost(values), [values]);

  // 목록·세션 무효화는 화면이 사라져도 해야 하므로 옵션의 onSuccess에 둔다
  const mutation = useMutation({
    ...createHostMutation(),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: MY_HOSTS_KEY }),
        queryClient.invalidateQueries({ queryKey: meQuery().queryKey, exact: true }),
      ]),
  });

  const setName = useCallback((name: string) => setValues((v) => ({ ...v, name })), []);
  const setIntroduce = useCallback(
    (introduce: string) => setValues((v) => ({ ...v, introduce })),
    [],
  );
  const setContactType = useCallback((index: number, type: HostContactType) => {
    setContactsServerError(null);
    setValues((v) => ({ ...v, contacts: withContactType(v.contacts, index, type) }));
  }, []);
  const setContactValue = useCallback((index: number, value: string) => {
    setContactsServerError(null);
    setValues((v) => ({ ...v, contacts: withContactValue(v.contacts, index, value) }));
  }, []);
  const addContact = useCallback(
    () => setValues((v) => ({ ...v, contacts: withAddedContact(v.contacts) })),
    [],
  );
  const removeContact = useCallback(
    (index: number) => setValues((v) => ({ ...v, contacts: withoutContact(v.contacts, index) })),
    [],
  );

  const submit = useCallback(async () => {
    setAttempted(true);
    if (hasCreateHostErrors(errors) || inflight.current) return;
    inflight.current = true;
    setContactsServerError(null);
    // 성공 뒤 `onCreated`(부르는 쪽 콜백)가 던진 것까지 공용 토스트로 삼키지 않게 tryCatch로 받는다
    const [created, error] = await tryCatch(mutation.mutateAsync(toCreateHostBody(values)));
    if (error) {
      inflight.current = false;
      // 표에 없는 실패는 공용 토스트
      return handleError(error, {
        HOST_400_16: () => setContactsServerError(CREATE_HOST_ERROR_MESSAGE.HOST_400_16),
      });
    }
    if (onCreated) {
      // 이동하지 않으니 폼을 비우고 다시 만들 수 있게 푼다
      inflight.current = false;
      setValues(initialCreateHostValues());
      setAttempted(false);
      onCreated(created.hostId);
      return;
    }
    // 이동하는 동안 inflight를 유지해 다시 낼 수 없게 둔다. 토스트는 와이어 `495:14931`(공연준비홈_새 호스트 만들기_완료)
    toast(CREATE_HOST_DONE_TOAST);
    router.replace(HOSTING_HOME_HOSTS_HREF);
  }, [errors, mutation, onCreated, router, values]);

  return {
    values,
    setName,
    setIntroduce,
    setContactType,
    setContactValue,
    addContact,
    removeContact,
    canAddContact: canAddContact(values.contacts),
    canRemoveContact: canRemoveContact(values.contacts),
    /** 연락처 유형 6종(라벨·placeholder) */
    contactOptions: HOST_CONTACT_OPTIONS,
    /** 지금 값의 칸 오류 */
    errors,
    /** [만들기]를 한 번이라도 눌렀는지 — 칸 오류를 보일 시점의 기준 */
    attempted,
    /** 서버 `HOST_400_16`(어느 줄인지 모른다 — 연락처 영역 전체). 연락처를 고치면 지운다 */
    contactsServerError,
    // 이동하는 동안(성공 뒤)도 막는다. `onCreated`면 이동하지 않으므로 요청 중만
    submitting: mutation.isPending || (mutation.isSuccess && !onCreated),
    submit,
  };
}
