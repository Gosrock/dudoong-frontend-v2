import type { HostScanFailureKind } from '@/features/hosting/shared/model/qr-check-in-rules';
import type {
  CheckInResultView,
  CheckInTicketSummary,
  CheckInTone,
} from '@/features/shared/checkin-result/model/checkin-result';

import type { HostScanState } from './useHostScan';
import type { TicketNoCheckInState } from './useTicketNoCheckIn';

/**
 * QR 체크인 결과 → 결과 카드(P13b-GUI). 근거는 GUI "QR 체크인 결과 문구 매핑 가이드"(`1411:7760`, 2026-11-11 — Design Sync #234)
 * 와 카드 모음 `QR 결과 카드_13종`(`1362:1695`) · Ready 컴포넌트 `QR 결과 카드`(`1362:1295`) · `티켓 번호 결과 카드`(`1368:4838`).
 *
 * 가이드는 호스트가 다음에 할 일이 같은 원인을 한 카드로 묶었다(13 → 10). **묶음은 화면에서만** — 서버 결과 · 에러 코드 · 로그는
 * 원인별 그대로 두고(`result` · `failure.kind`) 카드의 `cause`로 남긴다(가이드 "개발 메모").
 * - 다시 시도하면 되는 것: 6 알 수 없는 결과(UNKNOWN) · 9 네트워크 · 10 서버 → "입장 처리를 하지 못했어요" [다시 시도]
 * - 잘못된 QR: 5 다른 공연 티켓(없는 티켓 포함) · 7 티켓 QR 아님 → "이 공연 티켓이 아니에요"(티켓 정보 숨김)
 * - 8 · 11 · 12는 합치지 않는다
 */

/** 가이드의 "보여줄 결과 카드" — 카드 모음 레이어 이름과 같은 10종(+ 0 확인 중) */
export type ScanCardKind =
  | 'checking'
  | 'entered'
  | 'alreadyEntered'
  | 'giftPending'
  | 'canceled'
  | 'notThisEvent'
  | 'failed'
  | 'eventNotCheckable'
  | 'forbidden'
  | 'notFound';

/** 카드 톤 — `checking`은 아이콘 대신 스피너 */
export type ScanCardTone = CheckInTone | 'checking';

export type ScanCard = {
  kind: ScanCardKind;
  tone: ScanCardTone;
  title: string;
  description: string | null;
  /** 이름 · 티켓 · 티켓 번호(가이드 "티켓 정보 보임") — 5 · 7은 다른 공연 정보를 보이지 않는다 */
  ticket: CheckInTicketSummary | null;
  /** 카드 버튼 — `next` [다음 스캔] · `retry` [다시 시도](마지막 요청을 다시 보낸다) · `none`(확인 중) */
  action: 'next' | 'retry' | 'none';
  /** 묶기 전 원인(서버 `result` 또는 실패 종류) — 화면 표시 · 로그 · 테스트용 */
  cause: string;
};

/** 가이드 문구 그대로(`1411:7760` 제목 / 설명 칸) */
export const SCAN_CARD_COPY = {
  checking: { title: '확인하는 중', description: null },
  entered: { title: '입장 완료', description: null },
  alreadyEntered: { title: '이미 입장한 티켓이에요', description: null },
  giftPending: {
    title: '선물 대기 중인 티켓이에요',
    description: '보낸 분이 선물을 취소해야 입장할 수 있어요',
  },
  canceled: { title: '취소된 티켓이에요', description: null },
  notThisEvent: { title: '이 공연 티켓이 아니에요', description: null },
  failed: { title: '입장 처리를 하지 못했어요', description: '잠시 후 다시 시도해 주세요' },
  eventNotCheckable: {
    title: '준비중이거나 지난 공연은 입장 처리를 할 수 없어요',
    description: null,
  },
  // 가이드 표는 "이 공연의 …"지만 Ready 카드 · 화면(`1362:1695` · `1365:4954`)은 "공연의 …" — 화면 글자를 따른다
  forbidden: { title: '공연의 입장 처리 권한이 없어요', description: null },
  notFound: { title: '공연을 찾을 수 없어요', description: null },
} as const satisfies Record<ScanCardKind, { title: string; description: string | null }>;

