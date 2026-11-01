import { describe, expect, it } from 'vitest';

import { ddayOf, eventTimingLabel, formatDday } from './dday';

describe('formatDday', () => {
  it('0은 D-day', () => expect(formatDday(0)).toBe('D-day'));
  it('남은 날', () => expect(formatDday(7)).toBe('D-7'));
  it('지난 날', () => expect(formatDday(-2)).toBe('D+2'));
});

describe('ddayOf', () => {
  // 2026-11-02 23:30 KST
  const now = new Date('2026-11-02T14:30:00Z');

  it('같은 KST 날짜면 시각이 지나도 0', () => {
    expect(ddayOf('2026.11.02 09:00', now)).toBe(0);
    expect(ddayOf('2026.11.02 23:59', now)).toBe(0);
  });

  it('KST 자정을 넘기면 다음 날', () => {
    expect(ddayOf('2026.11.03 00:00', now)).toBe(1);
    expect(ddayOf('2026.11.15 19:00', now)).toBe(13);
  });

  it('UTC로는 같은 날이어도 KST 날짜로 센다', () => {
    // 2026-11-02 00:30 KST = 2026-11-01 15:30 UTC
    const early = new Date('2026-11-01T15:30:00Z');
    expect(ddayOf('2026.11.02 20:00', early)).toBe(0);
    expect(ddayOf('2026.11.01 20:00', early)).toBe(-1);
  });

  it('값이 없거나 형식이 틀리면 null', () => {
    expect(ddayOf(null, now)).toBeNull();
    expect(ddayOf('2026-11-02 19:00', now)).toBeNull();
  });
});

describe('eventTimingLabel', () => {
  it('예정 — D-day 글자', () => {
    expect(eventTimingLabel({ displayStatus: 'UPCOMING', dDay: 0 })).toBe('D-day');
    expect(eventTimingLabel({ displayStatus: 'UPCOMING', dDay: 13 })).toBe('D-13');
  });

  it('예정인데 dDay가 없거나 지났으면 배지 없음', () => {
    expect(eventTimingLabel({ displayStatus: 'UPCOMING', dDay: null })).toBeNull();
    expect(eventTimingLabel({ displayStatus: 'UPCOMING', dDay: -1 })).toBeNull();
  });

  it('공연 중 · 공연 종료', () => {
    expect(eventTimingLabel({ displayStatus: 'ONGOING', dDay: null })).toBe('공연 중');
    expect(eventTimingLabel({ displayStatus: 'PAST', dDay: null })).toBe('공연 종료');
  });

  it('준비중·모르는 상태는 null', () => {
    expect(eventTimingLabel({ displayStatus: 'PREPARING', dDay: null })).toBeNull();
    expect(eventTimingLabel({ displayStatus: 'UNKNOWN' as never, dDay: 3 })).toBeNull();
  });
});
