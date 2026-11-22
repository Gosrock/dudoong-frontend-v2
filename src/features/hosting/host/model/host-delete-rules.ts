import type { HostViewer } from '@/api/host/schema';

/**
 * 호스트 삭제(H-22 — Api 2.5.16, #348 B73) 규칙. 화면 동작은 없다.
 * GH-3 · PH-4 응답의 `preparingEventCount` · `deletable` · `deleteBlockedReason`은 **활성 마스터에게만 값**이 있고 그 밖에는 null이다.
 */

export type HostDeletion =
  /** 마스터가 아니거나 서버가 값을 주지 않음(2.5.15 이하) — 영역을 그리지 않는다 */
  | { kind: 'hidden' }
  /** 준비중이 아닌 공연이 있어 막힘(`HOST_400_22`) — 버튼을 막고 사유 */
  | { kind: 'blocked' }
  /** 지울 수 있음. 함께 지워질 준비중 공연 수 — 0이면 기본 확인 창(`1549:15221`), 1 이상이면 n개 안내(`1551:104649`) */
  | { kind: 'ready'; preparingEventCount: number };

/** 막힌 사유 — 서버 `HOST_400_22` "등록한 공연이 있는 호스트는 삭제할 수 없습니다."를 화면 말투로 🤖(GUI에 막힌 상태가 없다) */
export const DELETE_HOST_BLOCKED_MESSAGE = '등록한 공연이 있는 호스트는 삭제할 수 없어요.';

/**
 * 영역 상태. `allowed`는 `can(role, 'deleteHost')`. `raceBlocked`는 H-22가 `HOST_400_22`로 막혀 다시 읽는 중인지 —
 * 다시 읽은 값이 오기 전에도 막힌 상태를 보인다
 */
export function hostDeletionOf(
  host: Pick<HostViewer, 'preparingEventCount' | 'deletable' | 'deleteBlockedReason'>,
  allowed: boolean,
  raceBlocked = false,
): HostDeletion {
  if (!allowed || host.deletable === null || host.deletable === undefined)
    return { kind: 'hidden' };
  if (!host.deletable || raceBlocked) return { kind: 'blocked' };
  return { kind: 'ready', preparingEventCount: host.preparingEventCount ?? 0 };
}

/**
 * 확인 창 설명 — 0개 `1549:15221`, 1개 이상 모바일 `1551:104649` 순서("준비중 공연 n개도 함께 삭제돼요. 삭제한 호스트는 …").
 * PC `1556:15836`은 두 문장 순서가 반대지만 같은 DOM이라 모바일 순서 하나로 둔다 🤖
 */
export function deleteHostConfirmDescription(preparingEventCount: number) {
  const irreversible = '삭제한 호스트는 되돌릴 수 없어요.';
  return preparingEventCount > 0
    ? `준비중 공연 ${preparingEventCount}개도 함께 삭제돼요. ${irreversible}`
    : irreversible;
}
