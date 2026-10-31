'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { updateEventBasicMutation } from '@/api/event/mutations';
import { eventManageQuery, eventTagsQuery } from '@/api/event/queries';
import type { HostContactType } from '@/api/host/schema';
import { handleError, settle } from '@/api/settle';
import { UPLOAD_INVALID_EXTENSION, UPLOAD_PUT_FAILED, uploadImage } from '@/api/upload';
import {
  emptyContact,
  HOST_CONTACT_OPTIONS,
  withContactType,
  withContactValue,
} from '@/features/hosting/host/model/host-fields';

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
import { applySavedBasic } from './event-cache';
import { kakaoGeocoder } from './kakao-geocoder';
import { type Geocoder, PLACE_ERROR } from './place';
import type { ScheduleInput } from './schedule';
import { toScheduleRange } from './schedule';
import { useEventScope } from './useEventScope';

type ServerErrors = Partial<Record<BasicInfoServerField, string>>;
type FieldCode = keyof typeof BASIC_INFO_FIELD_ERRORS;

/** 포스터 자리 오류(P9 프로필·P10b 호스트 이미지와 같은 문구) */
const POSTER_UPLOAD_ERROR = {
  [UPLOAD_INVALID_EXTENSION]: 'JPG·PNG 이미지만 올릴 수 있어요',
  [UPLOAD_PUT_FAILED]: '이미지를 올리지 못했어요. 다시 시도해 주세요',
} as const;

/** 저장 결과 안내 — 등록된 공연이면 "예매자에게 알림이 가지 않는다" 류 안내 팝업이 필요하다(서버는 알리지 않는다, plan P11 · V) */
export type SavedNotice = 'saved' | 'registeredChanged';

