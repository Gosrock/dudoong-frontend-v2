'use client';

import { useMutation, useQueryClient, useSuspenseQueries } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';

import { handleError, handlersFrom } from '@/api/handle-error';
import { updateHostMutation } from '@/api/host/mutations';
import { hostMembersQuery, hostViewerQuery } from '@/api/host/queries';
import type { HostContactType } from '@/api/host/schema';
import { uploadImage } from '@/api/upload';
import { hostingAccessOfRole } from '@/features/hosting/access/model/hosting-access';
import { applyUpdatedHost } from '@/features/hosting/shared/model/host-cache';
import {
  canAddContact,
  canRemoveContact,
  emptyContact,
  HOST_CONTACT_OPTIONS,
} from '@/features/hosting/shared/model/host-fields';
import {
  dirtyKeysOf,
  EDIT_FORM_OPTIONS,
  resolverFrom,
  serverErrorOf,
  useClearServerErrors,
} from '@/features/hosting/shared/model/rhf-form';
import { UPLOAD_ERROR_MESSAGE } from '@/features/shared/image-upload/upload-errors';
import { can, superAdminOrRole } from '@/features/shared/permission/model/can';

import {
  hasHostSettingsErrors,
  HOST_IMAGE_SLOTS,
  HOST_SETTINGS_ERROR_MESSAGE,
  type HostImageSlot,
  type HostSettingsValues,
  hostSettingsValuesOf,
  isHostSettingsDirty,
  toUpdateHostBody,
  validateHostSettings,
} from './host-settings-form';

/** 서버 칸 → 그 칸을 이루는 값(고치면 서버 오류를 지운다) */
const SERVER_FIELDS = { contacts: ['contacts'] } as const;

const noImageErrors = (): Record<HostImageSlot, string | null> => ({ PROFILE: null, COVER: null });

/**
 * 호스트 설정(`/hosting/hosts/[hostId]/settings`, PH-4 · PH-15, plan P10b). 값·칸 오류·이미지 업로드·저장만 돌려주고 UI 동작은 없다(plan §0).
 * `<AsyncBoundary rejected={HostingAccessRejected}>` 안에서 쓴다 — GH-3 viewer(쿠키, `myRole`·원문 연락처)와 GH-6(멤버 목록, G+)을
 * 함께 Suspense로 읽는다.
 *
 * - 접근: GH-3은 공개라 비멤버도 200 + `myRole: null`이다 — 그래서 G+ 조회 GH-6을 같이 읽는다. 비멤버는 GH-6이 403 → 경계가 공용 403.
 *   GH-6이 성공했는데 `myRole`이 null이면 멤버가 아닌 SUPER_ADMIN이라 매니저처럼 편집할 수 있다(`superAdminOrRole`, 사용자 결정
 *   2026-10-31). 모르는 역할은 `access: 'forbidden'`(P10a `hostingAccessOfRole`). 없는 호스트는 404 → 경계.
 *   일반 멤버는 읽기 전용(`canEdit: false` — patterns §22 "일반 멤버 = 읽기 전용", 저장하지 않는다)
 * - 폼: RHF(patterns §23 — 연락처 반복 · 이미지 2칸). 처음 받은 값을 `defaultValues`로 한 번만 채운다 — 다시 온 조회가 편집 중인 값을
 *   덮지 않는다(patterns §4-4). 저장이 끝나면 `reset(응답)`이 새 기준이다. 검증은 `validateHostSettings`를 resolver로(`rhf-form.ts`)
 * - 저장: 바뀐 필드만 PH-4(patterns §23 — `dirtyFields` → 공백 비교). 바뀐 것이 없거나 칸 오류가 있으면 요청하지 않는다. 성공하면 응답을 viewer 키에 넣고
 *   공개 GH-3·GH-1·GE-1·GM-1을 무효화한다(`applyUpdatedHost`)
 * - 이미지: `images.PROFILE|COVER.change(file)` = PH-15 발급 → S3 PUT(`src/api/upload.ts`) → 폼 값에 `key`(저장 때 PH-4로).
 *   `reset()`은 기본 이미지(`''`), `retry()`는 마지막 파일로 발급부터 다시. 확장자·S3 실패는 그 자리 오류, 429 등은 공용 토스트(handleError)
 * - 에러(patterns §24 P10b): `HOST_400_16` → 연락처 영역 오류(`setError('root.contacts')` — 연락처를 고치면 지운다), `HOST_400_17` → 올린 이미지를 버리고
 *   그 자리 오류("다시 올려 주세요" — 업로드 처음부터). 그 밖은 공용 토스트(handleError)
 */
