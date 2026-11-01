import { describe, expect, it } from 'vitest';

import { AddHostMembersRequestSchema, type HostMember } from '@/api/host/schema';
import type { HostRole } from '@/api/shared/common-schema';

import {
  canAddInviteRow,
  canRemoveInviteRow,
  emptyInviteRow,
  inviteFailureEmails,
  inviteRoleOptions,
  type InviteRow,
  inviteRowErrors,
  inviteServerErrors,
  memberActionsOf,
  PERMISSION_GUIDE,
  toAddMembersBody,
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

  it('본문은 앞뒤 공백을 지우고 요청 스키마를 통과한다', () => {
    const body = toAddMembersBody([
      { email: ' guitar@example.com ', role: 'MANAGER' },
      { email: 'vocal@example.com', role: 'GUEST' },
    ]);
    expect(body).toEqual({
      members: [
        { email: 'guitar@example.com', role: 'MANAGER' },
        { email: 'vocal@example.com', role: 'GUEST' },
      ],
    });
    expect(AddHostMembersRequestSchema.parse(body)).toEqual(body);
  });
});

describe('초대 실패 → 줄 매핑(HOST_400_13·14·15·18, reason 끝 괄호의 이메일)', () => {
  it.each([
    ['가입되지 않은 이메일입니다. (a@x.com, b@y.com)', ['a@x.com', 'b@y.com']],
    ['중복된 이메일이 있습니다. (a@x.com)', ['a@x.com']],
    ['가입되지 않은 이메일입니다.', []],
    ['', []],
  ])('%j → %o', (reason, emails) => {
    expect(inviteFailureEmails(reason)).toEqual(emails);
  });

  const sent: InviteRow[] = [
    { email: 'Guitar@Example.com', role: 'GUEST' },
    { email: 'nobody@example.com', role: 'GUEST' },
    { email: 'drum@example.com', role: 'GUEST' },
  ];

  it.each([
    [
      'HOST_400_13',
      '가입되지 않은 이메일입니다. (nobody@example.com)',
      [
        null,
        '가입되지 않은 이메일이에요. 상대가 두둥에 가입한 뒤 그 카카오 계정 이메일로 다시 초대해 주세요',
        null,
      ],
    ],
    [
      'HOST_400_15',
      '이미 호스트 멤버인 이메일입니다. (drum@example.com)',
      [null, null, '이미 이 호스트의 멤버예요'],
    ],
    // 중복 이메일은 서버가 소문자로 준다 — 대소문자를 무시하고 맞춘다
    [
      'HOST_400_14',
      '중복된 이메일이 있습니다. (guitar@example.com)',
      ['같은 이메일을 두 번 넣었어요', null, null],
    ],
    [
      'HOST_400_18',
      '같은 이메일로 가입된 계정이 여러 개입니다. (nobody@example.com)',
      [null, '같은 이메일로 가입된 계정이 여러 개예요. 두둥에 문의해 주세요', null],
    ],
  ] as const)('%s → 해당 줄에만 사유', (code, reason, rowErrors) => {
    expect(inviteServerErrors(code, reason, sent)).toEqual({ rows: rowErrors, form: null });
  });

  it('어느 줄에도 맞지 않으면(사유 모양이 바뀜) 폼 오류로 — 실패가 묻히지 않는다', () => {
    expect(inviteServerErrors('HOST_400_13', '가입되지 않은 이메일입니다.', sent)).toEqual({
      rows: [null, null, null],
      form: '가입되지 않은 이메일이에요. 상대가 두둥에 가입한 뒤 그 카카오 계정 이메일로 다시 초대해 주세요',
    });
  });
});

describe('권한 가이드 표(api-contract §2, "호스트 삭제" 행 없음)', () => {
  /** api-contract §2 표 그대로 — [일반, 매니저, 마스터] */
  const CONTRACT: [label: string, guest: boolean, manager: boolean, master: boolean][] = [
    ['관리 화면 조회(준비중 포함), 멤버·티켓·옵션 목록, 체크리스트', true, true, true],
    ['대시보드, 주문·발급 티켓·환불 목록과 상세', true, true, true],
    ['환불 계좌 전체 보기', false, true, true],
    ['엑셀 다운로드', false, true, true],
    ['QR 체크인, 셀프 체크인 QR 띄우기, 체크인 통계', true, true, true],
    ['공연·티켓·옵션 쓰기, 호스트 설정·이미지', false, true, true],
    ['멤버 추가·삭제', false, true, true],
    ['주문 승인·거절·승인 후 취소·환불 완료', false, true, true],
    ['역할 변경(일반 ↔ 매니저), 마스터 양도', false, false, true],
  ];

  it('행과 칸이 계약 표와 같다(판정은 can()에서 만든다)', () => {
    expect(
      PERMISSION_GUIDE.map((r) => [r.label, r.GUEST.allowed, r.MANAGER.allowed, r.MASTER.allowed]),
    ).toEqual(CONTRACT);
  });

  it('"호스트 삭제" 행이 없다', () => {
    expect(PERMISSION_GUIDE.some((r) => r.label.includes('호스트 삭제'))).toBe(false);
  });

  it('제한 메모 — 일반 읽기 전용·가린 값, 매니저 일반 멤버만', () => {
    expect(PERMISSION_GUIDE[0]!.GUEST.note).toBe('읽기 전용');
    expect(PERMISSION_GUIDE[1]!.GUEST.note).toBe('구매자 연락처·이메일·입금자명은 가린 값');
    expect(PERMISSION_GUIDE[6]!.MANAGER.note).toBe('일반 멤버만');
  });
});
