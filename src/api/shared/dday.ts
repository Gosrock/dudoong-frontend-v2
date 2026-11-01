import type { EventDisplayStatus } from '../event/schema';
import { isKstDateTime, kstDayDiff } from './date';

/**
 * 공연 시점 글자(코드 패턴 점검 A4, 2026-11-02) — D-day · 공연 중 · 공연 종료를 화면마다 따로 만들지 않는다.
 * 기준은 design-system §3 Concert state chip: `dDay` 0은 **"D-day"**(옛 `D-0`·`D-DAY`는 쓰지 않는다).
 * 🤖 공연 중·종료 문구는 띄어 쓴다("공연 중"·"공연 종료") — 쓰는 곳 다수와 맞춤법을 따랐다. Figma 칩 이름 "공연중"·와이어 "공연종료"와
 * 다르면 이 상수만 바꾼다.
 */

export const EVENT_ONGOING_LABEL = '공연 중';
export const EVENT_ENDED_LABEL = '공연 종료';

/** 공연 D-day 글자. 0이면 `'D-day'`, 남은 날 `'D-7'`, 지난 날 `'D+2'` */
export const formatDday = (dDay: number) =>
  dDay === 0 ? 'D-day' : dDay > 0 ? `D-${dDay}` : `D+${-dDay}`;

/**
 * 서버 `dDay`가 없는 응답(O-2·O-3 주문의 공연)에서 시작 일시로 D-day를 계산한다 — KST 날짜 차이(시각은 보지 않음).
 * 시작 일시가 없거나 형식이 틀리면 `null`
 */
export function ddayOf(startAt: string | null, now: Date): number | null {
  if (!startAt || !isKstDateTime(startAt)) return null;
  return kstDayDiff(startAt, now);
}

/**
 * 공연 시점 배지 글자: 예정 → D-day 글자(`dDay`가 없거나 지난 날이면 `null`) · 공연 중 · 공연 종료. 준비중·모르는 상태는 `null`(배지 없음).
 * `dDay`는 서버 값(UPCOMING일 때만 옴) 또는 `ddayOf`로 계산한 값.
 */
export function eventTimingLabel(event: {
  displayStatus: EventDisplayStatus;
  dDay: number | null;
}): string | null {
  switch (event.displayStatus) {
    case 'UPCOMING':
      return event.dDay === null || event.dDay < 0 ? null : formatDday(event.dDay);
    case 'ONGOING':
      return EVENT_ONGOING_LABEL;
    case 'PAST':
      return EVENT_ENDED_LABEL;
    default:
      return null;
  }
}