export function useHostSettings(hostId: string) {
  const queryClient = useQueryClient();
  const [{ data: host }] = useSuspenseQueries({
    queries: [hostViewerQuery(hostId), hostMembersQuery(hostId)],
  });
  // GH-6(G+)이 함께 성공했다 — null이면 SUPER_ADMIN
  const role = superAdminOrRole(host.myRole);
  const access = hostingAccessOfRole(role);
  const canEdit = can(role, 'editHost');

  const form = useForm<HostSettingsValues>({
    ...EDIT_FORM_OPTIONS,
    defaultValues: hostSettingsValuesOf(host),
    resolver: resolverFrom((v) => validateHostSettings(base, v, dirtyKeys)),
  });
  const contactRows = useFieldArray({ control: form.control, name: 'contacts' });
  const values = useWatch({ control: form.control }) as HostSettingsValues;
  const { defaultValues, dirtyFields, isDirty, isSubmitted, errors: formErrors } = form.formState;
  const base = defaultValues as HostSettingsValues;
  const dirtyKeys = dirtyKeysOf(dirtyFields);
  useClearServerErrors(form, SERVER_FIELDS);

  const [imageErrors, setImageErrors] = useState(noImageErrors);
  const lastFiles = useRef<Partial<Record<HostImageSlot, File>>>({});
  const inflight = useRef(false);

  const errors = validateHostSettings(base, values, dirtyKeys);
  const dirty = isDirty && isHostSettingsDirty(base, values, dirtyKeys);

  // ─── 이미지(발급 → S3, 저장은 PH-4) ───
  const imageMutation = useMutation({
    mutationKey: ['hosts', hostId, 'image-upload'],
    mutationFn: ({ slot, file }: { slot: HostImageSlot; file: File }) =>
      uploadImage({ target: { kind: 'host', hostId: Number(hostId), purpose: slot }, file }),
  });
  const uploadingSlot = imageMutation.isPending ? (imageMutation.variables?.slot ?? null) : null;

  const changeImage = useCallback(
    async (slot: HostImageSlot, file: File) => {
      if (!canEdit || imageMutation.isPending) return;
      lastFiles.current[slot] = file;
      setImageErrors((prev) => ({ ...prev, [slot]: null }));
      try {
        const uploaded = await imageMutation.mutateAsync({ slot, file });
        form.setValue(
          `images.${slot}`,
          { url: uploaded.url, key: uploaded.key },
          { shouldDirty: true },
        );
      } catch (e) {
        // 그 자리의 업로드 오류(공용 문구 — A10). 표에 없는 실패(429·네트워크·403 등)는 공용 토스트
        handleError(
          e,
          handlersFrom(UPLOAD_ERROR_MESSAGE, (message) =>
            setImageErrors((prev) => ({ ...prev, [slot]: message })),
          ),
        );
      }
    },
    [canEdit, form, imageMutation],
  );
  const resetImage = useCallback(
    (slot: HostImageSlot) => {
      if (!canEdit || imageMutation.isPending) return;
      setImageErrors((prev) => ({ ...prev, [slot]: null }));
      form.setValue(`images.${slot}`, { url: null, key: '' }, { shouldDirty: true });
    },
    [canEdit, form, imageMutation.isPending],
  );

  const retryImage = useCallback(
    (slot: HostImageSlot) => {
      const file = lastFiles.current[slot];
      return file ? changeImage(slot, file) : Promise.resolve();
    },
    [changeImage],
  );

  // ─── 저장(PH-4) ───
  // 캐시 반영·무효화는 화면이 사라져도 해야 하므로 옵션의 onSuccess에 둔다
  const saveMutation = useMutation({
    ...updateHostMutation(hostId),
    onSuccess: (updated) => applyUpdatedHost(queryClient, hostId, updated),
  });

  /** 저장했으면 `true`. 읽기 전용·바뀐 것 없음·칸 오류·업로드 중·저장 중이면 요청하지 않고 `false` */
  const save = async () => {
    const saved = await form.handleSubmit(async (valid) => {
      if (!canEdit || !dirty) return;
      if (imageMutation.isPending || inflight.current) return;
      inflight.current = true;
      const body = toUpdateHostBody(base, valid, dirtyKeys);
      try {
        const updated = await saveMutation.mutateAsync(body);
        inflight.current = false;
        return updated;
      } catch (e) {
        inflight.current = false;
        // 표에 없는 실패는 공용 토스트
        handleError(e, {
          HOST_400_16: () =>
            form.setError('root.contacts', { message: HOST_SETTINGS_ERROR_MESSAGE.HOST_400_16 }),
          // HOST_400_17 — 어느 자리의 key인지 서버가 말하지 않는다. 이번에 새로 올려 보낸 자리를 모두 버리고(지운 자리 `''`는 남긴다)
          // 그 자리에 "다시 올려 주세요"
          HOST_400_17: () => {
            const failed = HOST_IMAGE_SLOTS.filter((slot) =>
              Boolean(slot === 'PROFILE' ? body.profileImageKey : body.coverImageKey),
            );
            for (const slot of failed) {
              form.setValue(
                `images.${slot}`,
                { url: base.images[slot].url },
                { shouldDirty: true },
              );
            }
            setImageErrors((prev) => {
              const next = { ...prev };
              for (const slot of failed) next[slot] = HOST_SETTINGS_ERROR_MESSAGE.HOST_400_17;
              return next;
            });
          },
        });
      }
    })();
    if (!saved) return false;
    // `handleSubmit`이 끝난 뒤에 새 기준으로 — 그래야 `isSubmitted`(칸 오류 표시)도 풀린다
    form.reset(hostSettingsValuesOf(saved));
    setImageErrors(noImageErrors());
    lastFiles.current = {};
    return true;
  };

  const image = (slot: HostImageSlot) => ({
    /** 미리보기 주소(저장 전에는 올린 이미지, 기본 이미지면 null) */
    url: values.images[slot].url,
    /** 저장하면 바뀌는지 */
    changed: values.images[slot].key !== undefined,
    uploading: uploadingSlot === slot,
    error: imageErrors[slot],
    change: (file: File) => changeImage(slot, file),
    reset: () => resetImage(slot),
    /** 마지막으로 고른 파일로 발급부터 다시(S3 실패·`HOST_400_17` 뒤) */
    retry: () => retryImage(slot),
  });

  return {
    /** 지금 저장된 호스트(GH-3 viewer) */
    host,
    /** 비멤버면 `forbidden` — 화면이 공용 403 안내를 그린다 */
    access,
    /** 매니저 이상만 저장한다. 일반 멤버는 읽기 전용 */
    canEdit,
    /** RHF 폼 — 이름·소개·연락처 값은 `register`(V) */
    form,
    /** 지금 값 */
    values,
    contacts: {
      /** 줄 키(`id`) — 값은 `values.contacts` */
      rows: contactRows.fields,
      /** 유형 고르기(드롭다운 — `register`가 닿지 않는 Radix 칸) */
      setType: (index: number, type: HostContactType) =>
        form.setValue(`contacts.${index}.type`, type, { shouldDirty: true }),
      add: () => {
        if (canAddContact(form.getValues('contacts'))) contactRows.append(emptyContact());
      },
      remove: (index: number) => {
        if (canRemoveContact(form.getValues('contacts'))) contactRows.remove(index);
      },
      canAdd: canEdit && canAddContact(values.contacts),
      canRemove: canEdit && canRemoveContact(values.contacts),
      /** 연락처 유형 6종(라벨·placeholder) — 호스트 만들기와 같다 */
      options: HOST_CONTACT_OPTIONS,
      /** 서버 `HOST_400_16`(어느 줄인지 모른다). 연락처를 고치면 지운다 */
      serverError: serverErrorOf(formErrors, 'contacts'),
    },
    images: { PROFILE: image('PROFILE'), COVER: image('COVER') },
    /** 바뀐 칸의 오류 */
    errors,
    /** [저장]을 한 번이라도 눌렀는지(`formState.isSubmitted`) — 칸 오류를 보일 시점의 기준 */
    attempted: isSubmitted,
    /** 저장하지 않은 변경이 있는지(`formState.isDirty` + 공백만 바꾼 칸 거름 — 이탈 확인은 V) */
    dirty,
    saving: saveMutation.isPending,
    /** 저장할 수 있는 상태(버튼 활성 기준) */
    canSave:
      canEdit &&
      dirty &&
      !hasHostSettingsErrors(errors) &&
      !imageMutation.isPending &&
      !saveMutation.isPending,
    save,
  };
}
