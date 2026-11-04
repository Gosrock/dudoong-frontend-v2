import { describe, expect, it } from 'vitest';

import {
  canCancelInvitation,
  canCreateInvitation,
  invitationRowsOf,
  inviteUrlOf,
} from './invitation-rules';

describe('초대 링크 주소(H-16 inviteUrlPath + 지금 출처)', () => {
  const origin = 'https://dudoong.com';
  it('경로가 /host-invitations/{토큰} 하나면 그대로 붙인다', () => {
    expect(
      inviteUrlOf({ inviteUrlPath: '/host-invitations/aB3_x-Y', token: 'aB3_x-Y' }, origin),
    ).toBe('https://dudoong.com/host-invitations/aB3_x-Y');
  });
  it.each([
    '//evil.example/x',
    '/host-invitations/a/../../x',
    'https://evil.example/host-invitations/t',
    '',
  ])('모양이 다르면(%s) 토큰으로 경로를 만든다', (inviteUrlPath) => {
    expect(inviteUrlOf({ inviteUrlPath, token: 'tok_1' }, origin)).toBe(
      'https://dudoong.com/host-invitations/tok_1',
    );
  });
});

describe('초대 권한(can) — 매니저는 일반 초대만', () => {
  it.each([
    ['MASTER', 'MANAGER', true],
    ['MASTER', 'GUEST', true],
    ['MANAGER', 'MANAGER', false],
    ['MANAGER', 'GUEST', true],
    ['GUEST', 'GUEST', false],
    ['SUPER_ADMIN', 'MANAGER', false],
    ['SUPER_ADMIN', 'GUEST', true],
  ] as const)('%s가 %s 초대 → %s', (me, role, allowed) => {
    expect(canCreateInvitation(me, role)).toBe(allowed);
    expect(canCancelInvitation(me, role)).toBe(allowed);
  });

  it('대기 줄 — 역할 이름 · 취소 가능', () => {
    expect(
      invitationRowsOf(
        [
          { invitationId: 1, email: 'a@x.com', role: 'GUEST', expiresAt: '2026.11.11 12:00' },
          { invitationId: 2, email: 'b@x.com', role: 'MANAGER', expiresAt: '2026.11.11 12:00' },
        ],
        'MANAGER',
      ).map((r) => [r.invitationId, r.roleLabel, r.cancelable]),
    ).toEqual([
      [1, '일반', true],
      [2, '매니저', false],
    ]);
  });
});
