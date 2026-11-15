import { describe, expect, it } from 'vitest';

import { CANCEL_ENTRANCE_STALE_MESSAGE } from './cancel-entrance-messages';

// 예매자 관리 티켓 상세(`CANCEL_ENTRANCE_ERROR_MESSAGE`)와 QR 체크인 티켓 번호(`CANCEL_ENTRANCE_STALE_MESSAGE`)가 이 상수를 쓴다
describe('[입장 취소] 이미 바뀐 상태 토스트(디자이너 답 2008391965)', () => {
  it('티켓 자체가 취소됨 · 누가 이미 입장을 취소함', () => {
    expect(CANCEL_ENTRANCE_STALE_MESSAGE).toEqual({
      IssuedTicket_400_3: '취소된 티켓이에요. 최신 상태를 불러왔어요',
      IssuedTicket_400_9: '입장 전 상태로 바뀌었어요. 최신 상태를 불러왔어요',
    });
  });
});
