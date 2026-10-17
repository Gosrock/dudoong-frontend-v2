import { afterEach, describe, expect, it } from 'vitest';

import { formatKstDateTime, isKstDateTime, kstDateTime, parseKstDateTime } from './date';

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
