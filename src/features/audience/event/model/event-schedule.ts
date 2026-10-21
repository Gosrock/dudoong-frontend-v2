import type { EventDetail } from '@/api/event/schema';
import { formatKstDateTime, parseKstDateTime } from '@/api/shared/date';

/**
 * 공연 상세의 일시 표시값(GUI `29:1017` "일시 (180분)"). 러닝타임은 시작·종료로 FE가 계산한다(plan P5b).
 * 서버의 `endAt`은 `startAt + runTime`(분)이라 두 값은 같다(백엔드 `Event.getEndAt`). 종료가 없을 때만 `runTime`을 쓴다.
 * 날짜는 KST로 읽는다(`api/shared/date.ts` — 실행 환경 시간대를 쓰지 않는다).
 */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export type EventSchedule = {
  /** `2026.10.17 (토)` */
  date: string;
  /** `19:00` */
  startTime: string;
  /** `21:00`. 종료가 없으면 null */
  endTime: string | null;
  /** 종료가 시작과 다른 날이면 그 날짜(`2026.10.18 (일)`), 같은 날이면 null */
  endDate: string | null;
  /** 진행 시간(분). 알 수 없거나 0 이하면 null */
  runTimeMinutes: number | null;
  /** `(180분)`. `runTimeMinutes`가 없으면 null */
  runTimeLabel: string | null;
  /** 한 줄 표시 — `2026.10.17 (토) 19:00 (180분)` */
  label: string;
};

/** `'2026.10.17 19:30'` → `{ date: '2026.10.17 (토)', time: '19:30' }` */
function splitKst(value: string) {
  const at = parseKstDateTime(value);
  const [day, time] = formatKstDateTime(at).split(' ') as [string, string];
  const [y, m, d] = day.split('.').map(Number) as [number, number, number];
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return { at, date: `${day} (${weekday})`, time };
}

export function eventSchedule(
  event: Pick<EventDetail, 'startAt' | 'endAt' | 'runTime'>,
): EventSchedule | null {
  if (event.startAt === null) return null;
  const start = splitKst(event.startAt);
  const end = event.endAt === null ? null : splitKst(event.endAt);

  const fromRange =
    end === null ? null : Math.round((end.at.getTime() - start.at.getTime()) / 60_000);
  const minutes = fromRange ?? event.runTime;
  const runTimeMinutes = minutes !== null && minutes > 0 ? minutes : null;
  const runTimeLabel = runTimeMinutes === null ? null : `(${runTimeMinutes}분)`;

  return {
    date: start.date,
    startTime: start.time,
    endTime: end?.time ?? null,
    endDate: end !== null && end.date !== start.date ? end.date : null,
    runTimeMinutes,
    runTimeLabel,
    label: [start.date, start.time, runTimeLabel].filter(Boolean).join(' '),
  };
}
