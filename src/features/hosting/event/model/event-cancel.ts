import {
  EVENT_CANCEL_REASON_MAX,
  type EventCancelResult,
  type EventManage,
  isEventCanceled,
} from '@/api/event/schema';
import { type ActorRole, can } from '@/features/shared/permission/model/can';

/*
 * 공연 취소 E-11(Api 2.5.8 — 백엔드 #932, 이슈 #136 §7) 규칙. 상태(`status`)는 OPEN 그대로이고 `canceledAt`이 있으면 취소된 공연이다.
 * 화면 모양은 V(`EventCancelSection`), 요청 · 캐시는 `useEventCancel`.
 */

/**
 * [공연 취소]를 보일지 — 마스터(`can(role, 'cancelEvent')`) + 등록(OPEN) + 시작 전(`displayStatus` UPCOMING — 서버가 계산한 값, 렌더 중
 * 시각을 읽지 않는다) + 아직 취소 안 됨. 준비중은 삭제(DE-9, 공연준비 홈 카드 ⋮)를 쓴다(`Event_400_28`).
 * 버튼 숨김은 편의이고 권한의 근거는 서버다(403 `HOST_400_4`, patterns §22)
 */
export function canCancelEvent(
  event: Pick<EventManage, 'status' | 'displayStatus' | 'canceledAt'>,
  role: ActorRole | null,
): boolean {
  return (
    can(role, 'cancelEvent') &&
    event.status === 'OPEN' &&
    event.displayStatus === 'UPCOMING' &&
    !isEventCanceled(event)
  );
}

/**
 * 취소된 공연의 남은 주문을 마스터에게 어떻게 보일지(Api 2.5.9 GE-3 `cancelRemainingCount` · `cancelRetryable` — 백엔드 #940 B44).
 * - `retry`: [주문 처리하기](옛 [남은 주문 다시 처리]) — 서버가 "다시 부르면 통과(`true`) + 남은 주문 > 0"이라고 할 때만
 * - `contact`: 다시 불러도 `Event_400_29`(`false`) + 남은 주문 > 0 → 버튼 대신 고객센터 안내(운영자가 따로 처리)
 * - `none`: 남은 주문 0
 * - `unknown`: 서버 값이 없다(운영 2.5.3 · 취소 직후 GE-3을 다시 읽기 전) — 화면이 이 결과로 판단한다(`useEventCancel`)
 */
export type CancelRemainingState =
  | { kind: 'retry'; count: number }
  | { kind: 'contact'; count: number }
  | { kind: 'none' }
  | { kind: 'unknown' };

export function cancelRemainingState(
  event: Pick<EventManage, 'cancelRemainingCount' | 'cancelRetryable'>,
): CancelRemainingState {
  const count = event.cancelRemainingCount;
  const retryable = event.cancelRetryable;
  if (typeof count !== 'number' || typeof retryable !== 'boolean') return { kind: 'unknown' };
  if (count <= 0) return { kind: 'none' };
  return retryable ? { kind: 'retry', count } : { kind: 'contact', count };
}

/**
 * 다시 처리할 수 없는 남은 주문 안내 — GUI `대시보드_취소된 공연_처리 불가_고객센터_데스크탑1440`(`1912:4037`, Design Sync #332)
 * 문구 "처리하지 못한 주문이 n건 있어요. 두둥 고객센터에 문의해 주세요." + [문의하기]
 */
export const cancelContactMessage = (count: number) =>
  `처리하지 못한 주문이 ${count}건 있어요. 두둥 고객센터에 문의해 주세요.`;

/** 남은 주문 안내(다시 처리 가능) — GUI `1912:3661` "처리하지 못한 주문이 n건 있어요." + [주문 처리하기]. 수를 모르면(운영 2.5.3) 수 없이 */
export const cancelLeftoverMessage = (count: number | null) =>
  count === null
    ? '처리하지 못한 주문이 있을 수 있어요.'
    : `처리하지 못한 주문이 ${count}건 있어요.`;

/** [공연 취소하기] 옆 안내 — GUI `공연 취소` 자리(`1912:3126` · `1913:37061`, Design Sync #326 · #332) 문구 그대로 */
export const CANCEL_SECTION_NOTICE =
  '시작 전 공연만 취소할 수 있어요. 취소하면 남은 주문이 모두 거절·취소되고, 결제한 주문은 환불 요청이 생겨요.';

/**
 * 취소 확인 창 안내 — GUI `대시보드_공연 취소 확인_체크 전`(`1912:3581` · `1912:4413`) "남은 주문 12건이 모두 거절·취소되고, 결제한 주문
 * 8건은 환불 요청이 생겨요. 취소하면 다시 되돌릴 수 없어요." 수는 대시보드 통계(GD-1)로 — 남은 주문 = 승인 대기 + 승인 완료, 결제한 주문 =
 * 승인 완료(🤖 Claude 판단 2026-11-22 — 무료 승인 주문도 "결제한 주문"에 센다. 서버가 환불 요청을 만드는 정확한 수는 취소 결과로만 안다).
 * 통계가 없으면 수 없이 이슈 #136 §7 문구
 */
