import { describe, expect, it } from 'vitest';

import { CheckInResponseSchema, type CheckInTicket } from '@/api/check-in/schema';

import { checkInResultView } from './checkin-result';

const ticket: CheckInTicket = {
  ticketUuid: 'u1',
  issuedTicketNo: 'T1000001',
  ticketName: '일반 예매',
  buyerName: '김민수',
  ownerName: '두둥이',
  entrance: 'DONE',
  enteredAt: '2026.10.22 18:40',
};

describe('체크인 result → 화면 상태(셀프·호스트 공용)', () => {
  it.each([
    ['ENTERED', 'self', 'success', '입장이 완료됐어요', null, true],
    ['ENTERED', 'host', 'success', '입장 완료', null, true],
    ['ALREADY_ENTERED', 'self', 'warning', '이미 입장한 티켓이에요', '2026.10.22 18:40 입장', true],
    ['OTHER_EVENT', 'host', 'error', '이 공연 티켓이 아니에요', null, false],
    [
      'OTHER_EVENT',
      'self',
      'error',
      '이 공연에 입장할 수 있는 내 티켓이 없어요',
      expect.any(String),
      false,
    ],
    ['CANCELED', 'self', 'error', '취소된 티켓이에요', null, true],
    [
      'GIFT_PENDING',
      'host',
      'warning',
      '선물 대기 중인 티켓이에요',
      '보낸 분이 선물을 취소해야 입장할 수 있어요',
      true,
    ],
    [
      'GIFT_PENDING',
      'self',
      'warning',
      '선물 대기 중인 티켓이에요',
      '티켓탭에서 선물을 취소하면 입장할 수 있어요',
      true,
    ],
    [
      'UNKNOWN',
      'self',
      'error',
      '체크인 결과를 확인할 수 없어요',
      '호스트에게 티켓 QR을 보여 주세요',
      false,
    ],
  ] as const)('%s(%s) → %s "%s"', (result, mode, tone, title, description, showTicket) => {
    const view = checkInResultView({ result, ticket, candidates: [] }, mode);
    expect(view).toMatchObject({ kind: 'result', result, tone, title, description });
    if (view.kind !== 'result') throw new Error();
    expect(view.ticket !== null).toBe(showTicket);
  });

  it('현장 확인 이름은 주문자가 아니라 현재 소유자(ownerName)', () => {
    const view = checkInResultView({ result: 'ENTERED', ticket, candidates: [] }, 'host');
    expect(view).toMatchObject({ ticket: { ownerName: '두둥이' } });
    expect(JSON.stringify(view)).not.toContain('김민수');
  });

  it('SELECT_TICKET(셀프)은 후보 고르기', () => {
    expect(
      checkInResultView({ result: 'SELECT_TICKET', ticket: null, candidates: [ticket] }, 'self'),
    ).toEqual({
      kind: 'select',
      candidates: [ticket],
    });
  });

  it('호스트 스캔에 SELECT_TICKET이 오면(계약 밖) UNKNOWN으로 그린다', () => {
    expect(
      checkInResultView({ result: 'SELECT_TICKET', ticket: null, candidates: [] }, 'host'),
    ).toMatchObject({
      result: 'UNKNOWN',
    });
  });

  it('모르는 result는 UNKNOWN으로 파싱된다', () => {
    const parsed = CheckInResponseSchema.parse({
      result: 'VIP_ENTERED',
      ticket: null,
      candidates: [],
    });
    expect(checkInResultView(parsed, 'self')).toMatchObject({ result: 'UNKNOWN' });
  });
});
