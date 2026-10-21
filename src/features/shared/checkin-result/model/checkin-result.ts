import type { CheckInResponse, CheckInResult, CheckInTicket } from '@/api/check-in/schema';

/**
 * 체크인 `result` → 화면 상태(patterns §19). 호스트 스캔(PQ-2, P13b)과 관객 셀프 체크인(PQ-5, P8c)이 같이 쓴다.
 * PQ-2·PQ-5는 실패도 200 + `result`라 에러 경로가 아니라 여기서 분기한다. 현장 확인 이름은 `ownerName`(주문자 `buyerName`이 아니다).
 */

export type CheckInMode = 'host' | 'self';
/** 화면의 의미 색. 색 자체는 V가 정한다 */
export type CheckInTone = 'success' | 'warning' | 'error';

export type CheckInTicketSummary = {
  /** 현재 소유자 — 현장 확인 이름 */
  ownerName: string | null;
  ticketName: string | null;
  issuedTicketNo: string | null;
  enteredAt: string | null;
};

export type CheckInResultView =
  | {
      kind: 'result';
      result: Exclude<CheckInResult, 'SELECT_TICKET'>;
      tone: CheckInTone;
      title: string;
      description: string | null;
      /** OTHER_EVENT·UNKNOWN은 null(다른 공연 티켓 정보를 보이지 않는다) */
      ticket: CheckInTicketSummary | null;
    }
  /** 셀프 전용 — 입장 전 내 티켓이 여러 장. 하나를 골라 다시 요청한다 */
  | { kind: 'select'; candidates: CheckInTicket[] };

const summary = (t: CheckInTicket | null): CheckInTicketSummary | null =>
  t && {
    ownerName: t.ownerName,
    ticketName: t.ticketName,
    issuedTicketNo: t.issuedTicketNo,
    enteredAt: t.enteredAt,
  };

type Copy = {
  tone: CheckInTone;
  title: string;
  description: (t: CheckInTicket | null) => string | null;
  showTicket: boolean;
};

const COPY: Record<Exclude<CheckInResult, 'SELECT_TICKET'>, Record<CheckInMode, Copy>> = {
  ENTERED: {
    host: { tone: 'success', title: '입장 완료', description: () => null, showTicket: true },
    self: {
      tone: 'success',
      title: '입장이 완료됐어요',
      description: () => null,
      showTicket: true,
    },
  },
  ALREADY_ENTERED: {
    host: {
      tone: 'warning',
      title: '이미 입장한 티켓이에요',
      description: (t) => (t?.enteredAt ? `${t.enteredAt} 입장` : null),
      showTicket: true,
    },
    self: {
      tone: 'warning',
      title: '이미 입장한 티켓이에요',
      description: (t) => (t?.enteredAt ? `${t.enteredAt} 입장` : null),
      showTicket: true,
    },
  },
  OTHER_EVENT: {
    host: {
      tone: 'error',
      title: '이 공연 티켓이 아니에요',
      description: () => null,
      showTicket: false,
    },
    self: {
      tone: 'error',
      title: '이 공연에 입장할 수 있는 내 티켓이 없어요',
      description: () => '선물받은 티켓이라면 선물을 받았는지 티켓탭에서 확인해 주세요',
      showTicket: false,
    },
  },
  CANCELED: {
    host: { tone: 'error', title: '취소된 티켓이에요', description: () => null, showTicket: true },
    self: { tone: 'error', title: '취소된 티켓이에요', description: () => null, showTicket: true },
  },
  GIFT_PENDING: {
    host: {
      tone: 'warning',
      title: '선물 대기 중인 티켓이에요',
      description: () => '보낸 분이 선물을 취소해야 입장할 수 있어요',
      showTicket: true,
    },
    self: {
      tone: 'warning',
      title: '선물 대기 중인 티켓이에요',
      description: () => '티켓탭에서 선물을 취소하면 입장할 수 있어요',
      showTicket: true,
    },
  },
  UNKNOWN: {
    host: {
      tone: 'error',
      title: '체크인 결과를 확인할 수 없어요',
      description: () => '다시 시도해 주세요',
      showTicket: false,
    },
    self: {
      tone: 'error',
      title: '체크인 결과를 확인할 수 없어요',
      description: () => '호스트에게 티켓 QR을 보여 주세요',
      showTicket: false,
    },
  },
};

/** PQ-2·PQ-5 응답 → 화면 상태. 호스트 스캔에 `SELECT_TICKET`이 오면(계약 밖) UNKNOWN으로 그린다 */
export function checkInResultView(res: CheckInResponse, mode: CheckInMode): CheckInResultView {
  if (res.result === 'SELECT_TICKET') {
    if (mode === 'self') return { kind: 'select', candidates: res.candidates };
    return resultView('UNKNOWN', null, mode);
  }
  return resultView(res.result, res.ticket, mode);
}

function resultView(
  result: Exclude<CheckInResult, 'SELECT_TICKET'>,
  ticket: CheckInTicket | null,
  mode: CheckInMode,
): CheckInResultView {
  const copy = COPY[result][mode];
  return {
    kind: 'result',
    result,
    tone: copy.tone,
    title: copy.title,
    description: copy.description(ticket),
    ticket: copy.showTicket ? summary(ticket) : null,
  };
}
