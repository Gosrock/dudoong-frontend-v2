import { formatKstDateTime, parseKstDateTime } from '@/api/shared/date';

/**
 * PC 오른쪽 카드의 주간 달력(와이어 `640:1957`). 공연 날짜가 든 한 주(일~토)를 표시만 한다 — 누를 수 없다
 * (design-requests Q21 기본안: 회차가 하나라 날짜 선택이 아니다). 날짜는 KST로 읽는다.
 */
export const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

export type WeekDay = {
  day: number;
  weekday: (typeof WEEKDAY_LABELS)[number];
  isEventDay: boolean;
};

export type EventWeek = {
  /** 공연 날짜의 연·월(`2026년 1월`) */
  year: number;
  month: number;
  days: WeekDay[];
};

export function eventWeek(startAt: string | null): EventWeek | null {
  if (startAt === null) return null;
  const [date] = formatKstDateTime(parseKstDateTime(startAt)).split(' ') as [string];
  const [year, month, day] = date.split('.').map(Number) as [number, number, number];
  const eventDay = new Date(Date.UTC(year, month - 1, day));
  const sunday = Date.UTC(year, month - 1, day - eventDay.getUTCDay());
  const days = WEEKDAY_LABELS.map((weekday, i) => {
    const d = new Date(sunday + i * 86_400_000);
    return { day: d.getUTCDate(), weekday, isEventDay: i === eventDay.getUTCDay() };
  });
  return { year, month, days };
}
