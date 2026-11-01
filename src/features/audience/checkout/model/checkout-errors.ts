/**
 * 주문 생성(P11/O-1) 에러 분기 — patterns §24 P7 행. 화면 문구는 `code`로 정하고 서버 `reason`은 쓰지 않는다(§11).
 * 여기 없는 코드는 공용 토스트(`reason`)로 간다. 단, 무료 선착순은 확정 실패가 원래 에러로 오므로
 * 표에 없는 실패도 화면이 "다시 시도" 안내로 맡는다(`useCheckout`).
 */

import { AGREEMENT_REJECTED_MESSAGE } from '@/api/shared/agreement';

export type CheckoutErrorKind =
  /** 오픈 전·시작 후 — 구매 버튼 비활성 + 상세로 돌려보냄 */
  | 'EVENT_CLOSED'
  /** 판매 중 아님·다른 공연 티켓·비공개 공연 — 티켓 선택으로 돌려보냄 */
  | 'NOT_ON_SALE'
  /** 재고 부족(승인 대기 포함) — GP-5를 다시 읽어 잔여·상한 갱신 */
  | 'STOCK'
  /** 1인 제한(발급 기준) — 안내 + 수량 줄이기 */
  | 'PURCHASE_LIMIT'
  /** 승인형 1인 제한(승인 대기 포함) — 안내 + 수량 줄이기 */
  | 'PENDING_LIMIT'
  /** 입금자명 오류 — 닉네임 고정이라 칸에서 못 고친다. 폼 상단 오류 */
  | 'DEPOSITOR_NAME'
  /** 옵션 답 오류 — 폼 상단 */
  | 'OPTION_ANSWERS'
  /** 같은 무료 선착순 주문 처리 중 — 주문내역으로 */
  | 'DUPLICATE_IN_PROGRESS'
  /** 무료 선착순 확정 실패(표에 없는 에러) — 재시도 안내 */
  | 'FREE_FCFS_FAILED'
  /** 응답을 받지 못함(TIMEOUT·NETWORK) — 서버가 주문을 만들었을 수 있다. 다시 내기 전에 주문내역 확인 */
  | 'ORDER_UNCERTAIN'
  /** 서버가 동의를 거절(`Agreement_400_1` — 동의 강제, #840). 동의 칸을 풀고 지금 보이는 문구로 다시 동의받는다 */
  | 'AGREEMENT';

export type CheckoutErrorOutcome = {
  kind: CheckoutErrorKind;
  /** 폼 상단·안내에 보일 문구 */
  message: string;
  /** GP-5와 O-0을 다시 읽는다(잔여·상한 갱신) */
  refetchTickets: boolean;
  /** 이동할 곳. `event` = 공연 상세(티켓 선택), `orders` = 주문내역 */
  navigate: 'event' | 'orders' | null;
};

const row = (
  kind: CheckoutErrorKind,
  message: string,
  refetchTickets = false,
  navigate: CheckoutErrorOutcome['navigate'] = null,
): CheckoutErrorOutcome => ({ kind, message, refetchTickets, navigate });

/** 코드 → 처리. `handleError` 표의 키가 이 표의 키다 */
export const CHECKOUT_ERROR_TABLE = {
  Event_400_5: row('EVENT_CLOSED', '지금은 예매할 수 없는 공연이에요.', false, 'event'),
  Event_400_6: row('EVENT_CLOSED', '공연이 시작되어 예매할 수 없어요.', false, 'event'),
  Ticket_Item_400_10: row('NOT_ON_SALE', '지금은 판매 중인 티켓이 아니에요.', true, 'event'),
  Ticket_Item_404_1: row('NOT_ON_SALE', '판매 중인 티켓을 찾을 수 없어요.', true, 'event'),
  Event_404_1: row('NOT_ON_SALE', '공연을 찾을 수 없어요.', false, 'event'),
  Ticket_Item_400_1: row('STOCK', '남은 티켓이 부족해요. 수량을 줄여 다시 시도해 주세요.', true),
  Ticket_Item_400_6: row(
    'PURCHASE_LIMIT',
    '1인 구매 가능 수량을 넘었어요. 수량을 줄여 다시 시도해 주세요.',
    true,
  ),
  Order_400_15: row(
    'PENDING_LIMIT',
    '이미 신청한 주문이 승인될 때까지 기다려 주세요. 수량을 줄이면 지금 주문할 수 있어요.',
    true,
  ),
  Order_400_22: row(
    'DEPOSITOR_NAME',
    '입금자명이 올바르지 않아요. 프로필에서 닉네임을 확인해 주세요.',
  ),
  Order_400_23: row('OPTION_ANSWERS', '옵션 답변을 확인해 주세요.'),
  Agreement_400_1: row('AGREEMENT', AGREEMENT_REJECTED_MESSAGE),
  Order_400_26: row(
    'DUPLICATE_IN_PROGRESS',
    '같은 주문을 처리하고 있어요. 잠시 후 주문내역을 확인해 주세요.',
    false,
    'orders',
  ),
} as const satisfies Record<string, CheckoutErrorOutcome>;

export type CheckoutErrorCode = keyof typeof CHECKOUT_ERROR_TABLE;

/**
 * 무료 선착순 확정 실패. 서버는 주문을 FAILED로 바꾸고 원래 에러를 돌려준다(FAILED 주문은 사용자에게 보이지 않는다) —
 * 표에 있는 코드(재고 등)는 그 처리를 하고, 표에 없는 실패는 이 안내로 다시 시도하게 한다. 재시도는 새 주문이다.
 */
export const FREE_FCFS_FAILED: CheckoutErrorOutcome = row(
  'FREE_FCFS_FAILED',
  '신청을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.',
);

/**
 * 주문 생성 응답을 받지 못했다(TIMEOUT·NETWORK — 이슈 #92-4). 서버가 늦게 성공했을 수 있고 `Idempotency-Key`가 없어
 * 다시 내면 서버의 10초 중복 판정 밖에서 새 주문이 될 수 있다 — 폼 상단에 주문내역 링크와 함께 남긴다(토스트는 사라진다).
 * 결제 수단과 상관없이 같다(무료 선착순의 "다시 시도" 안내보다 먼저).
 */
export const ORDER_UNCERTAIN: CheckoutErrorOutcome = row(
  'ORDER_UNCERTAIN',
  '주문 결과를 확인하지 못했어요. 다시 주문하기 전에 주문내역에서 주문이 들어갔는지 확인해 주세요.',
);

/** 응답을 받지 못한 실패의 코드(`ApiError` status 0 — patterns §5) */
export const UNCERTAIN_ERROR_CODES = ['TIMEOUT', 'NETWORK'] as const;

export function classifyCheckoutError(code: string | null): CheckoutErrorOutcome | null {
  if (code === null || !Object.hasOwn(CHECKOUT_ERROR_TABLE, code)) return null;
  return CHECKOUT_ERROR_TABLE[code as CheckoutErrorCode];
}
