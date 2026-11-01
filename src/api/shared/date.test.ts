import { afterEach, describe, expect, it } from 'vitest';

import {
  formatKstDateTime,
  isKstDateTime,
  joinKstDateTime,
  KOREAN_WEEKDAYS,
  kstDateTime,
  kstDayDiff,
  kstParts,
  parseKstDateTime,
  splitKstDateTime,
  toKstIso,
} from './date';

const ORIGINAL_TZ = process.env.TZ;

describe('date — yyyy.MM.dd HH:mm (KST)', () => {
  afterEach(() => {
    process.env.TZ = ORIGINAL_TZ;
  });

  it('KST 벽시계 값을 UTC 시각으로 바꾼다', () => {
    expect(parseKstDateTime('2026.10.17 19:30').toISOString()).toBe('2026-10-17T10:30:00.000Z');
    // 자정 전후는 날짜가 하루 넘어간다
    expect(parseKstDateTime('2026.01.01 08:59').toISOString()).toBe('2025-12-31T23:59:00.000Z');
  });

  it('Date를 KST 문자열로 바꾸고 초 이하는 버린다', () => {
    expect(formatKstDateTime(new Date('2026-10-17T10:30:59.999Z'))).toBe('2026.10.17 19:30');
    expect(formatKstDateTime(new Date('2025-12-31T15:00:00Z'))).toBe('2026.01.01 00:00');
  });

  it.each(['UTC', 'America/New_York', 'Asia/Seoul', 'Pacific/Kiritimati'])(
    '실행 환경 시간대(%s)와 상관없이 결과가 같다',
    (tz) => {
      process.env.TZ = tz;
      // 미국 서머타임 전환일(2026-03-08, 2026-11-01)도 KST에는 영향이 없다
      for (const [kst, iso] of [
        ['2026.03.08 16:30', '2026-03-08T07:30:00.000Z'],
        ['2026.11.01 15:00', '2026-11-01T06:00:00.000Z'],
        ['2024.02.29 00:00', '2024-02-28T15:00:00.000Z'],
      ] as const) {
        expect(parseKstDateTime(kst).toISOString()).toBe(iso);
        expect(formatKstDateTime(new Date(iso))).toBe(kst);
      }
    },
  );

  it('왕복하면 같은 문자열이다', () => {
    for (const s of ['2000.01.01 00:00', '2026.12.31 23:59', '2028.02.29 12:05']) {
      expect(formatKstDateTime(parseKstDateTime(s))).toBe(s);
    }
  });

  it.each([
    '2026-10-17 19:30',
    '2026.10.17 19:30:00',
    '2026.10.17T19:30',
    '2026.1.7 9:30',
    '2026.02.30 10:00',
    '2025.02.29 10:00',
    '2026.13.01 10:00',
    '2026.10.17 24:00',
    '2026.10.17 23:60',
    '',
  ])('형식이 틀리면(%j) 파싱이 RangeError, 스키마가 실패', (bad) => {
    expect(isKstDateTime(bad)).toBe(false);
    expect(() => parseKstDateTime(bad)).toThrow(RangeError);
    expect(kstDateTime.safeParse(bad).success).toBe(false);
  });

  it('스키마는 문자열을 그대로 둔다', () => {
    expect(kstDateTime.parse('2026.10.17 19:30')).toBe('2026.10.17 19:30');
    expect(kstDateTime.nullable().parse(null)).toBeNull();
  });

  it('잘못된 Date는 직렬화하지 않는다', () => {
    expect(() => formatKstDateTime(new Date('nope'))).toThrow(RangeError);
  });
});

describe('date — 계산·변환(A19)', () => {
  it('kstParts — 벽시계 값 + 요일', () => {
    expect(kstParts('2026.10.17 19:30')).toEqual({
      year: 2026,
      month: 10,
      day: 17,
      hour: 19,
      minute: 30,
      weekday: '토',
    });
    expect(() => kstParts('2026.02.30 10:00')).toThrow(RangeError);
  });

  it('KOREAN_WEEKDAYS — 일요일부터', () => {
    expect(KOREAN_WEEKDAYS[0]).toBe('일');
    expect(KOREAN_WEEKDAYS[6]).toBe('토');
  });

  it('kstDayDiff — KST 자정 기준 날짜 차이', () => {
    const now = new Date('2026-11-02T14:59:00Z'); // 11-02 23:59 KST
    expect(kstDayDiff('2026.11.02 00:00', now)).toBe(0);
    expect(kstDayDiff('2026.11.03 00:00', now)).toBe(1);
    expect(kstDayDiff('2026.10.31 23:00', now)).toBe(-2);
    const afterMidnight = new Date('2026-11-02T15:00:00Z'); // 11-03 00:00 KST
    expect(kstDayDiff('2026.11.03 00:00', afterMidnight)).toBe(0);
  });

  it('kstDayDiff — 실행 환경 시간대와 상관없다', () => {
    process.env.TZ = 'America/Los_Angeles';
    expect(kstDayDiff('2026.11.03 10:00', new Date('2026-11-02T15:00:00Z'))).toBe(0);
    process.env.TZ = ORIGINAL_TZ;
  });

  it('splitKstDateTime — 입력칸 값, 없거나 틀리면 빈 칸', () => {
    expect(splitKstDateTime('2026.01.05 09:05')).toEqual({ date: '2026-01-05', time: '09:05' });
    expect(splitKstDateTime(null)).toEqual({ date: '', time: '' });
    expect(splitKstDateTime('2026-01-05 09:05')).toEqual({ date: '', time: '' });
  });

  it('joinKstDateTime — 칸 → 서버 일시, 틀리면 null', () => {
    expect(joinKstDateTime('2026-01-05', '09:05')).toBe('2026.01.05 09:05');
    expect(joinKstDateTime('', '09:05')).toBeNull();
    expect(joinKstDateTime('2026-02-30', '10:00')).toBeNull();
    expect(joinKstDateTime('2026-01-05', '24:00')).toBeNull();
    expect(joinKstDateTime('2026-1-5', '9:05')).toBeNull();
  });

  it('split ↔ join 왕복', () => {
    const { date, time } = splitKstDateTime('2026.12.31 23:59');
    expect(joinKstDateTime(date, time)).toBe('2026.12.31 23:59');
  });

  it('toKstIso — +09:00 오프셋 ISO', () => {
    expect(toKstIso('2026.10.17 19:30')).toBe('2026-10-17T19:30:00+09:00');
    expect(toKstIso('2026.01.01 00:00')).toBe('2026-01-01T00:00:00+09:00');
  });
});
