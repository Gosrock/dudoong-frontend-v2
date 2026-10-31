/**
 * 주문 금액 계산(순수 함수). 체크아웃 총액과 토스 송금 링크 금액이 여기서만 나온다(plan S2, tech-decisions §18 금액).
 * 주문 생성 응답의 `totalAmount`와 같아야 한다.
 *
 * 백엔드 식(`V2UserOrderDomainService.cartLines` → `OrderLineItem.getTotalOrderLinePrice`):
 * - 모든 티켓 동일(`applyToAll`): 줄 1개, 수량 N → `(price + Σ옵션 추가금) × N`. **옵션 추가금도 수량만큼 곱한다.**
 * - 티켓별(`applyToAll=false`): 티켓마다 수량 1인 줄 → `Σ_i (price + Σ티켓 i의 옵션 추가금)`
 * - 옵션 추가금은 네/아니오 옵션에 `YES`로 답했을 때의 `yesAdditionalPrice`. `NO`·주관식은 0원.
 * - 쿠폰 할인은 v2에 없다(`getTotalPaymentPrice = 공급가 − 할인`, 할인 0).
 *
 * 금액은 원 단위 정수다. 상한(티켓·옵션 각 1,000만 원, 옵션 50개, 수량 100)을 모두 채워도
 * 5.1 × 10^10이라 `Number.MAX_SAFE_INTEGER` 안이다.
 */

/** 1회 주문 수량 상한. 백엔드 `V2CreateOrderRequest.MAX_QUANTITY`(@Max(100)) */
export const MAX_ORDER_QUANTITY = 100;

/** 답 하나의 추가금. 화면 옵션 응답에서 `optionAdditionalPrice()`로 만든다 */
export type PricedAnswer = { additionalPrice: number };

export type OrderAmountInput = {
  /** 티켓 단가(무료면 0) */
  price: number;
  quantity: number;
  options:
    | { applyToAll: true; answers: readonly PricedAnswer[] }
    /** 티켓 i의 답. 길이가 수량보다 짧으면(폼 갱신 중) 빈 답으로 본다 — 추가금 0 */
    | { applyToAll: false; perTicket: readonly (readonly PricedAnswer[])[] };
};

function assertWon(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name}은 0 이상의 정수 원이어야 한다: ${value}`);
  }
}

const sumAdditional = (answers: readonly PricedAnswer[]) =>
  answers.reduce((acc, a) => {
    assertWon(a.additionalPrice, 'additionalPrice');
    return acc + a.additionalPrice;
  }, 0);

/**
 * 네/아니오 옵션 답의 추가금. `YES`일 때만 `yesAdditionalPrice`(없으면 0). `NO`·미응답·주관식은 0.
 * 백엔드는 `예`·`네`도 YES로 받지만 FE는 `YES`/`NO`만 보낸다(api-contract §6 F5).
 */
export function optionAdditionalPrice(
  yesAdditionalPrice: number | null,
  answer: string | undefined,
) {
  return answer === 'YES' ? (yesAdditionalPrice ?? 0) : 0;
}

/** 주문 총액(원). 수량은 1..100 정수. 범위를 벗어난 입력은 프로그램 오류라 `RangeError`. */
export function orderTotalAmount({ price, quantity, options }: OrderAmountInput): number {
  assertWon(price, 'price');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ORDER_QUANTITY) {
    throw new RangeError(`quantity는 1..${MAX_ORDER_QUANTITY} 정수여야 한다: ${quantity}`);
  }
  let total: number;
  if (options.applyToAll) {
    total = (price + sumAdditional(options.answers)) * quantity;
  } else {
    total = 0;
    for (let i = 0; i < quantity; i += 1) {
      total += price + sumAdditional(options.perTicket[i] ?? []);
    }
  }
  assertWon(total, 'total');
  return total;
}

/**
 * 수량 스테퍼 상한 = `purchaseLimit` · `remaining` · 100 중 가장 작은 값(`null`은 뺀다, api-contract §6 F5).
 * 이미 산 수량(승인 대기 포함)은 화면이 모른다 — 넘으면 주문 때 에러. 0 이하면 살 수 없다(0을 돌려준다).
 */
export function maxOrderQuantity({
  purchaseLimit,
  remaining,
}: {
  purchaseLimit: number | null;
  remaining: number | null;
}): number {
  const limits = [purchaseLimit, remaining, MAX_ORDER_QUANTITY].filter(
    (v): v is number => v !== null,
  );
  return Math.max(0, Math.min(...limits));
}
