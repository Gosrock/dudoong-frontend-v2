import { describe, expect, it } from 'vitest';

import type { HostMember } from '@/api/host/schema';
import { CreateHostInvitationRequestSchema } from '@/api/host-invitation/schema';
import type { HostRole } from '@/api/shared/common-schema';

import {
  canAddInviteRow,
  canRemoveInviteRow,
  emptyInviteRow,
  INVITE_ERROR_MESSAGE,
  inviteRoleOptions,
  type InviteRow,
  inviteRowErrors,
  memberActionsOf,
  PERMISSION_GUIDE,
  toInvitationBody,
} from './member-rules';

const member = (role: HostRole): Pick<HostMember, 'role'> => ({ role });

describe('행 메뉴 — 마스터·매니저·일반 3시점(api-contract §2, patterns §22)', () => {
  type Row = [
    viewer: HostRole | null,
    target: HostRole,
    expected: ReturnType<typeof memberActionsOf>,
  ];
  const none = { changeRoleTo: null, remove: false, transfer: false };
  const TABLE: Row[] = [
    // 마스터 시점 — 일반·매니저 모두 역할 변경·삭제·양도, 마스터 행(나)은 메뉴 없음
    ['MASTER', 'GUEST', { changeRoleTo: 'MANAGER', remove: true, transfer: true }],
    ['MASTER', 'MANAGER', { changeRoleTo: 'GUEST', remove: true, transfer: true }],
    ['MASTER', 'MASTER', none],
    // 매니저 시점 — 일반 멤버 삭제만. 매니저(나 포함)·마스터 행은 메뉴 없음
    ['MANAGER', 'GUEST', { changeRoleTo: null, remove: true, transfer: false }],
    ['MANAGER', 'MANAGER', none],
    ['MANAGER', 'MASTER', none],
    // 일반 시점 — 목록만
    ['GUEST', 'GUEST', none],
    ['GUEST', 'MANAGER', none],
    ['GUEST', 'MASTER', none],
    // 비멤버·모르는 역할 — 아무것도
    [null, 'GUEST', none],
    ['UNKNOWN', 'GUEST', none],
    // 모르는 역할의 행은 마스터도 손대지 않는다
    ['MASTER', 'UNKNOWN', none],
  ];
  it.each(TABLE)('내 역할 %s → %s 행: %o', (viewer, target, expected) => {
    expect(memberActionsOf(viewer, member(target))).toEqual(expected);
  });
});

describe('초대 역할 — 매니저는 "일반" 고정', () => {
  it.each([
    ['MASTER', ['MANAGER', 'GUEST']],
    ['MANAGER', ['GUEST']],
    ['GUEST', []],
    [null, []],
    ['UNKNOWN', []],
  ] as const)('%s → %o', (role, options) => {
    expect(inviteRoleOptions(role)).toEqual(options);
  });

  it('기본 역할은 일반', () => {
    expect(emptyInviteRow()).toEqual({ email: '', role: 'GUEST' });
  });
});

describe('초대 줄 — 칸 오류와 본문(PH-7 1~20명)', () => {
  const rows = (...emails: string[]): InviteRow[] =>
    emails.map((email) => ({ email, role: 'GUEST' }));

  it.each([
    ['', '이메일을 입력해 주세요'],
    ['   ', '이메일을 입력해 주세요'],
    ['guitar', '이메일 형식을 확인해 주세요'],
    ['guitar@ example.com', '이메일 형식을 확인해 주세요'],
    [' guitar@example.com ', null],
  ])('%j → %j', (email, error) => {
    expect(inviteRowErrors(rows(email))).toEqual([error]);
  });

  it('같은 이메일(대소문자·공백 무시)은 뒤 줄에 표시한다 — 서버 HOST_400_14와 같은 기준', () => {
    expect(inviteRowErrors(rows('a@x.com', 'b@x.com', ' A@X.com'))).toEqual([
      null,
      null,
      '같은 이메일을 두 번 넣었어요',
    ]);
  });

  it('1줄이면 지울 수 없고 20줄이면 더할 수 없다', () => {
    expect(canRemoveInviteRow(rows('a@x.com'))).toBe(false);
    expect(canAddInviteRow(rows(...Array.from({ length: 19 }, (_, i) => `${i}@x.com`)))).toBe(true);
    expect(canAddInviteRow(rows(...Array.from({ length: 20 }, (_, i) => `${i}@x.com`)))).toBe(
      false,
    );
  });

  it('줄마다 H-16 본문 — 앞뒤 공백을 지우고 요청 스키마를 통과한다', () => {
    const rows = [
      { email: ' guitar@example.com ', role: 'MANAGER' as const },
      { email: 'vocal@example.com', role: 'GUEST' as const },
    ];
    const bodies = rows.map(toInvitationBody);
    expect(bodies).toEqual([
      { email: 'guitar@example.com', role: 'MANAGER' },
      { email: 'vocal@example.com', role: 'GUEST' },
    ]);
    bodies.forEach((body) => expect(CreateHostInvitationRequestSchema.parse(body)).toEqual(body));
  });
});

describe('초대 실패 문구(H-16 — #348 B71)', () => {
  it('화면이 줄에 다는 코드는 이미 멤버 · 발급 한도 둘뿐 — PH-7 코드(13 · 14 · 18)는 더 오지 않는다', () => {
    expect(INVITE_ERROR_MESSAGE).toEqual({
      HOST_400_15: '이미 이 호스트의 멤버예요.',
      HOST_400_21: '오늘은 더 초대할 수 없어요 (최대 하루 20건). 나중에 다시 시도해 주세요.',
    });
  });
});

describe('권한 가이드 표(api-contract §2, "호스트 삭제" 행 없음)', () => {
  /** GUI 권한 안내 시트 `1452:54461`(#265)의 행 — [일반, 매니저, 마스터]. 칸은 api-contract §2 표(can())와 같아야 한다 */
  const CONTRACT: [label: string, guest: boolean, manager: boolean, master: boolean][] = [
    ['모든 관리 화면 보기\n(대시보드·예매자 관리 포함)', true, true, true],
    ['QR체크인, 셀프 체크인 QR띄우기, 체크인 통계', true, true, true],
    ['공연·티켓·옵션 만들기, 수정, 삭제', false, true, true],
    ['환불 계좌 전체 보기', false, true, true],
    ['예매자 관리 엑셀 다운로드', false, true, true],
    ['주문 승인·거절·승인 후 취소·환불 완료·입장 취소', false, true, true],
    ['호스트 홈 설정', false, true, true],
    ['멤버 추가·삭제', false, true, true],
    ['역할 변경(일반 ↔ 매니저), 마스터 양도', false, false, true],
    ['공연 취소', false, false, true],
  ];

  it('행과 칸이 계약 표와 같다(판정은 can()에서 만든다)', () => {
    expect(
      PERMISSION_GUIDE.map((r) => [r.label, r.GUEST.allowed, r.MANAGER.allowed, r.MASTER.allowed]),
    ).toEqual(CONTRACT);
  });

  it('"호스트 삭제" 행이 없다', () => {
    expect(PERMISSION_GUIDE.some((r) => r.label.includes('호스트 삭제'))).toBe(false);
  });

  it('제한 메모 — 일반 가린 값, 매니저 일반만', () => {
    expect(PERMISSION_GUIDE[0]!.GUEST.note).toBe('구매자 연락처·이메일·입금자명은 가린 값');
    expect(PERMISSION_GUIDE[7]!.MANAGER.note).toBe('일반만 가능');
  });
});
