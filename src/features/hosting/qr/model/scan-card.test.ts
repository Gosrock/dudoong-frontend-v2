import { describe, expect, it } from 'vitest';

import { HOST_SCAN_FAILURES } from '@/features/hosting/shared/model/qr-check-in-rules';
import { checkInResultView } from '@/features/shared/checkin-result/model/checkin-result';

import { hostScanCard, ticketNoCard } from './scan-card';
import type { HostScanState } from './useHostScan';

const ticket = {
  ticketUuid: 'u1',
  issuedTicketNo: 'T1000118',
  ticketName: '새내기 티켓',
  buyerName: '주문자',
  ownerName: '김두둥',
  entrance: 'DONE' as const,
  enteredAt: '2026.10.17 18:40',
};
const result = (r: string): HostScanState => {
  const view = checkInResultView(
    { result: r as never, ticket: r === 'OTHER_EVENT' ? null : ticket, candidates: [] },
    'host',
  );
  if (view.kind !== 'result') throw new Error('select');
  return { status: 'result', value: 'u1', view };
};

/** 매핑 가이드 `1411:7760` 표 — 기존 번호 · 카드 · 톤 · 티켓 정보 · 버튼 */
describe('QR 결과 → 카드(P13b-GUI 매핑 가이드)', () => {
  it.each([
    [
      '0 확인 중',
      { status: 'checking', value: 'u1' } as HostScanState,
      'checking',
      'checking',
      false,
      'none',
    ],
    ['1 입장 완료', result('ENTERED'), 'entered', 'success', true, 'next'],
    ['2 이미 입장', result('ALREADY_ENTERED'), 'alreadyEntered', 'warning', true, 'next'],
    ['3 선물 대기', result('GIFT_PENDING'), 'giftPending', 'warning', true, 'next'],
    ['4 취소된 티켓', result('CANCELED'), 'canceled', 'error', true, 'next'],
    ['5 다른 공연', result('OTHER_EVENT'), 'notThisEvent', 'error', false, 'next'],
    [
      '7 티켓 QR 아님',
      { status: 'invalidQr' } as HostScanState,
      'notThisEvent',
      'error',
      false,
      'next',
    ],
    ['6 알 수 없는 결과', result('WHAT'), 'failed', 'error', false, 'retry'],
    [
      '9 네트워크',
      { status: 'failed', value: 'u1', failure: HOST_SCAN_FAILURES.network } as HostScanState,
      'failed',
      'error',
      false,
      'retry',
    ],
    [
      '10 서버',
      { status: 'failed', value: 'u1', failure: HOST_SCAN_FAILURES.server } as HostScanState,
      'failed',
      'error',
      false,
      'retry',
    ],
    [
      '8 준비중 · 지난 공연',
      { status: 'eventNotCheckable', message: 'x' } as HostScanState,
      'eventNotCheckable',
      'error',
      false,
      'next',
    ],
    [
      '11 권한 없음',
      { status: 'failed', value: 'u1', failure: HOST_SCAN_FAILURES.forbidden } as HostScanState,
      'forbidden',
      'error',
      false,
      'next',
    ],
    [
      '12 공연 없음',
      { status: 'failed', value: 'u1', failure: HOST_SCAN_FAILURES.notFound } as HostScanState,
      'notFound',
      'error',
      false,
      'next',
    ],
  ] as const)('%s', (_, state, kind, tone, hasTicket, action) => {
    const card = hostScanCard(state)!;
    expect(card).toMatchObject({ kind, tone, action });
    expect(card.ticket !== null).toBe(hasTicket);
  });

  it('기다림은 카드 없음 · 묶은 카드도 원인은 남긴다', () => {
    expect(hostScanCard({ status: 'idle' })).toBeNull();
    expect(hostScanCard(result('WHAT'))?.cause).toBe('UNKNOWN');
    expect(
      hostScanCard({ status: 'failed', value: 'u1', failure: HOST_SCAN_FAILURES.network })?.cause,
    ).toBe('network');
  });

  it('문구 — 이미 입장은 "{입장 시각} 입장", 실패는 "잠시 후 다시 시도해 주세요"', () => {
    expect(hostScanCard(result('ALREADY_ENTERED'))).toMatchObject({
      title: '이미 입장한 티켓이에요',
      description: '2026.10.17 18:40 입장',
    });
    expect(hostScanCard({ status: 'invalidQr' })?.title).toBe('이 공연 티켓이 아니에요');
    expect(hostScanCard(result('WHAT'))).toMatchObject({
      title: '입장 처리를 하지 못했어요',
      description: '잠시 후 다시 시도해 주세요',
    });
  });
});

describe('티켓 번호 결과 카드', () => {
  it('입장 완료는 "본인이 맞는지 확인해 주세요", 버튼은 없다(다시 시도는 [입장 처리])', () => {
    const r = result('ENTERED');
    if (r.status !== 'result') throw new Error();
    expect(
      ticketNoCard({ status: 'result', ticketNo: 'T1', view: r.view, ticketUuid: 'u1' }),
    ).toMatchObject({
      kind: 'entered',
      description: '본인이 맞는지 확인해 주세요',
      action: 'none',
    });
    expect(
      ticketNoCard({ status: 'failed', ticketNo: 'T1', failure: HOST_SCAN_FAILURES.network }),
    ).toMatchObject({ kind: 'failed', action: 'none' });
  });

  it('처리 중 · 번호 형식 오류 · 기다림은 카드 없음', () => {
    expect(ticketNoCard({ status: 'checking', ticketNo: 'T1' })).toBeNull();
    expect(ticketNoCard({ status: 'invalid', message: 'x' })).toBeNull();
    expect(ticketNoCard({ status: 'idle' })).toBeNull();
  });
});
