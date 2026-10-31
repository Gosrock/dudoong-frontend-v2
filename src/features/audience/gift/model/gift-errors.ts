/**
 * 선물 변경 에러 → 처리(patterns §24 P8b 행). 동작마다 화면이 맡는 코드와 그 뒤 다시 읽을 것을 한 표에 둔다.
 * 표에 없는 코드는 공용 토스트(`reason`)로 간다. 훅은 이 표로 `handleError` 표를 만든다.
 */

export type GiftAction = 'send' | 'cancel' | 'memo' | 'accept' | 'reject' | 'return';

/**
 * 다시 읽을 것
 * - `ticket` — 이 티켓의 G11/T-2
 * - `tickets` — 티켓탭 목록 G11/T-1(상세는 닫힌다 — 옛 uuid·내 것이 아님)
 * - `landing` — 선물 랜딩 GG-3
 */
export type GiftRefetch = 'ticket' | 'tickets' | 'landing';

export type GiftErrorOutcome = {
  /** 화면에 둘 문구(칸 오류면 `field: 'memo'`) */
  message: string;
  refetch: GiftRefetch[];
  /** 메모 칸 오류 */
  field?: 'memo';
  /** 이미 선물 중 — 다시 읽은 T-2의 `gift.linkPath`로 기존 링크 화면 */
  showExistingLink?: boolean;
  /** 다시 읽은 랜딩이 그래도 받을 수 있는 상태면 취소된 선물로 그린다(`Gift_400_6`) */
  treatAsCanceled?: boolean;
};

const ALREADY_HANDLED: GiftErrorOutcome = {
  message: '이미 처리된 선물이에요',
  refetch: ['landing'],
};
const MEMO_TOO_LONG: GiftErrorOutcome = {
  message: '메모는 50자까지 쓸 수 있어요',
  refetch: [],
  field: 'memo',
};
const NOT_MY_GIFT: GiftErrorOutcome = { message: '선물을 찾을 수 없어요', refetch: ['tickets'] };
const TICKET_GONE: GiftErrorOutcome = { message: '티켓 정보가 바뀌었어요', refetch: ['tickets'] };

/** 수락·거절 공통(받는 쪽은 GG-3을 다시 읽어 상태 화면으로) */
const RECEIVE: Record<string, GiftErrorOutcome> = {
  Gift_400_3: ALREADY_HANDLED,
  Gift_400_4: { message: '내가 보낸 선물은 받을 수 없어요', refetch: ['landing'] },
  Gift_400_5: { message: '공연이 끝나 받을 수 없는 선물이에요', refetch: ['landing'] },
  Gift_400_6: { message: '받을 수 없는 선물이에요', refetch: ['landing'], treatAsCanceled: true },
};

export const GIFT_ERROR_TABLE: Record<GiftAction, Record<string, GiftErrorOutcome>> = {
  send: {
    Gift_400_1: { message: '지금은 선물할 수 없는 티켓이에요', refetch: ['ticket'] },
    Gift_400_2: {
      message: '이미 선물 중인 티켓이에요',
      refetch: ['ticket'],
      showExistingLink: true,
    },
    Gift_400_9: MEMO_TOO_LONG,
    IssuedTicket_404_1: TICKET_GONE,
  },
  cancel: {
    // 보낸 쪽은 T-2(티켓탭에서) 또는 GG-3(랜딩에서)을 다시 읽는다 — 훅이 화면에 맞게 고른다
    Gift_400_3: { message: '이미 처리된 선물이에요', refetch: ['ticket', 'landing'] },
    Gift_404_1: NOT_MY_GIFT,
  },
  memo: {
    Gift_400_3: { message: '이미 처리된 선물이라 메모를 바꿀 수 없어요', refetch: ['ticket'] },
    Gift_400_9: MEMO_TOO_LONG,
    Gift_404_1: NOT_MY_GIFT,
  },
  accept: RECEIVE,
  reject: RECEIVE,
  return: {
    // 서버 `returnBlocker`가 가장 먼저 보는 사유(받은 티켓 아님 — 선물 상태가 바뀜, fe423ed4). 목록부터 다시 읽는다(계약 대조 2026-10-31, 문구 잠정)
    Gift_400_8: { message: '선물받은 티켓이 아니라 반환할 수 없어요', refetch: ['tickets'] },
    Gift_400_7: { message: '반환할 수 없는 티켓이에요', refetch: ['ticket'] },
    IssuedTicket_404_1: TICKET_GONE,
  },
};

export function giftErrorOutcome(action: GiftAction, code: string | null): GiftErrorOutcome | null {
  if (code === null) return null;
  const table = GIFT_ERROR_TABLE[action];
  return Object.hasOwn(table, code) ? table[code]! : null;
}
