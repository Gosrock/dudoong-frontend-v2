import type { Account, PaymentChannel } from '@/api/order/schema';
import type { PublicTicketItem } from '@/api/ticket-item/schema';

/**
 * 결제 방식과 주문 3분기(api-contract §6 F5, tech-decisions §19).
 *
 * | 분기 | 티켓 | `paymentChannel` | CTA | 주문 생성 직후 |
 * |---|---|---|---|---|
 * | 입금형 | 두둥 | `BANK_TRANSFER` · `TOSS_TRANSFER` | 결제하기 → 주문 확인 모달 [주문 완료하기] | `PENDING_APPROVE`(재고 잡힘) → 완료 화면에서 계좌·금액 안내 → 입금(B23) |
 * | 무료 승인형 | 무료 + 승인 | `FREE` | 신청하기(모달 없음) | `PENDING_APPROVE` |
 * | 무료 선착순 | 무료 + 승인 없음 | `FREE` | 신청하기(모달 없음) | `APPROVED`(즉시 발급). 확정 실패는 주문이 아니라 에러 |
 */
export type CheckoutKind = 'TRANSFER' | 'FREE_APPROVAL' | 'FREE_FCFS';

/** 주문할 수 없는 결제 방식(PRICE·UNKNOWN·null)이면 `null` */
export function checkoutKind(
  ticket: Pick<PublicTicketItem, 'payType' | 'approvalRequired'>,
): CheckoutKind | null {
  if (ticket.payType === 'DUDOONG') return 'TRANSFER';
  if (ticket.payType === 'FREE') return ticket.approvalRequired ? 'FREE_APPROVAL' : 'FREE_FCFS';
  return null;
}

/** CTA 문구 — GUI의 "저장"을 동작에 맞게 바꾼다(plan P7 ③) */
export const ctaLabel = (kind: CheckoutKind) => (kind === 'TRANSFER' ? '결제하기' : '신청하기');

/**
 * CTA 뒤에 주문 확인 모달(요약 + 두둥 입금 전 확인 → [주문 완료하기])을 거치는지(V가 모달을 열고, 확인에서 `submit`을 부른다).
 * 입금은 주문을 만든 뒤 완료 화면의 안내로 한다(B23 — 예전 "입금하셨나요?" 확인 뒤 생성 순서를 바꿨다, 사용자 결정 2026-11-02)
 */
export const needsOrderConfirm = (kind: CheckoutKind) => kind === 'TRANSFER';

/** 고를 수 있는 결제 방식. 무료는 고르지 않는다(`PaymentChannelSelect`를 그리지 않는다) */
export const selectablePaymentChannels = (kind: CheckoutKind): readonly PaymentChannel[] =>
  kind === 'TRANSFER' ? ['BANK_TRANSFER', 'TOSS_TRANSFER'] : [];

export const PAYMENT_CHANNEL_LABEL: Record<'BANK_TRANSFER' | 'TOSS_TRANSFER', string> = {
  BANK_TRANSFER: '직접 계좌이체',
  TOSS_TRANSFER: '토스로 송금하기',
};

/** 은행·예금주·계좌번호가 모두 있는지(결제 정보 영역을 그릴 수 있는지) */
export const isCompleteAccount = (
  account: Account | null | undefined,
): account is Account & {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
} =>
  Boolean(
    account?.bankName?.trim() && account.accountHolder?.trim() && account.accountNumber?.trim(),
  );

/**
 * 토스 송금 링크(tech-decisions §19·§22). 비공식 스킴 `supertoss://send?bank=&accountNo=&amount=`.
 * - 금액은 주문 총액(`orderTotalAmount` = 서버 `totalAmount`) 그대로, 정수 원
 * - 계좌번호는 숫자만 남긴다(하이픈·공백 제거)
 * - 계좌가 비었거나 금액이 0 이하면 `null`(버튼을 숨기고 직접 계좌이체로 안내)
 *
 * TODO(B3): 은행 값은 아직 계좌의 `bankName`(호스트 자유 입력 또는 `bankCode`의 표시 이름)을 그대로 넣는다.
 * 백엔드 #804로 계좌 응답에 `bankCode`(금융결제원 3자리, 추정 실패면 null)가 생겼지만, 토스 스킴이 받는 은행 값은
 * 서버가 주지 않고(`BankCode` 주석 — 토스 공개 문서로 확인되지 않음) 근거 있는 매핑도 없다. `bankCode` → 토스 값 매핑과
 * "`bankCode`가 null이면 토스 버튼 숨김"은 실기기 확인(P7) 뒤에 정한다 — 그 전에는 매핑 표를 만들지 않는다.
 */
export function tossTransferLink(
  account: Account | null | undefined,
  amount: number,
): string | null {
  if (!isCompleteAccount(account)) return null;
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  const accountNo = account.accountNumber.replace(/\D/g, '');
  if (accountNo === '') return null;
  const query = new URLSearchParams({
    bank: account.bankName.trim(),
    accountNo,
    amount: String(amount),
  });
  return `supertoss://send?${query.toString()}`;
}
