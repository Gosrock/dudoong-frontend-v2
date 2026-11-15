/**
 * [입장 취소]가 이미 바뀐 상태라 안 됐을 때 토스트(최신 상태를 다시 읽는다). 예매자 관리 티켓 상세와 QR 체크인 티켓 번호 결과 카드가
 * 같은 말을 쓴다 — 디자이너 답(Figma 코멘트 2008391965, 2026-11-14): 누가 이미 입장을 취소함(`IssuedTicket_400_9`) ·
 * 티켓 자체가 취소됨(`IssuedTicket_400_3`)
 */
export const CANCEL_ENTRANCE_STALE_MESSAGE = {
  IssuedTicket_400_9: '입장 전 상태로 바뀌었어요. 최신 상태를 불러왔어요',
  IssuedTicket_400_3: '취소된 티켓이에요. 최신 상태를 불러왔어요',
} as const;
