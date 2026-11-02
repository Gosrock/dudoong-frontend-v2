'use client';

import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';

import { updateEventSectionsMutation } from '@/api/event/mutations';
import { eventSectionsManageQuery } from '@/api/event/queries';
import { handleError, handlersFrom } from '@/api/handle-error';
import { uploadImage } from '@/api/upload';
import {
  applySavedSections,
  invalidateEventStatus,
} from '@/features/hosting/shared/model/event-cache';
import { EVENT_ENDED_MESSAGE } from '@/features/hosting/shared/model/event-scope';
import {
  EDIT_FORM_OPTIONS,
  resolverFrom,
  useFieldChange,
} from '@/features/hosting/shared/model/rhf-form';
import { useEventScope } from '@/features/hosting/shared/model/useEventScope';
import { UPLOAD_ERROR_MESSAGE } from '@/features/shared/image-upload/upload-errors';

import {
  canAddSection,
  canRemoveSection,
  emptySection,
  hasSectionErrors,
  isSectionsDirty,
  SECTION_ERROR,
  type SectionInput,
  sectionInputsOf,
  toUpdateSectionsBody,
  validateSections,
} from './sections-form';
import type { SavedNotice } from './useEventBasicInfo';

type SectionsValues = { sections: SectionInput[] };

/** 칸 오류를 RHF 경로(`sections.<i>.title`)로 — resolver용 */
const sectionFieldErrors = ({ sections }: SectionsValues) => {
  const errors = validateSections(sections);
  return { sections: sections.map((s) => errors[s.key]!) };
};

/**
 * 공연 상세 정보(`/hosting/events/[eventId]/detail`, GE-5 · PE-6 · PE-10 `SECTION`, plan P11). 값·칸 오류·동작만 — 탭·에디터(Tiptap)는 V.
 * 공연 스코프 레이아웃 안에서 쓴다. 섹션은 쿠키를 싣는 GE-5(`eventSectionsManageQuery` — 준비중 공연은 멤버만 보인다)를 RHF
 * `defaultValues`로 한 번만 채운다(patterns §4-4). 폼은 RHF(patterns §23 — 섹션 탭 반복, `useFieldArray`), 검증은 `validateSections`를 resolver로.
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
  const { data: saved } = useSuspenseQuery(eventSectionsManageQuery(eventId));

  const form = useForm<SectionsValues>({
    ...EDIT_FORM_OPTIONS,
    defaultValues: { sections: sectionInputsOf(saved) },
    resolver: resolverFrom(sectionFieldErrors),
  });
  const rows = useFieldArray({ control: form.control, name: 'sections' });
  const { sections } = useWatch({ control: form.control }) as SectionsValues;
  const { defaultValues, isDirty, isSubmitted } = form.formState;
  const base = (defaultValues as SectionsValues).sections;

  const [formError, setFormError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<SavedNotice | null>(null);
  const inflight = useRef(false);

  // 칸을 고치면 지난 저장 안내·폼 오류를 내린다(`reset`은 이름이 없어 걸리지 않는다)
  useFieldChange(form, () => {
    setSavedNotice(null);
    setFormError(null);
  });

  const errors = validateSections(sections);
  const dirty = isDirty && isSectionsDirty(base, sections);

  const indexOf = (key: string) => form.getValues('sections').findIndex((s) => s.key === key);
  const setField = (key: string, field: 'title' | 'content', value: string) => {
    const i = indexOf(key);
    if (canEdit && i >= 0) form.setValue(`sections.${i}.${field}`, value, { shouldDirty: true });
  };

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
      try {
        const uploaded = await imageMutation.mutateAsync(file);
        return uploaded.url;
      } catch (e) {
        // 공용 업로드 문구(A10). 표에 없는 실패는 공용 토스트
        handleError(e, handlersFrom(UPLOAD_ERROR_MESSAGE, setImageError));
        return null;
      }
    },
    [canEdit, imageMutation],
  );

  // ─── 저장(PE-6) ───
  const saveMutation = useMutation({
    ...updateEventSectionsMutation(eventId),
    onSuccess: (next) => applySavedSections(queryClient, eventId, next),
  });

  const blocked = !canEdit || imageMutation.isPending || saveMutation.isPending;

  /** 저장했으면 `true`. 읽기 전용·바뀐 것 없음·칸 오류·업로드·저장 중이면 요청하지 않고 `false` */
  const save = async () => {
    const wasRegistered = scope.registered;
    const result = await form.handleSubmit(async (valid) => {
      if (blocked || !dirty || inflight.current) return;
      inflight.current = true;
      setFormError(null);
      try {
        const next = await saveMutation.mutateAsync(toUpdateSectionsBody(valid.sections));
        inflight.current = false;
        return next;
      } catch (e) {
        inflight.current = false;
        handleError(e, {
          Event_400_21: () => setFormError(SECTION_ERROR.Event_400_21),
          Event_400_17: () => {
            setFormError(EVENT_ENDED_MESSAGE);
            void invalidateEventStatus(queryClient, eventId);
          },
        });
      }
    })();
    if (!result) return false;
    // `handleSubmit`이 끝난 뒤에 새 기준으로 — 그래야 `isSubmitted`(칸 오류 표시)도 풀린다
    form.reset({ sections: sectionInputsOf(result) });
    setSavedNotice(wasRegistered ? 'registeredChanged' : 'saved');
    return true;
  };

  const dismissSavedNotice = useCallback(() => setSavedNotice(null), []);
  const canSave = !blocked && dirty && !hasSectionErrors(errors);

  return {
    /** RHF 폼 — 탭 이름은 `register('sections.<i>.title')`(V) */
    form,
    canEdit,
    /** 지금 섹션(순서대로) */
    sections,
    /** 탭 고치기 — 섹션 키로. 읽기 전용이면 무시 */
    tabs: {
      setTitle: (key: string, title: string) => setField(key, 'title', title),
      setContent: (key: string, content: string) => setField(key, 'content', content),
      add: () => {
        if (canEdit && canAddSection(form.getValues('sections'))) rows.append(emptySection());
      },
      remove: (key: string) => {
        const i = indexOf(key);
        if (canEdit && i >= 0 && canRemoveSection(form.getValues('sections'))) rows.remove(i);
      },
      move: (key: string, to: number) => {
        const from = indexOf(key);
        const length = form.getValues('sections').length;
        if (canEdit && from >= 0 && to >= 0 && to < length && from !== to) rows.move(from, to);
      },
      canAdd: canEdit && canAddSection(sections),
      canRemove: canEdit && canRemoveSection(sections),
    },
    image: {
      upload: uploadSectionImage,
      uploading: imageMutation.isPending,
      error: imageError,
    },
    /** 섹션 키 → 칸 오류 */
    errors,
    formError,
    status: {
      /** [저장]을 한 번이라도 눌렀는지(`formState.isSubmitted`) */
      attempted: isSubmitted,
      dirty,
      saving: saveMutation.isPending,
      canSave,
      /** [미리보기]는 저장할 수 있을 때만(plan P11 V) */
      canPreview: canSave,
    },
    save,
    savedNotice: { kind: savedNotice, dismiss: dismissSavedNotice },
  };
}
