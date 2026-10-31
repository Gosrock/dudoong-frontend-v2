/**
 * 셀프 체크인(PQ-5) 에러 → 안내(patterns §24 P8c 행). 화면이 전부 맡는다(전역 토스트 없음).
 * 그 밖의 실패(5xx·네트워크·모르는 400)는 `FAILED` — 다시 시도.
 */
export type SelfCheckInErrorKind = 'INVALID_QR' | 'EVENT_NOT_OPEN' | 'NOT_MY_TICKET' | 'FAILED';

export type SelfCheckInErrorView = {
  kind: SelfCheckInErrorKind;
  title: string;
  description: string;
  /** 같은 요청을 다시 보낼 수 있는지(FAILED만) */
  canRetry: boolean;
};

export const SELF_CHECK_IN_ERRORS: Record<SelfCheckInErrorKind, SelfCheckInErrorView> = {
  INVALID_QR: {
    kind: 'INVALID_QR',
    title: '잘못된 체크인 QR이에요',
    description: '공연장에 있는 체크인 QR을 다시 찍어 주세요',
    canRetry: false,
  },
  // 서버는 OPEN이 아닌 모든 공연(준비중 포함)에 `Event_400_5`를 준다(`V2CheckInDomainService` → `validateNotOpenStatus`, fe423ed4).
  // PQ-5 실패에는 공연 상태가 없어 "끝났다"고 단정하지 않는다(계약 대조 2026-10-31, 문구 잠정)
  EVENT_NOT_OPEN: {
    kind: 'EVENT_NOT_OPEN',
    title: '지금은 셀프 체크인을 할 수 없는 공연이에요',
    description: '호스트에게 티켓 QR을 보여 주세요',
    canRetry: false,
  },
  NOT_MY_TICKET: {
    kind: 'NOT_MY_TICKET',
    title: '내 티켓이 아니에요',
    description: '내 티켓을 다시 골라 주세요',
    canRetry: false,
  },
  FAILED: {
    kind: 'FAILED',
    title: '체크인하지 못했어요',
    description: '잠시 후 다시 시도해 주세요',
    canRetry: true,
  },
};

/** 화면이 처리하는 에러 코드 → 종류. 표에 없는 코드는 `FAILED` */
export const SELF_CHECK_IN_ERROR_CODES = {
  /** 잘못된 체크인 QR(없는 토큰) */
  Event_400_26: 'INVALID_QR',
  /** 공연이 OPEN이 아님 — 끝났거나(정산중·지난 공연) 준비중 */
  Event_400_5: 'EVENT_NOT_OPEN',
  /** 같은 공연의 남의 티켓을 골랐다 */
  IssuedTicket_400_1: 'NOT_MY_TICKET',
} as const satisfies Record<string, SelfCheckInErrorKind>;

export function selfCheckInError(code: string | null): SelfCheckInErrorView {
  const kind =
    code !== null && Object.hasOwn(SELF_CHECK_IN_ERROR_CODES, code)
      ? SELF_CHECK_IN_ERROR_CODES[code as keyof typeof SELF_CHECK_IN_ERROR_CODES]
      : 'FAILED';
  return SELF_CHECK_IN_ERRORS[kind];
}
