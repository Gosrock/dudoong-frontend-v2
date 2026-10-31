import {
  type AddHostMembersRequest,
  type AssignableHostRole,
  HOST_MEMBERS_INVITE_MAX,
  type HostMember,
} from '@/api/host/schema';
import type { HostRole } from '@/api/shared/common-schema';
import { can, type HostAction } from '@/features/shared/permission/model/can';

/**
 * 멤버 관리(`/hosting/hosts/[hostId]/members`, GH-6 · PH-7 · PH-10 · DH-11 · PH-12, plan P10b) 규칙.
 * 역할 문자열을 직접 비교하지 않고 `can(role, action)`으로 판정한다(patterns §22). 버튼 숨김용이고 서버가 다시 막는다(patterns §11).
 * 서버 규칙(432cce4): `Host.validateCanManageRole`(MASTER 지정 불가 · 매니저는 GUEST만), `V2HostDomainService.removeMember`
 * (마스터 삭제 불가), `Host.changeActiveHostUserRole`(마스터 대상 불가), `Host.transferMaster`(활성 멤버에게만).
 */

/** 역할 이름. 일반 멤버(`GUEST`)는 "일반"(plan P10b — 서버 표시 이름 "게스트"는 쓰지 않는다) */
export const HOST_ROLE_LABEL: Record<HostRole, string> = {
  MASTER: '마스터',
  MANAGER: '매니저',
  GUEST: '일반',
  UNKNOWN: '알 수 없음',
};

// ─── 행 메뉴 ─────────────────────────────────────────────────

export type MemberActions = {
  /** 역할 변경으로 바꿀 역할(일반 ↔ 매니저). 못 바꾸면 null */
  changeRoleTo: AssignableHostRole | null;
  /** 삭제할 수 있는지 */
  remove: boolean;
  /** 이 멤버에게 마스터를 넘길 수 있는지 */
  transfer: boolean;
};

const NONE: MemberActions = { changeRoleTo: null, remove: false, transfer: false };

/**
 * 내 역할(`myRole`)로 이 멤버 행에서 할 수 있는 일. **마스터 행에는 메뉴를 두지 않는다**(patterns §22). 모르는 역할(`UNKNOWN`)의
 * 행도 아무것도 하지 않는다. 내 행도 이 규칙으로 늘 비어 있다 — 마스터 행이거나(나 = 마스터), 매니저는 매니저를 못 지우고
 * 역할 변경은 마스터만, 일반 멤버는 권한이 없다(백엔드 `V2RemoveHostMemberUseCase` "본인 삭제는 늘 막힌다").
 */
export function memberActionsOf(
  myRole: HostRole | null | undefined,
  member: Pick<HostMember, 'role'>,
): MemberActions {
  const target = member.role;
  if (target === 'MASTER' || target === 'UNKNOWN') return NONE;
  return {
    changeRoleTo: can(myRole, 'changeMemberRole')
      ? target === 'GUEST'
        ? 'MANAGER'
        : 'GUEST'
      : null,
    remove: target === 'GUEST' ? can(myRole, 'manageMembers') : can(myRole, 'manageManagers'),
    transfer: can(myRole, 'transferMaster'),
  };
}

// ─── 초대(PH-7) ──────────────────────────────────────────────

/**
 * 초대할 때 고를 수 있는 역할. 마스터는 매니저·일반, **매니저는 "일반" 고정**(plan P10b, 서버 403 `HOST_400_11`).
 * 일반 멤버·비멤버는 초대할 수 없다(빈 배열). 마스터는 지정할 수 없다(양도로만).
 */
export function inviteRoleOptions(myRole: HostRole | null | undefined): AssignableHostRole[] {
  if (!can(myRole, 'manageMembers')) return [];
  return can(myRole, 'manageManagers') ? ['MANAGER', 'GUEST'] : ['GUEST'];
}

/** 초대 역할 기본값 "일반"(와이어 `503:32779`) */
export const DEFAULT_INVITE_ROLE: AssignableHostRole = 'GUEST';

/** 초대 한 줄. V는 한 줄만 그린다(와이어 `503:32779` — 한 명씩), L은 PH-7이 받는 1~20줄을 다룬다 */
export type InviteRow = { email: string; role: AssignableHostRole };

export const emptyInviteRow = (): InviteRow => ({ email: '', role: DEFAULT_INVITE_ROLE });

export const canAddInviteRow = (rows: readonly InviteRow[]) =>
  rows.length < HOST_MEMBERS_INVITE_MAX;
export const canRemoveInviteRow = (rows: readonly InviteRow[]) => rows.length > 1;

/**
 * 이메일 모양 — 빈칸·`@` 없음 같은 명백한 실수만 거른다. 서버는 Bean Validation `@Email`(통과 못 하면 HTTP 400 `BAD_REQUEST` → 전역 토스트)이고
 * 가입 여부는 서버만 안다(`HOST_400_13`).
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+$/;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** 줄마다 칸 오류. 같은 요청 안의 같은 이메일(대소문자 무시 — 서버 `HOST_400_14`와 같은 기준)은 뒤 줄에 표시한다 */
export function inviteRowErrors(rows: readonly InviteRow[]): (string | null)[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const email = row.email.trim();
    if (!email) return '이메일을 입력해 주세요';
    if (!EMAIL_SHAPE.test(email)) return '이메일 형식을 확인해 주세요';
    const key = normalizeEmail(email);
    if (seen.has(key)) return '같은 이메일을 두 번 넣었어요';
    seen.add(key);
    return null;
  });
}

