'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { type FieldPath, type PathValue, useFieldArray, useForm, useWatch } from 'react-hook-form';

import { updateEventBasicMutation } from '@/api/event/mutations';
import { eventTagsQuery } from '@/api/event/queries';
import { handleError, handlersFrom } from '@/api/handle-error';
import type { HostContactType } from '@/api/host/schema';
import { uploadImage } from '@/api/upload';
import {
  applySavedBasic,
  invalidateEventStatus,
} from '@/features/hosting/shared/model/event-cache';
import { EVENT_ENDED_MESSAGE } from '@/features/hosting/shared/model/event-scope';
import { emptyContact } from '@/features/hosting/shared/model/host-fields';
import {
  dirtyKeysOf,
  EDIT_FORM_OPTIONS,
  resolverFrom,
  serverErrorOf,
  useClearServerErrors,
  useFieldChange,
} from '@/features/hosting/shared/model/rhf-form';
import { useEventScope } from '@/features/hosting/shared/model/useEventScope';
import { UPLOAD_ERROR_MESSAGE } from '@/features/shared/image-upload/upload-errors';

import {
  BASIC_INFO_FIELD_ERRORS,
  type BasicInfoServerField,
  type BasicInfoValues,
  basicInfoValuesOf,
  canAddEventContact,
  hasBasicInfoErrors,
  isBasicInfoDirty,
  toggleTag,
  toUpdateEventBasicBody,
  validateBasicInfo,
} from './basic-info-form';
import { kakaoGeocoder } from './kakao-geocoder';
import { type Geocoder, PLACE_ERROR, type PlaceLookupFailure } from './place';
import { toScheduleRange } from './schedule';

type ServerErrors = Partial<Record<BasicInfoServerField, string>>;
type FieldCode = keyof typeof BASIC_INFO_FIELD_ERRORS;

/** 서버 칸 → 그 칸을 이루는 값(고치면 서버 오류를 지운다) */
const SERVER_FIELDS = {
  schedule: ['schedule'],
  contacts: ['contacts'],
  tags: ['tagIds'],
  poster: ['poster'],
  hasTicket: ['hasTicket'],
} as const satisfies Record<BasicInfoServerField, readonly string[]>;
const SERVER_FIELD_NAMES = Object.keys(SERVER_FIELDS) as BasicInfoServerField[];

/** 등록 뒤 티켓 여부 변경(`Event_400_18`) */
const HAS_TICKET_LOCKED_ERROR = '등록된 공연은 티켓 여부를 바꿀 수 없어요';

/** 저장 결과 안내 — 등록된 공연이면 "예매자에게 알림이 가지 않는다" 류 안내 팝업이 필요하다(서버는 알리지 않는다, plan P11 · V) */
export type SavedNotice = 'saved' | 'registeredChanged';

/**
 * 공연 기본 정보(`/hosting/events/[eventId]/info`, PE-4 · PE-10 · GE-11, plan P11). 값·칸 오류·동작만 돌려준다(plan §0).
 * 공연 스코프 레이아웃 안에서 쓴다 — GE-3(`useEventScope`)을 RHF `defaultValues`로 **한 번만** 채운다(patterns §4-4). 저장이 성공한 뒤에만
 * `reset(응답)`이 새 기준이다. 폼은 RHF(patterns §23 — 문의처 반복 · 장소·일정·포스터 얽힘 · 칸별 서버 에러). 검증은 `validateBasicInfo`를
 * resolver로(`rhf-form.ts`). 글자 칸은 V가 `register`, 그 밖(드롭다운·태그·라디오·좌표)은 이 훅의 동작으로 — 읽기 전용이면 바꾸지 않는다
 *
 * - 읽기 전용: 일반 멤버·정산중·지난 공연(`readOnlyReason`) — 저장·업로드하지 않는다
 * - 포스터: `poster.change(file)` = PE-10 발급(POSTER) → S3 PUT → 폼 값에 `key`(저장 때 `posterImageKey`). `remove()`는 `""`(포스터 제거)
 * - 일정: 날짜 1칸 + 시작·종료 시각 → 종료 ≤ 시작이면 다음 날(`schedule.ts`). 등록된 공연의 시작은 지금 이후로만
 * - 장소: `selectAddress(주소)`(우편번호 창 결과) → `geocode`로 좌표 → 공연장 이름·상세주소. 좌표를 못 얻으면 저장하지 않는다.
 *   `geocode`는 주입할 수 있다(기본 카카오 Geocoder — 테스트는 가짜)
 * - 저장(PE-4): 바뀐 필드만(`dirtyFields` → 값 비교), 장소는 상세주소까지 통째로. 성공하면 응답을 GE-3 키에 넣고 GE-7·GE-1·관객 공연 상세 공개 키를 무효화.
 *   등록된 공연이면 `savedNotice: 'registeredChanged'`(안내 팝업, V)
 * - 에러(patterns §24 P11): `Event_400_2`·`24` 일정 · `20` 문의처 · `23` 태그 · `22` 포스터(올린 key를 버리고 다시 올리게) ·
 *   `25` 티켓 여부 → 칸 오류(`setError('root.<칸>')` — 그 칸을 고치면 지우고, 다음 저장 때도 비운다). `17` 정산중·지난 공연 → GE-3을 다시 읽어 읽기 전용으로. `18` 등록 뒤 티켓 여부 →
 *   GE-3을 다시 읽어 토글 잠금. 그 밖은 공용 토스트(handleError)
 */
