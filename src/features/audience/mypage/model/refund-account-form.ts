import {
  type MyOrderDetail,
  REFUND_ACCOUNT_HOLDER_MAX,
  REFUND_ACCOUNT_NUMBER_MAX,
  REFUND_ACCOUNT_NUMBER_PATTERN,
  type RefundAccountRequest,
  RefundAccountRequestSchema,
} from '@/api/order/schema';

/**
 * 환불 계좌 폼(P11/O-4의 `refundAccount`, P11/O-5) — 취소 시트와 입력·수정 시트가 같이 쓴다.
 * 은행은 `GET /api/v2/banks` 목록에서 고른 `code`를 보낸다(`bankName`은 보내지 않는다 — 서버가 채운다, #804·#813).
 * 제한은 백엔드 `V2RefundAccountRequest`·`OrderRefundAccount`: 예금주 20자, 계좌번호 30자(숫자·하이픈·공백,
 * `^[0-9][0-9 -]*[0-9]$`). 티켓 입금 계좌(30/30/50)와 다르다.
 */
export type RefundAccountFormValues = {
  bankCode: string;
  accountHolder: string;
  accountNumber: string;
};
export type RefundAccountField = keyof RefundAccountFormValues;
export type RefundAccountFieldErrors = Partial<Record<RefundAccountField, string>>;

/**
 * 폼 처음 값. 수정이라도 계좌번호는 비운다 — 본인 계좌는 `maskedAccountNumber`(뒤 4자리)로만 온다(patterns §20).
 * 응답 계좌의 `bankCode`가 null이면(옛 자유 입력 은행명) 은행도 비워 목록에서 다시 고르게 한다.
 */
export function refundAccountDefaults(
  account: MyOrderDetail['refundAccount'],
): RefundAccountFormValues {
  return {
    bankCode: account?.bankCode ?? '',
    accountHolder: account?.accountHolder ?? '',
    accountNumber: '',
  };
}

/**
 * 칸 검증. 앞뒤 공백은 지우고 본다(보낼 때도 지운다). `bankCodes`(은행 목록)를 주면 목록에 없는 코드도 막는다 —
 * 아직 목록을 못 받았으면 생략한다(서버가 모르는 코드를 400으로 막는다).
 */
export function refundAccountErrors(
  values: RefundAccountFormValues,
  bankCodes?: readonly string[],
): RefundAccountFieldErrors {
  const errors: RefundAccountFieldErrors = {};
  const holder = values.accountHolder.trim();
  const number = values.accountNumber.trim();
  if (!values.bankCode || (bankCodes && !bankCodes.includes(values.bankCode))) {
    errors.bankCode = '은행을 골라 주세요';
  }
  if (!holder) errors.accountHolder = '예금주를 입력해 주세요';
  else if (holder.length > REFUND_ACCOUNT_HOLDER_MAX) {
    errors.accountHolder = `예금주는 ${REFUND_ACCOUNT_HOLDER_MAX}자까지 입력할 수 있어요`;
  }
  if (!number) errors.accountNumber = '계좌번호를 입력해 주세요';
  else if (number.length > REFUND_ACCOUNT_NUMBER_MAX) {
    errors.accountNumber = `계좌번호는 ${REFUND_ACCOUNT_NUMBER_MAX}자까지 입력할 수 있어요`;
  } else if (!REFUND_ACCOUNT_NUMBER_PATTERN.test(number)) {
    errors.accountNumber = '계좌번호는 숫자와 하이픈만 입력해 주세요';
  }
  return errors;
}

/** 검증을 통과한 값 → 요청 본문(앞뒤 공백 제거). 통과하지 못하면 칸 오류 */
export function toRefundAccountBody(
  values: RefundAccountFormValues,
  bankCodes?: readonly string[],
): { ok: true; body: RefundAccountRequest } | { ok: false; errors: RefundAccountFieldErrors } {
  const errors = refundAccountErrors(values, bankCodes);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    body: RefundAccountRequestSchema.parse({
      bankCode: values.bankCode,
      accountHolder: values.accountHolder.trim(),
      accountNumber: values.accountNumber.trim(),
    }),
  };
}
