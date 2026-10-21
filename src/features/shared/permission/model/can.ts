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
  /** 엑셀 다운로드(#758 예정: 매니저 이상) */
  downloadExcel: 'GUEST',
  /** QR 체크인, 셀프 체크인 QR 띄우기, 체크인 통계 */
  checkIn: 'GUEST',
  /** 공연·티켓·옵션 쓰기(새 공연 만들기 포함) */
  editEvent: 'MANAGER',
  /** 호스트 설정·이미지 */
  editHost: 'MANAGER',
  /** 멤버 추가·삭제(매니저는 일반 멤버만 — 대상 제한은 P10b) */
  manageMembers: 'MANAGER',
  /** 주문 승인·거절·승인 후 취소·환불 완료 */
  manageOrders: 'MANAGER',
  /** 역할 변경(일반 ↔ 매니저) */
  changeMemberRole: 'MASTER',
  /** 마스터 양도 */
  transferMaster: 'MASTER',
} as const satisfies Record<string, Exclude<HostRole, 'UNKNOWN'>>;

export type HostAction = keyof typeof HOST_ACTIONS;

const RANK: Record<HostRole, number> = { GUEST: 1, MANAGER: 2, MASTER: 3, UNKNOWN: 0 };

/**
 * `role`(GH-3 `myRole` 등)이 `action`을 할 수 있는지. 멤버가 아니면(`null`·`undefined`) 아무것도 못 한다.
 * 모르는 역할(`UNKNOWN`)도 아무것도 못 한다 — 서버가 역할을 늘려도 버튼이 잘못 열리지 않게.
 */
export function can(role: HostRole | null | undefined, action: HostAction): boolean {
  if (!role) return false;
  return RANK[role] > 0 && RANK[role] >= RANK[HOST_ACTIONS[action]];
}
