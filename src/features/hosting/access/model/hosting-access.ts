import { isForbidden, isNotFound, isSessionLost } from '@/api/errors';
import { type ActorRole, can } from '@/features/shared/permission/model/can';

/**
 * 호스팅 센터 하위 화면(`/hosting/hosts/[hostId]/…` P10b, `/hosting/events/[eventId]/…` P11)의 접근 판정(plan P10a
 * "비멤버 403 판정"). 화면은 이 판정 하나로 공용 403·404 안내(`HostingAccessRejected`)를 고른다.
 *
 * 두 갈래로 들어온다.
 * - **조회 에러**: 멤버 전용 API(GE-3·GE-7·GH-6 등)는 비멤버에게 HTTP 403(code는 `HOST_400_*` 그대로 — 상태로 분기,
 *   api-contract §1). 없는·남의·지운 공연은 404(존재를 숨긴다)
 * - **역할**: 공개 GH-3 viewer(`myRole`)는 비멤버에게도 200 + `myRole: null`이다 — 그래서 호스트 화면은 G+ 조회(GH-6)를 함께 읽고,
 *   그것이 성공했는데 `myRole`이 null이면 SUPER_ADMIN으로 본다(`superAdminOrRole`, 사용자 결정 2026-10-31). 판정은
 *   `can(role, 'viewManagement')` 한 곳(patterns §22, 모르는 역할 `UNKNOWN`·`null`은 막힌다)
 */
export type HostingAccess = 'forbidden' | 'notFound' | 'error';

/** 경계가 받은 조회 에러 → 판정. 세션 상실은 여기 오지 않는다(경계가 거른다 — 와도 `error`로 둔다) */
export function hostingAccessOfError(error: unknown): HostingAccess {
  if (isSessionLost(error)) return 'error';
  if (isForbidden(error)) return 'forbidden';
  if (isNotFound(error)) return 'notFound';
  return 'error';
}

/** 판정 역할 → 관리 화면을 열 수 있는지. 비멤버(`null`)·모르는 역할이면 403, SUPER_ADMIN은 연다 */
export const hostingAccessOfRole = (role: ActorRole | null | undefined): 'ok' | 'forbidden' =>
  can(role, 'viewManagement') ? 'ok' : 'forbidden';

/** 403·404 안내의 돌아갈 곳 — 공연준비 홈 */
export const HOSTING_ACCESS_BACK = { href: '/hosting', label: '공연준비 홈으로' } as const;
