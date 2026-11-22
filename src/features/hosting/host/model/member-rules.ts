import {
  type AssignableHostRole,
  HOST_MEMBERS_INVITE_MAX,
  type HostMember,
} from '@/api/host/schema';
import { type ActorRole, can, type HostAction } from '@/features/shared/permission/model/can';

/**
 * 멤버 관리(`/hosting/hosts/[hostId]/members`, GH-6 · H-16 · PH-10 · DH-11 · PH-12, plan P10b) 규칙.
 * 초대는 모두 H-16(가입한 이메일도 상대가 수락해야 멤버 — B71, #348 · DEC-042).
 * 역할 문자열을 직접 비교하지 않고 `can(role, action)`으로 판정한다(patterns §22). 버튼 숨김용이고 서버가 다시 막는다(patterns §11).
 * 서버 규칙(432cce4): `Host.validateCanManageRole`(MASTER 지정 불가 · 매니저는 GUEST만), `V2HostDomainService.removeMember`
 * (마스터 삭제 불가), `Host.changeActiveHostUserRole`(마스터 대상 불가), `Host.transferMaster`(활성 멤버에게만).
 */

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
  myRole: ActorRole | null | undefined,
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
 * 일반 멤버·비멤버는 초대할 수 없다(빈 배열). 마스터는 지정할 수 없다(양도로만). SUPER_ADMIN은 매니저처럼 "일반" 고정이다
 * (요청자 = 마스터 검사는 건너뛰지 않는다 — `can`의 `SUPER_ADMIN_BLOCKED`).
 */
export function inviteRoleOptions(myRole: ActorRole | null | undefined): AssignableHostRole[] {
  if (!can(myRole, 'manageMembers')) return [];
  return can(myRole, 'manageManagers') ? ['MANAGER', 'GUEST'] : ['GUEST'];
}

/** 초대 역할 기본값 "일반"(와이어 `503:32779`) */
export const DEFAULT_INVITE_ROLE: AssignableHostRole = 'GUEST';

/** 초대 한 줄. V는 한 줄만 그린다(GUI `1422:1911` — 한 명씩), L은 1~20줄을 다룬다(줄마다 H-16 — 묶음 API 없음, #348) */
export type InviteRow = { email: string; role: AssignableHostRole };

export const emptyInviteRow = (): InviteRow => ({ email: '', role: DEFAULT_INVITE_ROLE });

/** 한 번에 넣을 수 있는 줄 수 — H-16 발급 한도(호스트 24시간 20건)와 같다 */
export const canAddInviteRow = (rows: readonly InviteRow[]) =>
  rows.length < HOST_MEMBERS_INVITE_MAX;
export const canRemoveInviteRow = (rows: readonly InviteRow[]) => rows.length > 1;

/**
 * 이메일 모양 — 빈칸·`@` 없음 같은 명백한 실수만 거른다. 서버는 Bean Validation `@Email`(통과 못 하면 HTTP 400 `BAD_REQUEST` → 공용 토스트).
 * 가입하지 않은 이메일도 초대할 수 있다(H-16).
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+$/;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** 줄마다 칸 오류. 같은 요청 안의 같은 이메일(대소문자 무시 — 서버도 소문자로 저장)은 뒤 줄에 표시한다 */
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

/** H-16 본문 한 줄. 이메일 앞뒤 공백을 지운다(서버도 지운다). 칸 오류가 없을 때만 부른다 */
export const toInvitationBody = (row: InviteRow) => ({ email: row.email.trim(), role: row.role });

/**
 * 초대(H-16) 실패 중 그 줄에 사유를 다는 것(patterns §24 P10b). 그 밖(403 · 400 `BAD_REQUEST` · 5xx)은 공용 토스트.
 * - `HOST_400_15` 이미 멤버 — GUI `1476:6806` 문구
 * - `HOST_400_21` 발급 한도(호스트 24시간 20건) — GUI `1476:7242`는 "가입되지 않은 이메일이에요. 초대 링크를 보내야 하는데, …"였으나
 *   모든 초대가 링크(H-16)가 되어 앞 문장을 뺐다 🤖(되돌리려면 이 문구만)
 */
export const INVITE_ERROR_MESSAGE = {
  HOST_400_15: '이미 이 호스트의 멤버예요.',
  HOST_400_21: '오늘은 더 초대할 수 없어요 (최대 하루 20건). 나중에 다시 시도해 주세요.',
} as const;
export type InviteErrorCode = keyof typeof INVITE_ERROR_MESSAGE;

/** 멤버 관리(역할 변경·삭제·양도)에서 화면이 처리하는 코드(patterns §24 P10b, `handleError` 표). 그 밖은 공용 토스트 */
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
  /** 행이 묶은 동작 — 모두 할 수 있을 때만 가능(묶은 동작은 문턱이 같다) */
  actions: readonly HostAction[];
  notes?: Partial<Record<'GUEST' | 'MANAGER' | 'MASTER', string>>;
};

/**
 * 행 · 문구 · 순서는 GUI 권한 안내 시트(`1452:54461`, Design Sync #265 — 디자이너가 api-contract §2 표를 합치고 문구를 다듬음).
 * 칸의 가능 여부는 `can()`에서 만든다(표와 판정이 어긋나지 않게). "호스트 삭제"(`deleteHost` — H-22, #348)는 GUI 시트에 행이
 * 없어 넣지 않는다(시트가 근거 — 행이 생기면 여기에 `actions: ['deleteHost']`로).
 */
const GUIDE: GuideSource[] = [
  {
    label: '모든 관리 화면 보기\n(대시보드·예매자 관리 포함)',
    actions: ['viewManagement', 'viewGuests'],
    notes: { GUEST: '구매자 연락처·이메일·입금자명은 가린 값' },
  },
  { label: 'QR체크인, 셀프 체크인 QR띄우기, 체크인 통계', actions: ['checkIn'] },
  { label: '공연·티켓·옵션 만들기, 수정, 삭제', actions: ['editEvent'] },
  { label: '환불 계좌 전체 보기', actions: ['viewRefundAccount'] },
  { label: '예매자 관리 엑셀 다운로드', actions: ['downloadExcel'] },
  {
    label: '주문 승인·거절·승인 후 취소·환불 완료·입장 취소',
    actions: ['manageOrders', 'cancelEntrance'],
  },
  { label: '호스트 홈 설정', actions: ['editHost'] },
  { label: '멤버 추가·삭제', actions: ['manageMembers'], notes: { MANAGER: '일반만 가능' } },
  {
    label: '역할 변경(일반 ↔ 매니저), 마스터 양도',
    actions: ['changeMemberRole', 'transferMaster'],
  },
  { label: '공연 취소', actions: ['cancelEvent'] },
];

export const PERMISSION_GUIDE: readonly PermissionGuideRow[] = GUIDE.map((row) => {
  const cell = (role: 'GUEST' | 'MANAGER' | 'MASTER'): PermissionCell => ({
    allowed: row.actions.every((action) => can(role, action)),
    note: row.notes?.[role] ?? null,
  });
  return {
    label: row.label,
    GUEST: cell('GUEST'),
    MANAGER: cell('MANAGER'),
    MASTER: cell('MASTER'),
  };
});