/** 보내는 본문(PH-7). 이메일 앞뒤 공백을 지운다(서버도 지운다). 칸 오류가 없을 때만 부른다 */
export const toAddMembersBody = (rows: readonly InviteRow[]): AddHostMembersRequest => ({
  members: rows.map((r) => ({ email: r.email.trim(), role: r.role })),
});

/**
 * 초대 실패의 줄별 사유(patterns §24 P10b). 백엔드는 문제 이메일을 `reason` 끝 괄호에 `, `로 이어 붙인다
 * — `"가입되지 않은 이메일입니다. (a@x.com, b@y.com)"`(`HostErrorCode.toDetailException`, 432cce4). `HOST_400_14`의 이메일은 소문자다.
 * 검사 순서가 정해져 있어(중복 14 → 동명 계정 18 → 미가입 13 → 이미 멤버 15) 한 번에 한 사유만 온다.
 * 문구는 잠정(디자인 없음).
 */
export const INVITE_ERROR_MESSAGE = {
  HOST_400_13: '가입되지 않은 이메일이에요',
  HOST_400_14: '같은 이메일을 두 번 넣었어요',
  HOST_400_15: '이미 이 호스트의 멤버예요',
  HOST_400_18: '같은 이메일로 가입된 계정이 여러 개예요. 두둥에 문의해 주세요',
} as const;
export type InviteErrorCode = keyof typeof INVITE_ERROR_MESSAGE;

/** `reason` 끝 괄호 안의 이메일 목록. 모양이 다르면 빈 배열 */
export function inviteFailureEmails(reason: string): string[] {
  const match = /\(([^()]*)\)\s*$/.exec(reason);
  if (!match) return [];
  return match[1]!
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * 서버 실패 → 줄별 오류. 사유의 이메일과 같은 줄(대소문자·앞뒤 공백 무시)에 문구를 단다.
 * 어느 줄에도 맞지 않으면(사유 모양이 바뀐 경우 등) `form`에 문구를 둔다 — 실패가 소리 없이 묻히지 않게.
 */
export function inviteServerErrors(
  code: InviteErrorCode,
  reason: string,
  rows: readonly InviteRow[],
): { rows: (string | null)[]; form: string | null } {
  const emails = new Set(inviteFailureEmails(reason).map(normalizeEmail));
  const message = INVITE_ERROR_MESSAGE[code];
  const rowErrors = rows.map((r) => (emails.has(normalizeEmail(r.email)) ? message : null));
  return {
    rows: rowErrors,
    form: rowErrors.some((e) => e !== null) ? null : message,
  };
}

/** 멤버 관리(역할 변경·삭제·양도)에서 화면이 처리하는 코드(patterns §24 P10b). 그 밖은 전역 토스트 */
export const MEMBER_ACTION_ERROR_MESSAGE = {
  /** 이미 없는 멤버(다른 사람이 먼저 지움 등) — 멤버 목록을 다시 읽는다 */
  HOST_404_2: '이미 멤버가 아니에요. 목록을 새로 불러왔어요',
} as const;

// ─── 권한 가이드 표(`503:30950`) ─────────────────────────────

export type PermissionCell = { allowed: boolean; note: string | null };
export type PermissionGuideRow = {
  label: string;
  GUEST: PermissionCell;
  MANAGER: PermissionCell;
  MASTER: PermissionCell;
};

type GuideSource = {
  label: string;
  action: HostAction;
  notes?: Partial<Record<'GUEST' | 'MANAGER' | 'MASTER', string>>;
};

/**
 * api-contract §2 권한표의 행. 칸의 가능 여부는 `can()`에서 만든다(표와 판정이 어긋나지 않게).
 * Figma의 "호스트 삭제" 행은 서버에 없어 뺀다(plan P10b, patterns §22).
 */
const GUIDE: GuideSource[] = [
  {
    label: '관리 화면 조회(준비중 포함), 멤버·티켓·옵션 목록, 체크리스트',
    action: 'viewManagement',
    notes: { GUEST: '읽기 전용' },
  },
  {
    label: '대시보드, 주문·발급 티켓·환불 목록과 상세',
    action: 'viewGuests',
    notes: { GUEST: '구매자 연락처·이메일·입금자명은 가린 값' },
  },
  { label: '환불 계좌 전체 보기', action: 'viewRefundAccount' },
  { label: '엑셀 다운로드', action: 'downloadExcel' },
  { label: 'QR 체크인, 셀프 체크인 QR 띄우기, 체크인 통계', action: 'checkIn' },
  { label: '공연·티켓·옵션 쓰기, 호스트 설정·이미지', action: 'editHost' },
  { label: '멤버 추가·삭제', action: 'manageMembers', notes: { MANAGER: '일반 멤버만' } },
  { label: '주문 승인·거절·승인 후 취소·환불 완료', action: 'manageOrders' },
  { label: '역할 변경(일반 ↔ 매니저), 마스터 양도', action: 'changeMemberRole' },
];

export const PERMISSION_GUIDE: readonly PermissionGuideRow[] = GUIDE.map((row) => {
  const cell = (role: 'GUEST' | 'MANAGER' | 'MASTER'): PermissionCell => ({
    allowed: can(role, row.action),
    note: row.notes?.[role] ?? null,
  });
  return {
    label: row.label,
    GUEST: cell('GUEST'),
    MANAGER: cell('MANAGER'),
    MASTER: cell('MASTER'),
  };
});