const TONE: Record<ScanCardKind, ScanCardTone> = {
  checking: 'checking',
  entered: 'success',
  alreadyEntered: 'warning',
  giftPending: 'warning',
  canceled: 'error',
  notThisEvent: 'error',
  failed: 'error',
  eventNotCheckable: 'error',
  forbidden: 'error',
  notFound: 'error',
};

type ResultView = Extract<CheckInResultView, { kind: 'result' }>;

const RESULT_KIND: Record<ResultView['result'], ScanCardKind> = {
  ENTERED: 'entered',
  ALREADY_ENTERED: 'alreadyEntered',
  GIFT_PENDING: 'giftPending',
  CANCELED: 'canceled',
  OTHER_EVENT: 'notThisEvent',
  UNKNOWN: 'failed',
};

const FAILURE_KIND: Record<HostScanFailureKind, ScanCardKind> = {
  network: 'failed',
  server: 'failed',
  forbidden: 'forbidden',
  notFound: 'notFound',
};

function card(
  kind: ScanCardKind,
  cause: string,
  ticket: CheckInTicketSummary | null = null,
  description: string | null = SCAN_CARD_COPY[kind].description,
): ScanCard {
  const action = kind === 'checking' ? 'none' : kind === 'failed' ? 'retry' : 'next';
  return {
    kind,
    tone: TONE[kind],
    title: SCAN_CARD_COPY[kind].title,
    description,
    ticket: kind === 'notThisEvent' || kind === 'failed' ? null : ticket,
    action,
    cause,
  };
}

/** 서버 결과(200 + `result`) → 카드. 이미 입장은 설명에 "{입장 시각} 입장" */
function resultCard(view: ResultView): ScanCard {
  const kind = RESULT_KIND[view.result];
  const enteredAt = view.ticket?.enteredAt;
  const description =
    kind === 'alreadyEntered'
      ? enteredAt
        ? `${enteredAt} 입장`
        : null
      : SCAN_CARD_COPY[kind].description;
  return card(kind, view.result, view.ticket, description);
}

/** [호스트가 QR 스캔] 상태 → 카드. 기다림(`idle`)은 카드 없음 */
export function hostScanCard(state: HostScanState): ScanCard | null {
  switch (state.status) {
    case 'idle':
      return null;
    case 'checking':
      return card('checking', 'CHECKING');
    case 'result':
      return resultCard(state.view);
    case 'invalidQr':
      return card('notThisEvent', 'INVALID_QR');
    case 'eventNotCheckable':
      return card('eventNotCheckable', 'Event_400_27');
    case 'failed':
      return card(FAILURE_KIND[state.failure.kind], state.failure.kind);
  }
}

/**
 * 티켓 번호로 입장 상태 → 카드(`티켓 번호 결과 카드`). 묶음은 QR과 같다 — 다만 번호 카드에는 버튼이 없다
 * (입장 완료의 [입장 취소]만, 다시 시도는 [입장 처리]를 다시 누른다 — 화면 `1368:7492`). 처리 중은 [입장 처리] 버튼 스피너라 카드 없음,
 * 번호 형식 오류(`invalid`)는 칸 오류 문구라 카드 없음.
 * 입장 완료면 설명 "본인이 맞는지 확인해 주세요"(번호는 추측할 수 있다 — 백엔드 #926).
 */
export function ticketNoCard(state: TicketNoCheckInState): ScanCard | null {
  switch (state.status) {
    case 'idle':
    case 'checking':
    case 'invalid':
      return null;
    case 'result': {
      const c = resultCard(state.view);
      if (c.kind === 'entered')
        return { ...c, action: 'none', description: TICKET_NO_ENTERED_DESCRIPTION };
      return { ...c, action: 'none' };
    }
    case 'eventNotCheckable':
      return { ...card('eventNotCheckable', 'Event_400_27'), action: 'none' };
    case 'failed':
      return { ...card(FAILURE_KIND[state.failure.kind], state.failure.kind), action: 'none' };
  }
}

/** 번호 입장 완료 설명(GUI `1368:4799` 그대로) */
export const TICKET_NO_ENTERED_DESCRIPTION = '본인이 맞는지 확인해 주세요';
