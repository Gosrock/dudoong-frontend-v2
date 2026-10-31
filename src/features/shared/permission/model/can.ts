import type { HostRole } from '@/api/shared/common-schema';

/**
 * 호스트 안에서 할 수 있는 일(api-contract §2 표의 행). 화면은 역할 문자열을 직접 비교하지 않고 `can(role, action)`만 쓴다
 * (patterns §22). 버튼 숨김용 편의이고 권한의 근거가 아니다 — 숨긴 버튼이 불려도 서버가 403으로 막는다(patterns §11).
 */
export const HOST_ACTIONS = {
  /** 관리 화면 조회(준비중 포함), 멤버·티켓·옵션 목록, 체크리스트 — 일반 멤버는 읽기 전용 */
  viewManagement: 'GUEST',
  /** 대시보드, 주문·발급 티켓·환불 목록과 상세 */
  viewGuests: 'GUEST',
  /** 환불 계좌 전체 보기(일반 멤버는 `null`) */
  viewRefundAccount: 'MANAGER',
  /** 엑셀 다운로드(GR-6·GI-3). 일반 멤버는 403 `HOST_400_1`(백엔드 #846 — api-contract §2, patterns §22) */
  downloadExcel: 'MANAGER',
  /** QR 체크인, 셀프 체크인 QR 띄우기, 체크인 통계 */
  checkIn: 'GUEST',
  /** 공연·티켓·옵션 쓰기(새 공연 만들기 포함) */
  editEvent: 'MANAGER',
  /** 호스트 설정·이미지 */
  editHost: 'MANAGER',
  /** 멤버 추가·삭제. 매니저는 일반 멤버만 다룬다 — 매니저를 추가·삭제하는 것은 `manageManagers` */
  manageMembers: 'MANAGER',
  /** 매니저 역할의 멤버를 추가·삭제(`Host.validateCanManageRole` — 마스터가 아니면 403 `HOST_400_11`, 432cce4) */
  manageManagers: 'MASTER',
  /** 주문 승인·거절·승인 후 취소·환불 완료 */
  manageOrders: 'MANAGER',
  /** 역할 변경(일반 ↔ 매니저) */
  changeMemberRole: 'MASTER',
  /** 마스터 양도 */
  transferMaster: 'MASTER',
} as const satisfies Record<string, Exclude<HostRole, 'UNKNOWN'>>;

export type HostAction = keyof typeof HOST_ACTIONS;

/**
 * 판정에 쓰는 역할 — 호스트 역할 + 멤버가 아닌 운영 계정(`SUPER_ADMIN`). 서버는 SUPER_ADMIN이면 호스트 권한 검사(G+/M+/MS)를
 * 건너뛰지만(`SuperAdminBypass`, #763) 응답에는 계정 역할이 없다(GM-1 `V2MeResponse`·JWT 모두 없음, fe423ed4) — 그래서 FE는
 * `superAdminOrRole`로만 이 값을 만든다(plan P10a, 사용자 결정 2026-10-31)
 */
export type ActorRole = HostRole | 'SUPER_ADMIN';

/**
 * SUPER_ADMIN이 권한 검사를 건너뛰어도 도메인 규칙에서 막히는 동작(fe423ed4):
 * - `manageManagers` — `Host.validateCanManageRole`이 요청자 = 마스터를 본다(`HOST_400_11`)
 * - `transferMaster` — `Host.transferMaster`가 요청자를 `validateMasterHostUser`로 다시 본다(403)
 * 역할 변경(`changeMemberRole`)은 요청자를 다시 보지 않아(`changeActiveHostUserRole`) 된다
 */
const SUPER_ADMIN_BLOCKED: ReadonlySet<HostAction> = new Set(['manageManagers', 'transferMaster']);

const RANK: Record<HostRole, number> = { GUEST: 1, MANAGER: 2, MASTER: 3, UNKNOWN: 0 };

/**
 * `role`(GH-3 `myRole` 등)이 `action`을 할 수 있는지. 멤버가 아니면(`null`·`undefined`) 아무것도 못 한다.
 * 모르는 역할(`UNKNOWN`)도 아무것도 못 한다 — 서버가 역할을 늘려도 버튼이 잘못 열리지 않게.
 * `SUPER_ADMIN`은 `SUPER_ADMIN_BLOCKED` 밖의 모든 동작을 할 수 있다.
 */
export function can(role: ActorRole | null | undefined, action: HostAction): boolean {
  if (!role) return false;
  if (role === 'SUPER_ADMIN') return !SUPER_ADMIN_BLOCKED.has(action);
  return RANK[role] > 0 && RANK[role] >= RANK[HOST_ACTIONS[action]];
}

/**
 * **일반 멤버 이상(G+) 권한 검사를 통과한 조회**의 `myRole` → 판정 역할. `myRole`이 null이면 SUPER_ADMIN이다.
 * 근거(fe423ed4): G+ 검사(`HostQualification.GUEST` → `Host.validateActiveHostUser`)는 활성 멤버가 아니면 403이고, 건너뛰는 길은
 * `SuperAdminBypass`(계정 역할 SUPER_ADMIN) 하나뿐이다. `myRole`은 `Host.getActiveRoleOf`(활성 멤버가 아니면 null)라
 * "G+ 조회 성공 + `myRole: null`"은 SUPER_ADMIN만 만든다. 공개 조회(GH-3 viewer 등 — 비멤버도 200 + null)에는 쓰지 않는다
 */
export const superAdminOrRole = (guardedMyRole: HostRole | null): ActorRole =>
  guardedMyRole ?? 'SUPER_ADMIN';
