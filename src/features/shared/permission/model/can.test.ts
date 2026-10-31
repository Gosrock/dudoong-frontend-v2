import { describe, expect, it } from 'vitest';

import type { HostRole } from '@/api/shared/common-schema';

import { can, HOST_ACTIONS, type HostAction } from './can';

type Row = [HostAction, guest: boolean, manager: boolean, master: boolean];

/** api-contract §2 권한표 그대로 */
const TABLE: Row[] = [
  ['viewManagement', true, true, true],
  ['viewGuests', true, true, true],
  ['viewRefundAccount', false, true, true],
  ['downloadExcel', false, true, true],
  ['checkIn', true, true, true],
  ['editEvent', false, true, true],
  ['editHost', false, true, true],
  ['manageMembers', false, true, true],
  ['manageManagers', false, false, true],
  ['manageOrders', false, true, true],
  ['changeMemberRole', false, false, true],
  ['transferMaster', false, false, true],
];

describe('권한 판정 can(role, action)', () => {
  it('표가 모든 동작을 다룬다', () => {
    expect(TABLE.map((r) => r[0]).sort()).toEqual(Object.keys(HOST_ACTIONS).sort());
  });

  it.each(TABLE)('%s — 일반 %s · 매니저 %s · 마스터 %s', (action, guest, manager, master) => {
    expect(can('GUEST', action)).toBe(guest);
    expect(can('MANAGER', action)).toBe(manager);
    expect(can('MASTER', action)).toBe(master);
  });

  it.each([
    ['비멤버(null)', null],
    ['역할 미확정(undefined)', undefined],
    ['모르는 역할(UNKNOWN)', 'UNKNOWN'],
  ] as const)('%s은 어떤 동작도 할 수 없다', (_, role) => {
    for (const action of Object.keys(HOST_ACTIONS) as HostAction[]) {
      expect(can(role as HostRole | null | undefined, action)).toBe(false);
    }
  });
});