export function cancelConfirmNotice(
  orders: { pendingApprove: number; approved: number } | null,
): string {
  const tail = '취소하면 다시 되돌릴 수 없어요.';
  if (!orders) {
    return `남은 주문이 모두 거절·취소되고, 결제한 주문은 환불 요청이 생겨요. ${tail}`;
  }
  const left = orders.pendingApprove + orders.approved;
  if (left === 0) return `처리할 주문은 없어요. ${tail}`;
  // 승인 완료 주문이 없으면 승인 대기 주문을 거절할 뿐이다
  if (orders.approved === 0) return `남은 주문 ${left}건이 모두 거절돼요. ${tail}`;
  return `남은 주문 ${left}건이 모두 거절·취소되고, 결제한 주문 ${orders.approved}건은 환불 요청이 생겨요. ${tail}`;
}

/** 확인 체크(GUI `확인 체크`) — 체크해야 [취소하기]를 누를 수 있다 */
export const CANCEL_CONFIRM_CHECK = '남은 주문이 모두 취소되고 환불 요청이 생기는 걸 확인했어요.';

/** 사유 칸 안내(placeholder — GUI `글자수 포함 input` "취소 사유는 관객에게도 보여요.") */
export const CANCEL_REASON_PLACEHOLDER = '취소 사유는 관객에게도 보여요.';

/** 사유 검사(`Event_400_31`과 같은 규칙 — 앞뒤 공백 제외 1~100자). 통과하면 null */
export function cancelReasonError(reason: string): string | null {
  const trimmed = reason.trim();
  if (trimmed.length === 0) return '취소 사유를 입력해 주세요.';
  if (trimmed.length > EVENT_CANCEL_REASON_MAX) {
    return `취소 사유는 ${EVENT_CANCEL_REASON_MAX}자까지 입력할 수 있어요.`;
  }
  return null;
}

/** 화면이 처리하는 E-11 코드 → 문구(서버 `reason`은 쓰지 않는다 — patterns §11) */
export const CANCEL_EVENT_ERROR_MESSAGE = {
  /** 준비중 공연 — 취소 대신 삭제 */
  Event_400_28: '준비중인 공연은 취소 대신 공연준비 홈에서 삭제해 주세요.',
  /** 시작했거나 정산중 · 지난 공연 */
  Event_400_29: '이미 시작했거나 끝난 공연은 취소할 수 없어요.',
  /** 사유 형식 — 칸 오류로 */
  Event_400_31: '취소 사유는 1~100자로 입력해 주세요.',
} as const;
export type CancelEventErrorCode = keyof typeof CANCEL_EVENT_ERROR_MESSAGE;

/** 마스터가 아님(403 `HOST_400_4` — 그사이 역할이 바뀜) */
export const CANCEL_EVENT_FORBIDDEN_MESSAGE = '공연 취소는 호스트 마스터만 할 수 있어요.';
/** E-11이 없다(404 — 운영 2.5.3, 컷오버 전) */
export const CANCEL_EVENT_UNSUPPORTED_MESSAGE =
  '지금은 공연을 취소할 수 없어요. 잠시 후 다시 시도해 주세요.';
/** 응답을 받지 못함(TIMEOUT · NETWORK) — 서버가 처리했을 수 있다. 같은 API가 멱등이라 [다시 처리]로 이어 간다 */
export const CANCEL_EVENT_UNCERTAIN_MESSAGE =
  '처리 결과를 확인하지 못했어요. [주문 처리하기]를 누르면 남은 주문만 이어서 처리해요.';

/** 취소한 뒤 토스트 */
export const CANCEL_EVENT_DONE_TOAST = '공연을 취소했어요.';

/**
 * 한 번 처리한 결과의 안내 — GUI `1912:3661` "주문 12건을 거절·취소했고, 환불 요청 8건이 생겼어요." + 남은 주문이 있으면
 * "처리하지 못한 주문이 n건 있어요."(→ [주문 처리하기]). 환불 요청 수 = 이번에 취소한 승인 주문 수(`canceled` — 🤖 무료 승인 주문도
 * 센다). `needsRetry` = `remaining > 0 || failed > 0`(이슈 #136 §7 — 같은 API를 다시 부르면 남은 주문만 처리한다)
 */
export function cancelResultSummary(result: EventCancelResult): {
  processed: string;
  /** 남은 주문 수(다시 처리할 것이 없으면 null) */
  leftCount: number | null;
  needsRetry: boolean;
} {
  const needsRetry = result.remaining > 0 || result.failed > 0;
  const done = result.refused + result.canceled;
  const processed =
    done === 0
      ? '이번에 처리한 주문이 없어요.'
      : result.canceled > 0
        ? `주문 ${done}건을 거절·취소했고, 환불 요청 ${result.canceled}건이 생겼어요.`
        : `주문 ${done}건을 거절·취소했어요.`;
  // `remaining`은 실패한 주문을 포함한다(백엔드 `countTargetOrders`) — 둘 중 큰 수가 남은 주문이다
  return {
    processed,
    leftCount: needsRetry ? Math.max(result.remaining, result.failed) : null,
    needsRetry,
  };
}
