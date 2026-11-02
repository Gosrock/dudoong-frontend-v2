import { CHECK_IN_TICKET_NO_MAX, CHECK_IN_TICKET_UUID_MAX } from '@/api/check-in/schema';
import { getErrorCode, getErrorStatus, isValidationError } from '@/api/errors';
import type { EventStatus } from '@/api/event/schema';

/**
 * QR 체크인(`/hosting/events/[eventId]/qr`, plan P13b) 규칙 — 공연 상태별 안내, 스캔 값 정리, 연속 스캔 스로틀, PQ-2 실패 분류,
 * 셀프 체크인 QR 주소. 근거: 백엔드 `V2CheckInDomainService`(호스트 스캔 OPEN·CALCULATING, 셀프 OPEN만)·`V2CheckInUseCase.qr`
 * (`qrPath`, origin은 프론트)·`V2OperationRequests.kt`(uuid 64자), patterns §19(연속 스캔)·§24 P13b 행. 문구는 모두 잠정(V에서 디자인 문구로).
 */

// ─── 공연 상태별 안내 ────────────────────────────────────────

/** 입장 처리를 막는 이유. `notRegistered` 준비중, `ended` 지난 공연·지운 공연, `unknown` 모르는 상태 */
export type CheckInBlock = 'notRegistered' | 'ended' | 'unknown';

/**
 * [호스트가 스캔] — 등록(OPEN)·정산중(CALCULATING, 공연 종료 직후 지각 입장)만 된다. 그 밖은 서버가 `Event_400_27`.
 * 모르는 상태(`UNKNOWN`)도 막는다(서버가 상태를 늘려도 요청을 보내 400을 받지 않게 — 공연 스코프 읽기 전용과 같은 규칙)
 */
export function hostScanBlockOf(status: EventStatus): CheckInBlock | null {
  if (status === 'OPEN' || status === 'CALCULATING') return null;
  if (status === 'PREPARING') return 'notRegistered';
  if (status === 'CLOSED' || status === 'DELETED') return 'ended';
  return 'unknown';
}

export const HOST_SCAN_BLOCK_MESSAGE: Record<CheckInBlock, string> = {
  notRegistered: '공연을 등록해야 입장 처리를 할 수 있어요',
  ended: '지난 공연은 입장 처리를 할 수 없어요',
  unknown: '지금은 입장 처리를 할 수 없는 공연 상태예요',
};

/** `Event_400_27`(스캔 사이에 공연 상태가 바뀜) 안내 */
export const EVENT_NOT_CHECKABLE_MESSAGE = '준비중이거나 지난 공연은 입장 처리를 할 수 없어요';

/**
 * [관객이 스캔] — 셀프 체크인(PQ-5)은 OPEN 공연만 된다(시작 전에도). 정산중·지난 공연이면 관객이 찍어도 `Event_400_5`라
 * QR을 띄우지 않고 안내한다. 판정은 표시 상태가 아니라 `status` — 종료 시각이 지났어도 아직 OPEN이면 서버는 받는다
 */
export function selfCheckInBlockOf(status: EventStatus): CheckInBlock | null {
  if (status === 'OPEN') return null;
  if (status === 'PREPARING') return 'notRegistered';
  if (status === 'CALCULATING' || status === 'CLOSED' || status === 'DELETED') return 'ended';
  return 'unknown';
}

export const SELF_CHECK_IN_BLOCK_MESSAGE: Record<CheckInBlock, string> = {
  notRegistered: '공연을 등록해야 셀프 체크인을 할 수 있어요',
  ended: '공연이 끝나면(정산중·지난 공연) 셀프 체크인이 안 돼요',
  unknown: '지금은 셀프 체크인을 할 수 없는 공연 상태예요',
};

/** 공연이 끝나 셀프 체크인이 안 될 때 덧붙이는 다음 행동 */
export const SELF_CHECK_IN_ENDED_HINT =
  '[호스트가 스캔]으로 관객 티켓 QR을 찍어 입장 처리해 주세요';

// ─── 셀프 체크인 QR 주소(GQ-4) ────────────────────────────────

/**
 * QR에 넣을 주소 = 프론트 origin + `qrPath`(`/check-in?token=…`). `qrPath`가 같은 출처 상대 경로(`/`로 시작, `//`·`/\` 아님)가
 * 아니거나 origin이 http(s)가 아니면 `null` — 남의 주소로 가는 QR을 만들지 않는다
 */
