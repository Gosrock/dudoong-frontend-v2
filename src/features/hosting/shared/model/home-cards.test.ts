import { describe, expect, it } from 'vitest';

import { eventChipOf, eventMetaLineOf } from './home-cards';

describe('eventChipOf', () => {
  it('취소된 공연은 표시 상태가 UPCOMING이어도 D-n 대신 "취소됨"(이슈 #274 §1-1)', () => {
    expect(
      eventChipOf({ displayStatus: 'UPCOMING', dDay: 3, canceledAt: '2026.11.15 12:00' }),
    ).toEqual({ label: '취소됨', color: 'grey', theme: 'weak' });
  });

  it('취소 안 된 예정 공연은 D-n', () => {
    expect(eventChipOf({ displayStatus: 'UPCOMING', dDay: 3, canceledAt: null })?.label).toBe(
      'D-3',
    );
  });
});

describe('eventMetaLineOf', () => {
  it('호스트명 · D-n', () => {
    expect(eventMetaLineOf({ hostName: '두둥', dDay: 0, canceledAt: null })).toBe('두둥 · D-day');
  });

  it('취소된 공연은 D-n 대신 취소됨 — 서버가 dDay를 줘도(2.5.14 이하)', () => {
    expect(eventMetaLineOf({ hostName: '두둥', dDay: 5, canceledAt: '2026.11.15 12:00' })).toBe(
      '두둥 · 취소됨',
    );
  });

  it('D-n이 없으면 호스트명만', () => {
    expect(eventMetaLineOf({ hostName: '두둥', dDay: null })).toBe('두둥');
  });
});