/**
 * 공연 기본 정보(`/hosting/events/[eventId]/info`, PE-4 · PE-10 · GE-11, plan P11). 값·칸 오류·동작만 돌려준다(plan §0).
 * 공연 스코프 레이아웃 안에서 쓴다 — GE-3(`useEventScope`)을 처음 값으로 **한 번만** 채운다(patterns §4-4).
 *
 * - 읽기 전용: 일반 멤버·정산중·지난 공연(`readOnlyReason`) — 저장·업로드하지 않는다
 * - 포스터: `poster.change(file)` = PE-10 발급(POSTER) → S3 PUT → 폼 값에 `key`(저장 때 `posterImageKey`). `remove()`는 `""`(포스터 제거)
 * - 일정: 날짜 1칸 + 시작·종료 시각 → 종료 ≤ 시작이면 다음 날(`schedule.ts`). 등록된 공연의 시작은 지금 이후로만
 * - 장소: `selectAddress(주소)`(우편번호 창 결과) → `geocode`로 좌표 → 공연장 이름·상세주소. 좌표를 못 얻으면 저장하지 않는다.
 *   `geocode`는 주입할 수 있다(기본 카카오 Geocoder — 테스트는 가짜)
 * - 저장(PE-4): 바뀐 필드만, 장소는 상세주소까지 통째로. 성공하면 응답을 GE-3 키에 넣고 GE-7·GE-1·관객 공연 상세 공개 키를 무효화.
 *   등록된 공연이면 `savedNotice: 'registeredChanged'`(안내 팝업, V)
 * - 에러(patterns §24 P11): `Event_400_2`·`24` 일정 · `20` 문의처 · `23` 태그 · `22` 포스터(올린 key를 버리고 다시 올리게) ·
 *   `25` 티켓 여부 → 칸 오류(그 칸을 고치면 지운다). `17` 정산중·지난 공연 → GE-3을 다시 읽어 읽기 전용으로. `18` 등록 뒤 티켓 여부 →
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

  const [base, setBase] = useState<BasicInfoValues>(() => basicInfoValuesOf(scope.event));
  const [values, setValues] = useState<BasicInfoValues>(base);
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<ServerErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<SavedNotice | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [placeLookupFailed, setPlaceLookupFailed] = useState(false);
  const lastPosterFile = useRef<File | null>(null);
  const geocodeSeq = useRef(0);
  const inflight = useRef(false);

  const errors = useMemo(
    () => validateBasicInfo(base, values, { registered: scope.registered, now: now() }),
    // `now`는 렌더마다 새 시각이면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, values, scope.registered],
  );
  const dirty = useMemo(() => isBasicInfoDirty(base, values), [base, values]);

  const edit = useCallback(
    (field: BasicInfoServerField | null, update: (v: BasicInfoValues) => BasicInfoValues) => {
      if (!canEdit) return;
      setSavedNotice(null);
      if (field) setServerErrors((prev) => ({ ...prev, [field]: undefined }));
      setValues(update);
    },
    [canEdit],
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
      setServerErrors((prev) => ({ ...prev, poster: undefined }));
      const r = await settle(posterMutation.mutateAsync(file));
      if (r.ok) {
        const uploaded = r.data;
        setValues((v) => ({ ...v, poster: { url: uploaded.url, key: uploaded.key } }));
        return;
      }
      const show = (code: keyof typeof POSTER_UPLOAD_ERROR) => () =>
        setPosterError(POSTER_UPLOAD_ERROR[code]);
      // 표에 없는 실패(429·네트워크·403 등)는 공용 토스트
      handleError(r.error, {
        [UPLOAD_INVALID_EXTENSION]: show(UPLOAD_INVALID_EXTENSION),
        [UPLOAD_PUT_FAILED]: show(UPLOAD_PUT_FAILED),
      });
    },
    [canEdit, posterMutation],
  );
  const removePoster = useCallback(() => {
    if (posterMutation.isPending) return;
    setPosterError(null);
    // 처음부터 포스터가 없었으면 보낼 것이 없다
    edit('poster', (v) => ({
      ...v,
      poster: base.poster.url ? { url: null, key: '' } : { url: null },
    }));
  }, [base.poster.url, edit, posterMutation.isPending]);
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
      setPlaceLookupFailed(false);
      edit(null, (v) => ({
        ...v,
        place: { ...v.place, address: trimmed, latitude: null, longitude: null },
      }));
      if (!trimmed) return;
      setGeocoding(true);
      const coords = await geocode(trimmed).catch(() => null);
      // 그사이 다른 주소를 골랐으면 버린다
      if (seq !== geocodeSeq.current) return;
      setGeocoding(false);
      if (!coords) {
        setPlaceLookupFailed(true);
        return;
      }
      setValues((v) =>
        v.place.address === trimmed ? { ...v, place: { ...v.place, ...coords } } : v,
      );
    },
    [canEdit, edit, geocode],
  );
  const setPlaceName = useCallback(
    (name: string) => edit(null, (v) => ({ ...v, place: { ...v.place, name } })),
    [edit],
  );
  const setDetailAddress = useCallback(
    (detailAddress: string) => edit(null, (v) => ({ ...v, place: { ...v.place, detailAddress } })),
    [edit],
  );

  // ─── 칸 ───
  const setName = useCallback((name: string) => edit(null, (v) => ({ ...v, name })), [edit]);
  const setSchedule = useCallback(
    (patch: Partial<ScheduleInput>) =>
      edit('schedule', (v) => ({ ...v, schedule: { ...v.schedule, ...patch } })),
    [edit],
  );
  const setContactType = useCallback(
    (index: number, type: HostContactType) =>
      edit('contacts', (v) => ({ ...v, contacts: withContactType(v.contacts, index, type) })),
    [edit],
  );
  const setContactValue = useCallback(
    (index: number, value: string) =>
      edit('contacts', (v) => ({ ...v, contacts: withContactValue(v.contacts, index, value) })),
    [edit],
  );
  const addContact = useCallback(
    () =>
      edit('contacts', (v) =>
        canAddEventContact(v.contacts) ? { ...v, contacts: [...v.contacts, emptyContact()] } : v,
      ),
    [edit],
  );
  const removeContact = useCallback(
    (index: number) =>
      edit('contacts', (v) => ({ ...v, contacts: v.contacts.filter((_, i) => i !== index) })),
    [edit],
  );
  const toggle = useCallback(
    (tagId: number) => edit('tags', (v) => ({ ...v, tagIds: toggleTag(v.tagIds, tagId) })),
    [edit],
  );
  const setHasTicket = useCallback(
    (hasTicket: boolean) => {
      if (scope.hasTicketLocked) return;
      edit('hasTicket', (v) => ({ ...v, hasTicket }));
    },
    [edit, scope.hasTicketLocked],
  );

  // ─── 저장(PE-4) ───
  const saveMutation = useMutation({
    ...updateEventBasicMutation(eventId),
    onSuccess: (saved) => applySavedBasic(queryClient, eventId, saved),
  });

  const blocked = !canEdit || posterMutation.isPending || geocoding || saveMutation.isPending;

  /** 저장했으면 `true`. 읽기 전용·바뀐 것 없음·칸 오류·업로드·좌표 변환·저장 중이면 요청하지 않고 `false` */
  const save = useCallback(async () => {
    setAttempted(true);
    if (blocked || !dirty || hasBasicInfoErrors(errors) || inflight.current) return false;
    inflight.current = true;
    setFormError(null);
    const wasRegistered = scope.registered;
    const r = await settle(saveMutation.mutateAsync(toUpdateEventBasicBody(base, values)));
    inflight.current = false;
    if (r.ok) {
      const next = basicInfoValuesOf(r.data);
      setBase(next);
      setValues(next);
      setAttempted(false);
      setServerErrors({});
      setPosterError(null);
      lastPosterFile.current = null;
      setSavedNotice(wasRegistered ? 'registeredChanged' : 'saved');
      return true;
    }
    const manageKey = eventManageQuery(eventId).queryKey;
    const field = (code: FieldCode) => () => {
      const { field: f, message } = BASIC_INFO_FIELD_ERRORS[code];
      setServerErrors((prev) => ({ ...prev, [f]: message }));
    };
    handleError(r.error, {
      Event_400_2: field('Event_400_2'),
      Event_400_24: field('Event_400_24'),
      Event_400_20: field('Event_400_20'),
      Event_400_23: field('Event_400_23'),
      Event_400_25: field('Event_400_25'),
      // 이 공연에 발급한 key가 아님 — 올린 포스터를 버리고 다시 올리게(업로드를 처음부터)
      Event_400_22: () => {
        field('Event_400_22')();
        setValues((v) => ({ ...v, poster: { url: base.poster.url } }));
      },
      // 정산중·지난 공연 — GE-3을 다시 읽으면 읽기 전용으로 바뀐다
      Event_400_17: () => {
        setFormError('끝난 공연은 수정할 수 없어요');
        void queryClient.invalidateQueries({ queryKey: manageKey, exact: true });
      },
      // 등록 뒤 티켓 여부 변경 — GE-3을 다시 읽으면 토글이 잠긴다
      Event_400_18: () => {
        setServerErrors((prev) => ({
          ...prev,
          hasTicket: '등록된 공연은 티켓 여부를 바꿀 수 없어요',
        }));
        void queryClient.invalidateQueries({ queryKey: manageKey, exact: true });
      },
    });
    return false;
  }, [base, blocked, dirty, errors, eventId, queryClient, saveMutation, scope.registered, values]);

  const canSave = !blocked && dirty && !hasBasicInfoErrors(errors);
  const range = toScheduleRange(values.schedule);

  return {
    event: scope.event,
    /** 매니저 이상 + 준비중·등록된 공연 */
    canEdit,
    readOnlyReason: scope.readOnlyReason,
    readOnlyMessage: scope.readOnlyMessage,
    registered: scope.registered,
    values,
    // 포스터
    poster: {
      url: values.poster.url,
      changed: values.poster.key !== undefined,
      uploading: posterMutation.isPending,
      error: posterError ?? serverErrors.poster ?? null,
      change: changePoster,
      remove: removePoster,
      retry: retryPoster,
    },
    setName,
    // 일정
    setSchedule,
    /** 서버로 갈 시작·종료(칸이 비면 null)와 다음 날 종료 여부 */
    scheduleRange: range,
    // 장소
    selectAddress,
    setPlaceName,
    setDetailAddress,
    geocoding,
    /** 좌표를 못 얻었다 — 다른 주소를 고르게 한다 */
    placeLookupError: placeLookupFailed ? PLACE_ERROR.geocode : null,
    // 문의처
    setContactType,
    setContactValue,
    addContact,
    removeContact,
    canAddContact: canEdit && canAddEventContact(values.contacts),
    contactOptions: HOST_CONTACT_OPTIONS,
    // 태그
    tagGroups: tagsQuery.data ?? [],
    toggleTag: toggle,
    // 티켓 여부
    setHasTicket,
    /** 등록 후 잠금(`Event_400_18`) */
    hasTicketLocked: scope.hasTicketLocked,
    /** 바뀐 칸의 오류 */
    errors,
    /** 칸에 붙은 서버 오류(`schedule`·`contacts`·`tags`·`poster`·`hasTicket`) — 그 칸을 고치면 지운다 */
    serverErrors,
    /** 화면 전체 오류(`Event_400_17`) */
    formError,
    attempted,
    /** 저장하지 않은 변경(이탈 확인은 V) */
    dirty,
    saving: saveMutation.isPending,
    canSave,
    /** [미리보기]는 저장할 수 있을 때만 연다(plan P11 V — 코멘트 Nemin 09-20) */
    canPreview: canSave,
    save,
    /** 저장 결과 안내(`registeredChanged` → 등록된 공연 저장 안내 팝업, V) */
    savedNotice,
    dismissSavedNotice: () => setSavedNotice(null),
  };
}
