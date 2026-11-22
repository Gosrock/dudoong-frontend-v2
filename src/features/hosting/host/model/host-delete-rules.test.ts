import { describe, expect, it } from 'vitest';

import { deleteHostConfirmDescription, hostDeletionOf } from './host-delete-rules';

describe('호스트 삭제 영역(H-3 값 — #348 B73)', () => {
  const values = (deletable: boolean | null | undefined, preparingEventCount: number | null = 0) => ({
    deletable,
    preparingEventCount,
    deleteBlockedReason: deletable === false ? 'HOST_400_22' : null,
  });

  it.each([
    ['마스터 · 지울 수 있음 · 준비중 0', values(true, 0), true, { kind: 'ready', preparingEventCount: 0 }],
    ['마스터 · 준비중 2개', values(true, 2), true, { kind: 'ready', preparingEventCount: 2 }],
    ['마스터 · 등록한 공연 있음', values(false, 1), true, { kind: 'blocked' }],
    ['마스터가 아님(can false)', values(true, 0), false, { kind: 'hidden' }],
    ['값이 null(마스터가 아닌 응답)', values(null, null), true, { kind: 'hidden' }],
    ['필드 없음(2.5.15 이하)', values(undefined, null), true, { kind: 'hidden' }],
  ] as const)('%s', (_, host, allowed, expected) => {
    expect(hostDeletionOf(host, allowed)).toEqual(expected);
  });

  it('H-22가 HOST_400_22로 막히면 다시 읽기 전에도 막힘', () => {
    expect(hostDeletionOf(values(true, 0), true, true)).toEqual({ kind: 'blocked' });
  });

  it('확인 창 설명 — 0개 `1549:15221` · n개 `1551:104649`', () => {
    expect(deleteHostConfirmDescription(0)).toBe('삭제한 호스트는 되돌릴 수 없어요.');
    expect(deleteHostConfirmDescription(2)).toBe(
      '준비중 공연 2개도 함께 삭제돼요. 삭제한 호스트는 되돌릴 수 없어요.',
    );
  });
});
