import { describe, expect, it } from 'vitest';

import { salePeriodText } from './TicketCard';

describe('salePeriodText — 판매 기간 줄', () => {
  it('기간을 정했으면 그대로', () => {
    expect(salePeriodText('2026.10.28 12:00', '2026.11.08 23:59', '2026.11.20 19:00')).toBe(
      '26.10.28 12:00 ~ 26.11.08 23:59',
    );
  });

  it('기간을 정하지 않으면 등록 즉시 ~ 공연 시작 전(공연 시작 일시)', () => {
    expect(salePeriodText(null, null, '2026.11.20 19:00')).toBe(
      '등록 즉시 ~ 공연 시작 전(26.11.20 19:00)',
    );
  });

  it('끝만 비면 공연 시작 전까지', () => {
    expect(salePeriodText('2026.10.28 12:00', null, '2026.11.20 19:00')).toBe(
      '26.10.28 12:00 ~ 공연 시작 전(26.11.20 19:00)',
    );
  });

  it('공연 시작 일시가 아직 없으면 "공연 시작 전"', () => {
    expect(salePeriodText(null, null, null)).toBe('등록 즉시 ~ 공연 시작 전');
  });
});
