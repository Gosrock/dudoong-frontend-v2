'use client';

import { useMutation, useQueryClient, useSuspenseQueries } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { handleError } from '@/api/handle-error';
import { updateHostMutation } from '@/api/host/mutations';
import { hostMembersQuery, hostViewerQuery } from '@/api/host/queries';
import type { HostContactType } from '@/api/host/schema';
import { uploadImage } from '@/api/upload';
import { hostingAccessOfRole } from '@/features/hosting/access/model/hosting-access';
import { can, superAdminOrRole } from '@/features/shared/permission/model/can';

import { applyUpdatedHost } from './host-cache';
import {
  canAddContact,
  canRemoveContact,
  HOST_CONTACT_OPTIONS,
  withAddedContact,
  withContactType,
  withContactValue,
  withoutContact,
} from './host-fields';
import {
  hasHostSettingsErrors,
  HOST_IMAGE_ERROR_MESSAGE,
  HOST_IMAGE_SLOTS,
  HOST_SETTINGS_ERROR_MESSAGE,
  type HostImageSlot,
  type HostSettingsValues,
  hostSettingsValuesOf,
  isHostSettingsDirty,
  toUpdateHostBody,
  validateHostSettings,
} from './host-settings-form';

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
 * - 폼은 처음 받은 값으로 한 번만 채운다 — 다시 온 조회가 편집 중인 값을 덮지 않는다(patterns §4-4). 저장이 끝나면 응답이 새 기준이다
 * - 저장: 바뀐 필드만 PH-4(patterns §23). 바뀐 것이 없거나 칸 오류가 있으면 요청하지 않는다. 성공하면 응답을 viewer 키에 넣고
 *   공개 GH-3·GH-1·GE-1·GM-1을 무효화한다(`applyUpdatedHost`)
 * - 이미지: `images.PROFILE|COVER.change(file)` = PH-15 발급 → S3 PUT(`src/api/upload.ts`) → 폼 값에 `key`(저장 때 PH-4로).
 *   `reset()`은 기본 이미지(`''`), `retry()`는 마지막 파일로 발급부터 다시. 확장자·S3 실패는 그 자리 오류, 429 등은 공용 토스트(handleError)
 * - 에러(patterns §24 P10b): `HOST_400_16` → 연락처 영역 오류(연락처를 고치면 지운다), `HOST_400_17` → 올린 이미지를 버리고
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

  const [base, setBase] = useState<HostSettingsValues>(() => hostSettingsValuesOf(host));
  const [values, setValues] = useState<HostSettingsValues>(base);
  const [attempted, setAttempted] = useState(false);
  const [contactsServerError, setContactsServerError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState(noImageErrors);
  const lastFiles = useRef<Partial<Record<HostImageSlot, File>>>({});
  const inflight = useRef(false);

  const errors = useMemo(() => validateHostSettings(base, values), [base, values]);
  const dirty = useMemo(() => isHostSettingsDirty(base, values), [base, values]);

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
        setValues((v) => ({
          ...v,
          images: { ...v.images, [slot]: { url: uploaded.url, key: uploaded.key } },
        }));
      } catch (e) {
        const show = (code: keyof typeof HOST_IMAGE_ERROR_MESSAGE) => () =>
          setImageErrors((prev) => ({ ...prev, [slot]: HOST_IMAGE_ERROR_MESSAGE[code] }));
        // 표에 없는 실패(429·네트워크·403 등)는 공용 토스트
        handleError(
          e,
          Object.fromEntries(
            (
              Object.keys(HOST_IMAGE_ERROR_MESSAGE) as (keyof typeof HOST_IMAGE_ERROR_MESSAGE)[]
            ).map((c) => [c, show(c)]),
          ),
        );
      }
    },
    [canEdit, imageMutation],
  );
  const resetImage = useCallback(
    (slot: HostImageSlot) => {
      if (!canEdit || imageMutation.isPending) return;
      setImageErrors((prev) => ({ ...prev, [slot]: null }));
      setValues((v) => ({ ...v, images: { ...v.images, [slot]: { url: null, key: '' } } }));
    },
    [canEdit, imageMutation.isPending],
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
  const save = useCallback(async () => {
    setAttempted(true);
    if (!canEdit || !dirty || hasHostSettingsErrors(errors)) return false;
    if (imageMutation.isPending || inflight.current) return false;
    inflight.current = true;
    setContactsServerError(null);
    const body = toUpdateHostBody(base, values);
    try {
      const updated = await saveMutation.mutateAsync(body);
      inflight.current = false;
      const next = hostSettingsValuesOf(updated);
      setBase(next);
      setValues(next);
      setAttempted(false);
      setImageErrors(noImageErrors());
      lastFiles.current = {};
      return true;
    } catch (e) {
      inflight.current = false;
      // 표에 없는 실패는 공용 토스트
      handleError(e, {
        HOST_400_16: () => setContactsServerError(HOST_SETTINGS_ERROR_MESSAGE.HOST_400_16),
        // HOST_400_17 — 어느 자리의 key인지 서버가 말하지 않는다. 이번에 새로 올려 보낸 자리를 모두 버리고(지운 자리 `''`는 남긴다)
        // 그 자리에 "다시 올려 주세요"
        HOST_400_17: () => {
          const failed = HOST_IMAGE_SLOTS.filter((slot) =>
            Boolean(slot === 'PROFILE' ? body.profileImageKey : body.coverImageKey),
          );
          setValues((v) => {
            const images = { ...v.images };
            for (const slot of failed) images[slot] = { url: base.images[slot].url };
            return { ...v, images };
          });
          setImageErrors((prev) => {
            const next = { ...prev };
            for (const slot of failed) next[slot] = HOST_SETTINGS_ERROR_MESSAGE.HOST_400_17;
            return next;
          });
        },
      });
      return false;
    }
  }, [base, canEdit, dirty, errors, imageMutation.isPending, saveMutation, values]);

  // ─── 칸 ───
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
  const addContact = useCallback(() => {
    setContactsServerError(null);
    setValues((v) => ({ ...v, contacts: withAddedContact(v.contacts) }));
  }, []);
  const removeContact = useCallback((index: number) => {
    setContactsServerError(null);
    setValues((v) => ({ ...v, contacts: withoutContact(v.contacts, index) }));
  }, []);

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
    values,
    setName,
    setIntroduce,
    setContactType,
    setContactValue,
    addContact,
    removeContact,
    canAddContact: canEdit && canAddContact(values.contacts),
    canRemoveContact: canEdit && canRemoveContact(values.contacts),
    /** 연락처 유형 6종(라벨·placeholder) — 호스트 만들기와 같다 */
    contactOptions: HOST_CONTACT_OPTIONS,
    images: { PROFILE: image('PROFILE'), COVER: image('COVER') },
    /** 바뀐 칸의 오류 */
    errors,
    /** [저장]을 한 번이라도 눌렀는지 — 칸 오류를 보일 시점의 기준 */
    attempted,
    /** 저장하지 않은 변경이 있는지(이탈 확인은 V) */
    dirty,
    /** 서버 `HOST_400_16`(어느 줄인지 모른다). 연락처를 고치면 지운다 */
    contactsServerError,
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
