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

/** 취소 확인 안내 — 이슈 #136 §7 문구(되돌릴 수 없음) */
export const CANCEL_EVENT_NOTICE =
  '남은 주문이 모두 거절·취소되고, 결제한 주문은 환불 요청이 생겨요. 되돌릴 수 없어요.';

/** 사유 칸 아래 안내 — 사유가 어디에 보이는지(백엔드 `V2CancelEventRequest` 설명: 공연 상세 + 거절·취소 문구 "공연 취소: {사유}") */
export const CANCEL_REASON_HELPER =
  '공연 상세에 보이고, 예매자에게 보내는 거절·취소 사유에도 들어가요.';

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
  '처리 결과를 확인하지 못했어요. [남은 주문 다시 처리]를 누르면 남은 주문만 이어서 처리해요.';

/** 취소한 뒤 토스트 */
export const CANCEL_EVENT_DONE_TOAST = '공연을 취소했어요.';

/**
 * 한 번 처리한 결과의 안내 — "거절 n건 · 취소 m건"과, 남은 주문이 있으면 다시 처리 안내.
 * `needsRetry` = `remaining > 0 || failed > 0`(이슈 #136 §7 — 같은 API를 다시 부르면 남은 주문만 처리한다)
 */
export function cancelResultSummary(result: EventCancelResult): {
  processed: string;
  leftover: string | null;
  needsRetry: boolean;
} {
  const needsRetry = result.remaining > 0 || result.failed > 0;
  const processed =
    result.refused + result.canceled === 0
      ? '이번에 처리한 주문이 없어요.'
      : `승인 대기 주문 ${result.refused}건을 거절하고, 승인된 주문 ${result.canceled}건을 취소했어요.`;
  // `remaining`은 실패한 주문을 포함한다(백엔드 `countTargetOrders`) — 둘 중 큰 수가 남은 주문이다
  const left = Math.max(result.remaining, result.failed);
  return {
    processed,
    leftover: needsRetry
      ? `아직 처리하지 못한 주문이 ${left}건 있어요. [남은 주문 다시 처리]를 눌러 주세요.`
      : null,
    needsRetry,
  };
}