export function selfCheckInUrl(origin: string, qrPath: string): string | null {
  if (!/^https?:\/\/[^/?#\s]+$/.test(origin)) return null;
  if (!qrPath.startsWith('/') || qrPath.startsWith('//') || qrPath.startsWith('/\\')) return null;
  if ([...qrPath].some((c) => c.charCodeAt(0) <= 0x20 || c === '\u007f')) return null;
  return `${origin}${qrPath}`;
}

// ─── 스캔 값 ────────────────────────────────────────────────

export type ScanValue =
  /** 빈 값(앞뒤 공백 제외) — 무시 */
  | { kind: 'empty' }
  /** 티켓 QR이 아니다(64자 넘음 — 서버도 400 `BAD_REQUEST`). 요청하지 않는다 */
  | { kind: 'invalid' }
  | { kind: 'ticket'; ticketUuid: string };

/**
 * 카메라·입력 값 → PQ-2 `ticketUuid`. QR 값 = 티켓 uuid(G11/T-2 `qrValue`). 64자 이하면 모양을 따지지 않고 보낸다 —
 * 없는 uuid·다른 공연 티켓은 서버가 200 + `OTHER_EVENT`로 판정한다
 */
export function normalizeScanValue(raw: string): ScanValue {
  const value = raw.trim();
  if (!value) return { kind: 'empty' };
  if (value.length > CHECK_IN_TICKET_UUID_MAX) return { kind: 'invalid' };
  return { kind: 'ticket', ticketUuid: value };
}

// ─── 티켓 번호 입력(PQ-2b — 백엔드 #926) ─────────────────────

export type TicketNoInput =
  | { kind: 'empty' }
  /** 20자 넘음(서버 400 `BAD_REQUEST`) — 보내지 않는다 */
  | { kind: 'invalid' }
  | { kind: 'ticketNo'; ticketNo: string };

/**
 * 입력 → PQ-2b `ticketNo`. 앞뒤 공백만 뺀다 — 대소문자 · 숫자만 입력(`1000118` → `T1000118`)은 서버가 맞춘다.
 * 모양은 따지지 않는다: 없는 번호는 서버가 200 + `OTHER_EVENT`로 판정한다
 */
export function normalizeTicketNoInput(raw: string): TicketNoInput {
  const value = raw.trim();
  if (!value) return { kind: 'empty' };
  if (value.length > CHECK_IN_TICKET_NO_MAX) return { kind: 'invalid' };
  return { kind: 'ticketNo', ticketNo: value };
}

/** 번호 입력 칸 오류(빈 값 · 너무 김 · 서버 400). 🤖 문구 */
export const TICKET_NO_INVALID_MESSAGE = '티켓 번호를 확인해 주세요 (예: T1000118)';

// ─── 연속 스캔 스로틀(patterns §19) ──────────────────────────

/** 같은 값의 재인식을 무시하는 시간(ms). 잠정 */
export const SCAN_COOLDOWN_MS = 3000;

/** 마지막으로 보낸 값과 끝난 시각(요청 중이면 보낸 시각) */
export type LastScan = { value: string; at: number };

/** 같은 값을 쿨다운 안에 다시 인식했는지 — 카메라가 같은 QR을 계속 읽어도 한 번만 보낸다 */
export const isRepeatedScan = (
  value: string,
  last: LastScan | null,
  now: number,
  cooldownMs = SCAN_COOLDOWN_MS,
) => last !== null && last.value === value && now - last.at < cooldownMs;

// ─── PQ-2 실패 분류 ──────────────────────────────────────────

export type HostScanFailureKind = 'network' | 'server' | 'forbidden' | 'notFound';

export type HostScanFailure = {
  kind: HostScanFailureKind;
  message: string;
  /** 같은 값을 다시 보낼 수 있는지 */
  canRetry: boolean;
};

export const HOST_SCAN_FAILURES: Record<HostScanFailureKind, HostScanFailure> = {
  network: {
    kind: 'network',
    message:
      '네트워크에 연결되지 않아 입장 처리를 하지 못했어요. 연결을 확인하고 다시 시도해 주세요',
    canRetry: true,
  },
  server: {
    kind: 'server',
    message: '입장 처리를 하지 못했어요. 잠시 후 다시 시도해 주세요',
    canRetry: true,
  },
  forbidden: {
    kind: 'forbidden',
    message: '이 공연의 입장 처리 권한이 없어요',
    canRetry: false,
  },
  notFound: {
    kind: 'notFound',
    message: '공연을 찾을 수 없어요',
    canRetry: false,
  },
};

/** PQ-2 에러 → 화면 분기. 결과(`result`)는 200이라 여기 오지 않는다 */
export type HostScanErrorOutcome =
  | { kind: 'eventNotCheckable' }
  | { kind: 'invalidQr' }
  | { kind: 'failed'; failure: HostScanFailure };

export function hostScanErrorOutcome(e: unknown): HostScanErrorOutcome {
  const code = getErrorCode(e);
  const status = getErrorStatus(e);
  if (code === 'Event_400_27') return { kind: 'eventNotCheckable' };
  if (isValidationError(e)) return { kind: 'invalidQr' };
  if (status === 0) return { kind: 'failed', failure: HOST_SCAN_FAILURES.network };
  if (status === 403) return { kind: 'failed', failure: HOST_SCAN_FAILURES.forbidden };
  if (status === 404) return { kind: 'failed', failure: HOST_SCAN_FAILURES.notFound };
  return { kind: 'failed', failure: HOST_SCAN_FAILURES.server };
}
