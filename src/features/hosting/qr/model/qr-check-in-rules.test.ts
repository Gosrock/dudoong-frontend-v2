import { describe, expect, it } from 'vitest';

import { ApiError } from '@/api/errors';

import {
  hostScanBlockOf,
  hostScanErrorOutcome,
  isRepeatedScan,
  normalizeScanValue,
  SCAN_COOLDOWN_MS,
  SELF_CHECK_IN_BLOCK_MESSAGE,
  selfCheckInBlockOf,
  selfCheckInUrl,
} from './qr-check-in-rules';

describe('공연 상태별 안내', () => {
  it.each([
    ['OPEN', null],
    ['CALCULATING', null],
    ['PREPARING', 'notRegistered'],
    ['CLOSED', 'ended'],
    ['DELETED', 'ended'],
    ['UNKNOWN', 'unknown'],
  ] as const)('[호스트가 스캔] %s → %s(OPEN·정산중만 — 그 밖은 Event_400_27)', (status, block) => {
    expect(hostScanBlockOf(status)).toBe(block);
  });

  it.each([
    ['OPEN', null],
    ['CALCULATING', 'ended'],
    ['CLOSED', 'ended'],
    ['DELETED', 'ended'],
    ['PREPARING', 'notRegistered'],
    ['UNKNOWN', 'unknown'],
  ] as const)('[관객이 스캔] %s → %s(셀프 체크인은 OPEN만)', (status, block) => {
    expect(selfCheckInBlockOf(status)).toBe(block);
  });

  it('공연이 끝나면 plan 문구로 안내한다', () => {
    expect(SELF_CHECK_IN_BLOCK_MESSAGE.ended).toBe(
      '공연이 끝나면(정산중·지난 공연) 셀프 체크인이 안 돼요',
    );
  });
});

describe('셀프 체크인 QR 주소 = origin + qrPath', () => {
  it.each([
    ['https://dudoong.com', '/check-in?token=abc', 'https://dudoong.com/check-in?token=abc'],
    [
      'http://localhost:3000',
      '/check-in?token=a%2Bb',
      'http://localhost:3000/check-in?token=a%2Bb',
    ],
    ['https://dudoong.com', '//evil.test/check-in', null],
    ['https://dudoong.com', '/\\evil.test', null],
    ['https://dudoong.com', 'https://evil.test/check-in', null],
    ['https://dudoong.com', '/check-in?token=a b', null],
    ['', '/check-in?token=abc', null],
    ['https://dudoong.com/', '/check-in?token=abc', null],
    ['javascript:alert(1)', '/check-in', null],
  ])('%s + %s → %s', (origin, path, url) => {
    expect(selfCheckInUrl(origin, path)).toBe(url);
  });
});

describe('스캔 값', () => {
  it.each([
    ['  mock-ticket-a1 ', { kind: 'ticket', ticketUuid: 'mock-ticket-a1' }],
    ['', { kind: 'empty' }],
    ['   ', { kind: 'empty' }],
    ['a'.repeat(64), { kind: 'ticket', ticketUuid: 'a'.repeat(64) }],
    ['a'.repeat(65), { kind: 'invalid' }],
    ['https://dudoong.com/check-in?token=' + 'x'.repeat(43), { kind: 'invalid' }],
  ])('%j → %j', (raw, expected) => {
    expect(normalizeScanValue(raw)).toEqual(expected);
  });
});

describe('연속 스캔 스로틀', () => {
  it.each([
    ['처음', null, 0, false],
    ['같은 값, 쿨다운 안', { value: 'a', at: 1000 }, 1000 + SCAN_COOLDOWN_MS - 1, true],
    ['같은 값, 쿨다운 경계', { value: 'a', at: 1000 }, 1000 + SCAN_COOLDOWN_MS, false],
    ['다른 값', { value: 'b', at: 1000 }, 1001, false],
  ] as const)('%s → 무시 %s', (_, last, now, ignored) => {
    expect(isRepeatedScan('a', last, now)).toBe(ignored);
  });
});

describe('PQ-2 실패 분류', () => {
  it.each([
    [new ApiError(400, 'Event_400_27', ''), { kind: 'eventNotCheckable' }],
    [new ApiError(400, 'BAD_REQUEST', '{}'), { kind: 'invalidQr' }],
    [
      new ApiError(0, 'NETWORK', ''),
      { kind: 'failed', failure: { kind: 'network', canRetry: true } },
    ],
    [
      new ApiError(0, 'TIMEOUT', ''),
      { kind: 'failed', failure: { kind: 'network', canRetry: true } },
    ],
    [
      new ApiError(500, 'GLOBAL_500_1', ''),
      { kind: 'failed', failure: { kind: 'server', canRetry: true } },
    ],
    [
      new ApiError(200, 'PARSE_ERROR', ''),
      { kind: 'failed', failure: { kind: 'server', canRetry: true } },
    ],
    [
      new ApiError(403, 'HOST_400_2', ''),
      { kind: 'failed', failure: { kind: 'forbidden', canRetry: false } },
    ],
    [
      new ApiError(404, 'Event_404_1', ''),
      { kind: 'failed', failure: { kind: 'notFound', canRetry: false } },
    ],
    [new Error('x'), { kind: 'failed', failure: { kind: 'server', canRetry: true } }],
  ])('%s', (e, expected) => {
    expect(hostScanErrorOutcome(e)).toMatchObject(expected);
  });
});