export function useEventBasicInfo(
  eventId: string,
  {
    geocode = kakaoGeocoder,
    now = () => new Date(),
  }: { geocode?: Geocoder; now?: () => Date } = {},
) {
  const queryClient = useQueryClient();
  const scope = useEventScope(eventId);
  const canEdit = scope.canEdit;
  const tagsQuery = useQuery(eventTagsQuery());

  const form = useForm<BasicInfoValues>({
    ...EDIT_FORM_OPTIONS,
    defaultValues: basicInfoValuesOf(scope.event),
    resolver: resolverFrom((v) =>
      validateBasicInfo(base, v, { registered: scope.registered, now: now() }, dirtyKeys),
    ),
  });
  const contactRows = useFieldArray({ control: form.control, name: 'contacts' });
  const values = useWatch({ control: form.control }) as BasicInfoValues;
  const { defaultValues, dirtyFields, isDirty, isSubmitted, errors: formErrors } = form.formState;
  const base = defaultValues as BasicInfoValues;
  const dirtyKeys = dirtyKeysOf(dirtyFields);
  useClearServerErrors(form, SERVER_FIELDS);

  const [formError, setFormError] = useState<string | null>(null);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<SavedNotice | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [placeLookupFailed, setPlaceLookupFailed] = useState<PlaceLookupFailure | null>(null);
  const lastPosterFile = useRef<File | null>(null);
  const geocodeSeq = useRef(0);
  const inflight = useRef(false);

  // 칸을 고치면 지난 저장 안내를 내린다(`reset`은 이름이 없어 걸리지 않는다)
  useFieldChange(form, () => setSavedNotice(null));

  const errors = validateBasicInfo(
    base,
    values,
    { registered: scope.registered, now: now() },
    dirtyKeys,
  );
  const dirty = isDirty && isBasicInfoDirty(base, values, dirtyKeys);

  /** 칸 하나를 바꾼다(바뀐 칸으로 표시). 읽기 전용이면 바꾸지 않는다 — 글자 칸은 V가 `register` + `readOnly` */
  const edit = useCallback(
    <N extends FieldPath<BasicInfoValues>>(name: N, value: PathValue<BasicInfoValues, N>) => {
      if (!canEdit) return;
      form.setValue(name, value, { shouldDirty: true });
    },
    [canEdit, form],
  );

  // ─── 포스터(PE-10 → S3, 저장은 PE-4) ───
  const posterMutation = useMutation({
    mutationKey: ['events', eventId, 'poster-upload'],
    mutationFn: (file: File) =>
      uploadImage({ target: { kind: 'event', eventId: Number(eventId), purpose: 'POSTER' }, file }),
  });

  const changePoster = useCallback(
    async (file: File) => {
      if (!canEdit || posterMutation.isPending) return;
      lastPosterFile.current = file;
      setPosterError(null);
      setSavedNotice(null);
      form.clearErrors('root.poster');
      try {
        const uploaded = await posterMutation.mutateAsync(file);
        form.setValue('poster', { url: uploaded.url, key: uploaded.key }, { shouldDirty: true });
      } catch (e) {
        // 포스터 자리 오류(공용 업로드 문구 — A10). 표에 없는 실패(429·네트워크·403 등)는 공용 토스트
        handleError(e, handlersFrom(UPLOAD_ERROR_MESSAGE, setPosterError));
      }
    },
    [canEdit, form, posterMutation],
  );
  const removePoster = () => {
    if (posterMutation.isPending) return;
    setPosterError(null);
    // 처음부터 포스터가 없었으면 보낼 것이 없다
    edit('poster', base.poster.url ? { url: null, key: '' } : { url: null });
  };
  const retryPoster = useCallback(
    () => (lastPosterFile.current ? changePoster(lastPosterFile.current) : Promise.resolve()),
    [changePoster],
  );

  // ─── 장소(우편번호 → Geocoder) ───
  const selectAddress = useCallback(
    async (address: string) => {
      if (!canEdit) return;
      const trimmed = address.trim();
      const seq = ++geocodeSeq.current;
      setPlaceLookupFailed(null);
      edit('place', {
        ...form.getValues('place'),
        address: trimmed,
        latitude: null,
        longitude: null,
      });
      if (!trimmed) return;
      setGeocoding(true);
      let coords: Awaited<ReturnType<Geocoder>>;
      let failure: PlaceLookupFailure | null = null;
      try {
        coords = await geocode(trimmed);
        if (!coords) failure = 'notFound';
      } catch {
        // `GeocoderUnavailableError`(SDK 실패)도, 어댑터가 분류하지 못한 예외도 주소 탓이 아니다 — 서비스 오류로 안내한다
        coords = null;
        failure = 'unavailable';
      }
      // 그사이 다른 주소를 골랐으면 버린다
      if (seq !== geocodeSeq.current) return;
      setGeocoding(false);
      if (!coords) {
        setPlaceLookupFailed(failure);
        return;
      }
      const place = form.getValues('place');
      if (place.address === trimmed) {
        form.setValue('place', { ...place, ...coords }, { shouldDirty: true });
      }
    },
    [canEdit, edit, form, geocode],
  );

  // ─── 저장(PE-4) ───
  const saveMutation = useMutation({
    ...updateEventBasicMutation(eventId),
    onSuccess: (saved) => applySavedBasic(queryClient, eventId, saved),
  });

  const blocked = !canEdit || posterMutation.isPending || geocoding || saveMutation.isPending;

  /** 저장했으면 `true`. 읽기 전용·바뀐 것 없음·칸 오류·업로드·좌표 변환·저장 중이면 요청하지 않고 `false` */
  const save = async () => {
    const wasRegistered = scope.registered;
    const saved = await form.handleSubmit(async (valid) => {
      if (blocked || !dirty || inflight.current) return;
      inflight.current = true;
      setFormError(null);
      try {
        const result = await saveMutation.mutateAsync(
          toUpdateEventBasicBody(base, valid, dirtyKeys),
        );
        inflight.current = false;
        return result;
      } catch (e) {
        inflight.current = false;
        const field = (code: FieldCode) => () => {
          const { field: f, message } = BASIC_INFO_FIELD_ERRORS[code];
          form.setError(`root.${f}`, { message });
        };
        handleError(e, {
          Event_400_2: field('Event_400_2'),
          Event_400_24: field('Event_400_24'),
          Event_400_20: field('Event_400_20'),
          Event_400_23: field('Event_400_23'),
          Event_400_25: field('Event_400_25'),
          // 이 공연에 발급한 key가 아님 — 올린 포스터를 버리고 다시 올리게(업로드를 처음부터).
          // 값을 먼저 되돌린다 — 값이 바뀌면 그 칸의 서버 오류를 지우므로(`useClearServerErrors`) 오류는 뒤에 단다
          Event_400_22: () => {
            form.setValue('poster', { url: base.poster.url }, { shouldDirty: true });
            field('Event_400_22')();
          },
          // 정산중·지난 공연 — GE-3을 다시 읽으면 읽기 전용으로 바뀐다
          Event_400_17: () => {
            setFormError(EVENT_ENDED_MESSAGE);
            void invalidateEventStatus(queryClient, eventId);
          },
          // 등록 뒤 티켓 여부 변경 — GE-3을 다시 읽으면 토글이 잠긴다
          Event_400_18: () => {
            form.setError('root.hasTicket', { message: HAS_TICKET_LOCKED_ERROR });
            void invalidateEventStatus(queryClient, eventId);
          },
        });
      }
    })();
    if (!saved) return false;
    // `handleSubmit`이 끝난 뒤에 새 기준으로 — 그래야 `isSubmitted`(칸 오류 표시)도 풀린다
    form.reset(basicInfoValuesOf(saved));
    setPosterError(null);
    lastPosterFile.current = null;
    setSavedNotice(wasRegistered ? 'registeredChanged' : 'saved');
    return true;
  };

  const dismissSavedNotice = useCallback(() => setSavedNotice(null), []);
  const canSave = !blocked && dirty && !hasBasicInfoErrors(errors);
  const serverErrors: ServerErrors = {};
  for (const f of SERVER_FIELD_NAMES) {
    const message = serverErrorOf(formErrors, f);
    if (message) serverErrors[f] = message;
  }

  return {
    /** RHF 폼 — 이름·일정·공연장 이름·상세주소·문의처 값은 `register`(V) */
    form,
    /** 지금 값 */
    values,
    /** 칸 하나 바꾸기(드롭다운 등 `register`가 닿지 않는 칸 · 테스트). 읽기 전용이면 무시 */
    edit,
    /** 매니저 이상 + 준비중·등록된 공연 */
    canEdit,
    registered: scope.registered,
    /** 읽기 전용 이유(`role` · `ended`)와 안내 문구. 고칠 수 있으면 null */
    readOnly: scope.readOnlyReason
      ? { reason: scope.readOnlyReason, message: scope.readOnlyMessage }
      : null,
    poster: {
      url: values.poster.url,
      changed: values.poster.key !== undefined,
      uploading: posterMutation.isPending,
      error: posterError ?? serverErrors.poster ?? null,
      change: changePoster,
      remove: removePoster,
      retry: retryPoster,
    },
    schedule: {
      /** 서버로 갈 시작·종료(칸이 비면 null)와 다음 날 종료 여부 */
      range: toScheduleRange(values.schedule),
    },
    place: {
      /** 우편번호 창 결과 → 좌표 */
      selectAddress,
      geocoding,
      /** 좌표 찾기 실패의 종류(`notFound` · `unavailable`) — 지도 미리보기 안내도 나눈다 */
      lookupFailure: placeLookupFailed,
      /**
       * 좌표를 못 얻었다 — 주소에 좌표가 없으면 다른 주소를 고르게, 지도 SDK 실패면 서비스 오류로 안내(#92-1).
       * 서버가 좌표를 필수로 받아 어느 쪽이든 저장은 막힌다
       */
      lookupError:
        placeLookupFailed === 'unavailable'
          ? PLACE_ERROR.mapUnavailable
          : placeLookupFailed === 'notFound'
            ? PLACE_ERROR.geocode
            : null,
    },
    contacts: {
      /** 줄 키(`id`) — 값은 `values.contacts` */
      rows: contactRows.fields,
      setType: (index: number, type: HostContactType) => edit(`contacts.${index}.type`, type),
      add: () => {
        if (canEdit && canAddEventContact(form.getValues('contacts'))) {
          contactRows.append(emptyContact());
        }
      },
      remove: (index: number) => {
        if (canEdit) contactRows.remove(index);
      },
      canAdd: canEdit && canAddEventContact(values.contacts),
    },
    tags: {
      groups: tagsQuery.data ?? [],
      toggle: (tagId: number) => edit('tagIds', toggleTag(form.getValues('tagIds'), tagId)),
    },
    hasTicket: {
      set: (hasTicket: boolean) => {
        if (!scope.hasTicketLocked) edit('hasTicket', hasTicket);
      },
      /** 등록 후 잠금(`Event_400_18`) */
      locked: scope.hasTicketLocked,
    },
    /** 바뀐 칸의 오류 */
    errors,
    /** 칸에 붙은 서버 오류(`schedule`·`contacts`·`tags`·`poster`·`hasTicket`) — 그 칸을 고치면 지운다 */
    serverErrors,
    /** 화면 전체 오류(`Event_400_17`) */
    formError,
    status: {
      /** [저장]을 한 번이라도 눌렀는지(`formState.isSubmitted`) */
      attempted: isSubmitted,
      /** 저장하지 않은 변경(`formState.isDirty` + 값 비교 — 이탈 확인은 V) */
      dirty,
      saving: saveMutation.isPending,
      canSave,
      /** [미리보기]는 저장할 수 있을 때만 연다(plan P11 V — 코멘트 Nemin 09-20) */
      canPreview: canSave,
    },
    save,
    /** 저장 결과 안내(`registeredChanged` → 등록된 공연 저장 안내 팝업, V) */
    savedNotice: {
      kind: savedNotice,
      dismiss: dismissSavedNotice,
    },
  };
}
