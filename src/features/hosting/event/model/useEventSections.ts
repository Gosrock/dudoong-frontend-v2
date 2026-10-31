'use client';

import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { updateEventSectionsMutation } from '@/api/event/mutations';
import { eventManageQuery, eventSectionsManageQuery } from '@/api/event/queries';
import { handleError, settle } from '@/api/settle';
import { UPLOAD_INVALID_EXTENSION, UPLOAD_PUT_FAILED, uploadImage } from '@/api/upload';

import { applySavedSections } from './event-cache';
import {
  canAddSection,
  canRemoveSection,
  hasSectionErrors,
  isSectionsDirty,
  SECTION_ERROR,
  type SectionInput,
  sectionInputsOf,
  toUpdateSectionsBody,
  validateSections,
  withAddedSection,
  withMovedSection,
  withoutSection,
  withSectionContent,
  withSectionTitle,
} from './sections-form';
import type { SavedNotice } from './useEventBasicInfo';
import { useEventScope } from './useEventScope';

const IMAGE_ERROR = {
  [UPLOAD_INVALID_EXTENSION]: 'JPG·PNG 이미지만 올릴 수 있어요',
  [UPLOAD_PUT_FAILED]: '이미지를 올리지 못했어요. 다시 시도해 주세요',
} as const;

/**
 * 공연 상세 정보(`/hosting/events/[eventId]/detail`, GE-5 · PE-6 · PE-10 `SECTION`, plan P11). 값·칸 오류·동작만 — 탭·에디터(Tiptap)는 V.
 * 공연 스코프 레이아웃 안에서 쓴다. 섹션은 쿠키를 싣는 GE-5(`eventSectionsManageQuery` — 준비중 공연은 멤버만 보인다)를 한 번만 채운다.
 *
 * - 저장(PE-6)은 **전체 교체**: 지금 목록 전부를 순서대로 보내고, 뺀 섹션은 서버에서 지워진다. 성공하면 응답을 편집용 키에 넣고
 *   GE-7·GE-3(체크리스트 ②)·관객 공연 상세 공개 키를 무효화. 등록된 공연이면 `savedNotice: 'registeredChanged'`
 * - 본문 이미지: `uploadImage(file)` = PE-10 발급(SECTION) → S3 PUT → 받은 `url`(에디터가 HTML에 넣는다). 실패하면 `null` + `imageError`
 * - 읽기 전용(일반 멤버·정산중·지난 공연)은 저장·업로드하지 않는다
 * - 에러: `Event_400_21` 형식 → 폼 오류(폼이 먼저 막는다), `Event_400_17` → GE-3을 다시 읽어 읽기 전용으로. 그 밖은 공용 토스트(handleError)
 */
export function useEventSections(eventId: string) {
  const queryClient = useQueryClient();
  const scope = useEventScope(eventId);
  const canEdit = scope.canEdit;
  const { data: sections } = useSuspenseQuery(eventSectionsManageQuery(eventId));

  const [base, setBase] = useState<SectionInput[]>(() => sectionInputsOf(sections));
  const [values, setValues] = useState<SectionInput[]>(base);
  const [attempted, setAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<SavedNotice | null>(null);
  const inflight = useRef(false);

  const errors = useMemo(() => validateSections(values), [values]);
  const dirty = useMemo(() => isSectionsDirty(base, values), [base, values]);

  const edit = useCallback(
    (update: (v: SectionInput[]) => SectionInput[]) => {
      if (!canEdit) return;
      setSavedNotice(null);
      setFormError(null);
      setValues(update);
    },
    [canEdit],
  );

  // ─── 본문 이미지 ───
  const imageMutation = useMutation({
    mutationKey: ['events', eventId, 'section-image-upload'],
    mutationFn: (file: File) =>
      uploadImage({
        target: { kind: 'event', eventId: Number(eventId), purpose: 'SECTION' },
        file,
      }),
  });
  /** 올린 이미지 주소(에디터가 `<img src>`로 넣는다). 실패·읽기 전용이면 `null` */
  const uploadSectionImage = useCallback(
    async (file: File): Promise<string | null> => {
      if (!canEdit) return null;
      setImageError(null);
      const r = await settle(imageMutation.mutateAsync(file));
      if (r.ok) return r.data.url;
      const show = (code: keyof typeof IMAGE_ERROR) => () => setImageError(IMAGE_ERROR[code]);
      handleError(r.error, {
        [UPLOAD_INVALID_EXTENSION]: show(UPLOAD_INVALID_EXTENSION),
        [UPLOAD_PUT_FAILED]: show(UPLOAD_PUT_FAILED),
      });
      return null;
    },
    [canEdit, imageMutation],
  );

  // ─── 저장(PE-6) ───
  const saveMutation = useMutation({
    ...updateEventSectionsMutation(eventId),
    onSuccess: (saved) => applySavedSections(queryClient, eventId, saved),
  });

  const blocked = !canEdit || imageMutation.isPending || saveMutation.isPending;

  /** 저장했으면 `true`. 읽기 전용·바뀐 것 없음·칸 오류·업로드·저장 중이면 요청하지 않고 `false` */
  const save = useCallback(async () => {
    setAttempted(true);
    if (blocked || !dirty || hasSectionErrors(errors) || inflight.current) return false;
    inflight.current = true;
    setFormError(null);
    const wasRegistered = scope.registered;
    const r = await settle(saveMutation.mutateAsync(toUpdateSectionsBody(values)));
    inflight.current = false;
    if (r.ok) {
      const next = sectionInputsOf(r.data);
      setBase(next);
      setValues(next);
      setAttempted(false);
      setSavedNotice(wasRegistered ? 'registeredChanged' : 'saved');
      return true;
    }
    handleError(r.error, {
      Event_400_21: () => setFormError(SECTION_ERROR.Event_400_21),
      Event_400_17: () => {
        setFormError('끝난 공연은 수정할 수 없어요');
        void queryClient.invalidateQueries({
          queryKey: eventManageQuery(eventId).queryKey,
          exact: true,
        });
      },
    });
    return false;
  }, [blocked, dirty, errors, eventId, queryClient, saveMutation, scope.registered, values]);

  const canSave = !blocked && dirty && !hasSectionErrors(errors);

  return {
    event: scope.event,
    canEdit,
    readOnlyReason: scope.readOnlyReason,
    readOnlyMessage: scope.readOnlyMessage,
    /** 지금 섹션(순서대로) */
    sections: values,
    setTitle: (key: string, title: string) => edit((v) => withSectionTitle(v, key, title)),
    setContent: (key: string, content: string) => edit((v) => withSectionContent(v, key, content)),
    addSection: () => edit(withAddedSection),
    removeSection: (key: string) => edit((v) => withoutSection(v, key)),
    moveSection: (key: string, to: number) => edit((v) => withMovedSection(v, key, to)),
    canAddSection: canEdit && canAddSection(values),
    canRemoveSection: canEdit && canRemoveSection(values),
    uploadSectionImage,
    imageUploading: imageMutation.isPending,
    imageError,
    /** 섹션 키 → 칸 오류 */
    errors,
    attempted,
    formError,
    dirty,
    saving: saveMutation.isPending,
    canSave,
    /** [미리보기]는 저장할 수 있을 때만(plan P11 V) */
    canPreview: canSave,
    save,
    savedNotice,
    dismissSavedNotice: () => setSavedNotice(null),
  };
}
