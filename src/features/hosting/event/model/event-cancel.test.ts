import { describe, expect, it } from 'vitest';

import type { EventCancelResult } from '@/api/event/schema';

import { canCancelEvent, cancelReasonError, cancelResultSummary } from './event-cancel';

const OPEN_UPCOMING = { status: 'OPEN', displayStatus: 'UPCOMING', canceledAt: null } as const;

describe('canCancelEvent — 마스터 · 등록 · 시작 전 · 취소 안 됨(E-11)', () => {
  it.each([
    ['마스터 · OPEN · 시작 전', OPEN_UPCOMING, 'MASTER', true],
    ['SUPER_ADMIN(검사를 건너뛴다)', OPEN_UPCOMING, 'SUPER_ADMIN', true],
    ['매니저', OPEN_UPCOMING, 'MANAGER', false],
    ['일반 멤버', OPEN_UPCOMING, 'GUEST', false],
    ['멤버 아님', OPEN_UPCOMING, null, false],
    [
      '준비중(→ 삭제)',
      { ...OPEN_UPCOMING, status: 'PREPARING', displayStatus: 'PREPARING' },
      'MASTER',
      false,
    ],
    ['공연 중', { ...OPEN_UPCOMING, displayStatus: 'ONGOING' }, 'MASTER', false],
    ['정산중', { ...OPEN_UPCOMING, status: 'CALCULATING', displayStatus: 'PAST' }, 'MASTER', false],
    ['이미 취소', { ...OPEN_UPCOMING, canceledAt: '2026.11.07 14:30' }, 'MASTER', false],
    ['2.5.3 응답(필드 없음)', { status: 'OPEN', displayStatus: 'UPCOMING' }, 'MASTER', true],
  ] as const)('%s → %s', (_, event, role, expected) => {
    expect(canCancelEvent(event, role)).toBe(expected);
  });
});

describe('cancelReasonError — 앞뒤 공백 제외 1~100자(Event_400_31과 같은 규칙)', () => {
  it.each([
    ['', '취소 사유를 입력해 주세요.'],
    ['   ', '취소 사유를 입력해 주세요.'],
    ['a', null],
    [` ${'a'.repeat(100)} `, null],
    ['a'.repeat(101), '취소 사유는 100자까지 입력할 수 있어요.'],
  ])('%j → %s', (reason, expected) => {
    expect(cancelReasonError(reason)).toBe(expected);
  });
});

const result = (patch: Partial<EventCancelResult>): EventCancelResult => ({
  eventId: 1,
  canceledAt: '2026.11.07 14:30',
  cancelReason: '사유',
  refused: 0,
  canceled: 0,
  failed: 0,
  failedOrderUuids: [],
  remaining: 0,
  ...patch,
});

describe('cancelResultSummary — remaining > 0 또는 failed > 0이면 다시 처리', () => {
  it('다 처리했으면 개수만', () => {
    expect(cancelResultSummary(result({ refused: 2, canceled: 3 }))).toEqual({
      processed: '승인 대기 주문 2건을 거절하고, 승인된 주문 3건을 취소했어요.',
      leftover: null,
      needsRetry: false,
    });
  });

  it('처리한 주문이 없으면 그렇게', () => {
    expect(cancelResultSummary(result({})).processed).toBe('이번에 처리한 주문이 없어요.');
  });

  it.each([
    ['남은 주문(상한 초과)', { remaining: 40 }, 40],
    ['실패(remaining에 포함)', { failed: 2, remaining: 2 }, 2],
    ['실패만(remaining이 0이어도)', { failed: 1, remaining: 0 }, 1],
  ])('%s → 다시 처리', (_, patch, left) => {
    const s = cancelResultSummary(result({ refused: 1, ...patch }));
    expect(s.needsRetry).toBe(true);
    expect(s.leftover).toContain(`${left}건`);
  });
});
