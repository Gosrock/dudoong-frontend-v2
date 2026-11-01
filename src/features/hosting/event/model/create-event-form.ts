import type { CreateEventRequest } from '@/api/event/schema';
import type { MyHost } from '@/api/host/schema';
import { can } from '@/features/shared/permission/model/can';

import { nameError } from './basic-info-form';
import { emptySchedule, scheduleError, type ScheduleInput, toScheduleRange } from './schedule';

/**
 * 간편 공연 만들기(`/hosting/new/events`, PE-2, plan P11) — 2단계(`?step=1|2` + 지역 상태, tech-decisions §3 "다단계 플로우").
 * Step1 호스트 선택(일반 멤버인 호스트는 고를 수 없다 — patterns §22) · Step1 안의 호스트 만들기(P10a 로직 그대로, 만든 호스트가 골라진 채
 * Step2로) → Step2 이름(25자) · 날짜 1칸 + 시작·종료 시각 · 티켓 여부. 만든 뒤 대시보드로(design-requests Q7 기본안).
 */

export const NEW_EVENT_PATH = '/hosting/new/events';

export type WizardStep = 1 | 2;

/** `?step=` → 단계. 모르는 값·없음은 1 */
export const parseWizardStep = (params: Pick<URLSearchParams, 'get'>): WizardStep =>
  params.get('step') === '2' ? 2 : 1;

/**
 * 단계 주소. 1단계는 `?step=1`로 쓴다(뒤로가기로 돌아올 자리를 분명히) — 호스트 홈의 `?hostId=`는 남기지 않는다.
 * 2단계는 고른 호스트를 `&hostId=`로 남긴다 — 새로고침해도 같은 호스트가 골라진 채 Step2에 남는다(이슈 #93 §4.
 * 입력값은 지역 상태라 비워진다)
 */
export const wizardStepHref = (step: WizardStep, hostId?: number | null) =>
  step === 2 && hostId != null
    ? `${NEW_EVENT_PATH}?step=2&hostId=${hostId}`
    : `${NEW_EVENT_PATH}?step=${step}`;

/** 호스트 홈 [새 공연 만들기]가 넘기는 `?hostId=`(P5c) — 숫자가 아니면 무시 */
export function parsePreselectedHostId(params: Pick<URLSearchParams, 'get'>): number | null {
  const raw = params.get('hostId');
  return raw && /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : null;
}

/** Step1 호스트 한 줄 — 일반 멤버면 고를 수 없다(서버도 PE-2를 매니저 이상만 받는다) */
export type SelectableHost = MyHost & { selectable: boolean };

export const selectableHostsOf = (hosts: readonly MyHost[]): SelectableHost[] =>
  hosts.map((h) => ({ ...h, selectable: can(h.myRole, 'editEvent') }));

// ─── Step2 ───────────────────────────────────────────────────

export type CreateEventValues = {
  name: string;
  schedule: ScheduleInput;
  /** 고르기 전에는 `null` — GUI Radio에 기본값이 없다(Claude 판단: 기본값을 정하면 여기만 바꾼다) */
  hasTicket: boolean | null;
};

export const initialCreateEventValues = (): CreateEventValues => ({
  name: '',
  schedule: emptySchedule(),
  hasTicket: null,
});

export type CreateEventErrors = {
  name: string | null;
  schedule: string | null;
  hasTicket: string | null;
};

/** 시작은 지금 이후여야 한다(PE-2 `@Future`) */
export function validateCreateEvent(values: CreateEventValues, now: Date): CreateEventErrors {
  return {
    name: nameError(values.name),
    schedule: scheduleError(values.schedule, { requireFuture: true, now }),
    hasTicket: values.hasTicket === null ? '티켓 여부를 골라 주세요' : null,
  };
}

export const hasCreateEventErrors = (e: CreateEventErrors) =>
  e.name !== null || e.schedule !== null || e.hasTicket !== null;

/** 보내는 본문(PE-2). 종료 ≤ 시작이면 다음 날. 칸 오류가 없을 때만 부른다 */
export function toCreateEventBody(hostId: number, values: CreateEventValues): CreateEventRequest {
  const range = toScheduleRange(values.schedule);
  if (!range || values.hasTicket === null) throw new Error('칸 오류를 먼저 본다');
  return {
    hostId,
    name: values.name.trim(),
    startAt: range.startAt,
    endAt: range.endAt,
    hasTicket: values.hasTicket,
  };
}

/** 만든 뒤 가는 곳 — 대시보드 + "만들었다" 표시(`?created=1`, 토스트는 V. design-requests Q7 기본안) */
export const createdEventHref = (eventId: number) =>
  `/hosting/events/${eventId}/dashboard?created=1`;
