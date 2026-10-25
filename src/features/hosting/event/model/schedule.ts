import { formatKstDateTime, isKstDateTime, parseKstDateTime } from '@/api/shared/date';

/**
 * 공연 일정 칸(plan P11 "일정"). Figma(간편 만들기 Step2 `55:3164`, 기본 정보 `748:33351`)는 **날짜 하나 + 시작·종료 시각**이고
 * 서버(PE-2·PE-4)는 시작·종료 일시(`yyyy.MM.dd HH:mm`, KST)를 따로 받는다. 디자인이 오기 전까지
 * **종료 시각이 시작 시각 이하면 다음 날**로 계산한다(자정을 넘는 공연).
 *
 * 칸 값은 브라우저 기본 입력의 모양을 따른다 — 날짜 `YYYY-MM-DD`, 시각 `HH:mm`(Claude 판단: V의 날짜 선택기가 다른 모양이면 이 파일에서 바꾼다).
 */

export type ScheduleInput = {
  /** `YYYY-MM-DD`, 비면 `''` */
  date: string;
  /** `HH:mm`, 비면 `''` */
  startTime: string;
  /** `HH:mm`, 비면 `''` */
  endTime: string;
};

export const emptySchedule = (): ScheduleInput => ({ date: '', startTime: '', endTime: '' });

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

const DAY_MS = 24 * 60 * 60 * 1000;

/** 서버 일시 → 칸 값. 날짜는 시작일, 시각은 각자(종료가 다음 날이어도 시각만). 값이 없으면 빈 칸 */
export function scheduleInputOf(startAt: string | null, endAt: string | null): ScheduleInput {
  const [startDate = '', startTime = ''] = startAt?.split(' ') ?? [];
  const endTime = endAt?.split(' ')[1] ?? '';
  return { date: startDate.replaceAll('.', '-'), startTime, endTime };
}

export type ScheduleRange = {
  startAt: string;
  endAt: string;
  /** 종료가 다음 날로 넘어갔는지(종료 시각 ≤ 시작 시각) — "다음 날 종료" 안내용 */
  overnight: boolean;
};

/** 칸 값 → 서버 일시. 칸이 비었거나 형식·달력 값이 틀리면 `null` */
export function toScheduleRange(input: ScheduleInput): ScheduleRange | null {
  const d = DATE.exec(input.date);
  if (!d || !TIME.test(input.startTime) || !TIME.test(input.endTime)) return null;
  const day = `${d[1]}.${d[2]}.${d[3]}`;
  const startAt = `${day} ${input.startTime}`;
  const sameDayEnd = `${day} ${input.endTime}`;
  if (!isKstDateTime(startAt)) return null;
  const overnight = input.endTime <= input.startTime;
  const endAt = overnight
    ? formatKstDateTime(new Date(parseKstDateTime(sameDayEnd).getTime() + DAY_MS))
    : sameDayEnd;
  return { startAt, endAt, overnight };
}

export const SCHEDULE_ERROR = {
  date: '공연 날짜를 골라 주세요',
  startTime: '시작 시각을 입력해 주세요',
  endTime: '종료 시각을 입력해 주세요',
  past: '시작 시각은 지금 이후로 정해 주세요',
  /** PE-2·PE-4 `Event_400_2` — FE는 종료 ≤ 시작을 다음 날로 보내므로 정상 흐름에서는 나지 않는다(날짜 계산 버그를 의심, patterns §24) */
  Event_400_2: '종료 시각을 다시 확인해 주세요',
} as const;

/**
 * 일정 칸 오류. `requireFuture`면 시작이 `now` 이후여야 한다 — 간편 만들기(PE-2 `@Future`)와 등록된 공연의 시작 변경(`Event_400_24`).
 * 준비중 공연의 수정은 서버가 과거를 막지 않지만 지난 시작이면 등록할 수 없다(체크리스트 `canOpen`) — 막지 않는다
 */
export function scheduleError(
  input: ScheduleInput,
  { requireFuture, now }: { requireFuture: boolean; now: Date },
): string | null {
  if (!DATE.test(input.date)) return SCHEDULE_ERROR.date;
  if (!TIME.test(input.startTime)) return SCHEDULE_ERROR.startTime;
  if (!TIME.test(input.endTime)) return SCHEDULE_ERROR.endTime;
  const range = toScheduleRange(input);
  if (!range) return SCHEDULE_ERROR.date;
  if (requireFuture && parseKstDateTime(range.startAt).getTime() <= now.getTime()) {
    return SCHEDULE_ERROR.past;
  }
  return null;
}

export const isSameSchedule = (a: ScheduleInput, b: ScheduleInput) =>
  a.date === b.date && a.startTime === b.startTime && a.endTime === b.endTime;
