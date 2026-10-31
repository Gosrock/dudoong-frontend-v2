import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installLoggedInFetch } from '@/test/login-fetch';

import { setStoredStatus } from '../__mocks__/event-store';
import {
  CHECK_IN_TOKEN,
  markTicketCanceled,
  resetTicketStore as resetMyTicketStore,
  TICKET_UUID,
} from '../__mocks__/fixtures/my-ticket';
import { resetHostMockState } from '../__mocks__/host.handlers';
import { actAsRole } from '../__mocks__/host-store';
import { resetHostingStore } from '../__mocks__/hosting.handlers';
import { ApiError } from '../errors';
import { hostCheckInMutation, selfCheckInMutation } from './mutations';
import { checkInQrQuery, checkInStatsQuery } from './queries';
import { CheckInQrSchema, CheckInStatsSchema, HostCheckInRequestSchema } from './schema';

/**
 * P13b — GQ-1 · PQ-2 · GQ-4 정의 + mock + 스키마가 맞물리는지(실제 `api`·zod 파싱을 탄다).
 * mock은 백엔드 `V2IssuedTicketController`·`V2CheckInUseCase`·`V2CheckInDomainService`(432cce4 = cb8d24e)의 검사 순서·코드를 따른다.
 */

const reset = () => {
  resetHostMockState();
  resetHostingStore();
  resetMyTicketStore();
};
let restore: () => void;
beforeEach(() => {
  reset();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
  reset();
});

const call = <V>(m: { mutationFn?: (v: V, c: never) => Promise<unknown> }, v: V) =>
  m.mutationFn!(v, {} as never);
const get = <T>(q: { queryFn?: unknown }) =>
  (q.queryFn as (c: { signal: AbortSignal }) => Promise<T>)({
    signal: new AbortController().signal,
  });
const codeOf = (p: Promise<unknown>): Promise<[number, string] | null> =>
  p.then(
    () => null,
    (e: unknown) => {
      if (e instanceof ApiError) return [e.status, e.code];
      throw e;
    },
  );
const scan = (eventId: number | string, ticketUuid: string) =>
  call(hostCheckInMutation(eventId), { ticketUuid });

/** 고스락(11, mock 사용자 마스터)의 OPEN 공연 — 발급 7장(내 주문 a 3장 + 다른 사람 주문 g 4장), 모두 입장 전 */
const OPEN = 101;

describe('스키마', () => {
  it('GQ-1 · GQ-4 응답(백엔드 DTO 예시)', () => {
    expect(
      CheckInStatsSchema.parse({
        issuedCount: 7,
        enteredCount: 3,
        notEnteredCount: 4,
        entranceRate: 42.9,
      }),
    ).toMatchObject({ entranceRate: 42.9 });
    expect(CheckInQrSchema.parse({ token: 'abc', qrPath: '/check-in?token=abc' })).toEqual({
      token: 'abc',
      qrPath: '/check-in?token=abc',
    });
  });

  it.each([
    [{ ticketUuid: ' u1 ' }, true],
    [{ ticketUuid: '' }, false],
    [{ ticketUuid: 'a'.repeat(65) }, false],
    [{ ticketUuid: 'u1', extra: 1 }, false],
  ])('PQ-2 본문 %j → %s', (body, ok) => {
    expect(HostCheckInRequestSchema.safeParse(body).success).toBe(ok);
  });

  it('키는 GE-3 아래', () => {
    expect(checkInStatsQuery(OPEN).queryKey).toEqual([
      'events',
      '101',
      'manage',
      'check-ins',
      'stats',
    ]);
    expect(checkInQrQuery(OPEN).queryKey).toEqual(['events', '101', 'manage', 'check-in-qr']);
  });
});

describe('GQ-1 통계', () => {
  it('발급 = 입장 전 + 입장 완료(취소 제외), 입장률 소수 첫째 자리', async () => {
    expect(await get(checkInStatsQuery(OPEN))).toEqual({
      issuedCount: 7,
      enteredCount: 0,
      notEnteredCount: 7,
      entranceRate: 0,
    });
    // 지난 공연 90: 3장 중 1장 입장
    expect(await get(checkInStatsQuery(90))).toEqual({
      issuedCount: 3,
      enteredCount: 1,
      notEnteredCount: 2,
      entranceRate: 33.3,
    });
  });

  it('발급 0이면 0/0, 입장률 0', async () => {
    expect(await get(checkInStatsQuery(140))).toEqual({
      issuedCount: 0,
      enteredCount: 0,
      notEnteredCount: 0,
      entranceRate: 0,
    });
  });

  it('일반 멤버도 읽는다 · 비멤버 403 · 없는 공연 404', async () => {
    actAsRole(11, 'GUEST');
    expect(await codeOf(get(checkInStatsQuery(OPEN)))).toBeNull();
    expect(await codeOf(get(checkInStatsQuery(102)))).toEqual([403, 'HOST_400_2']);
    expect(await codeOf(get(checkInStatsQuery(99999)))).toEqual([404, 'Event_404_1']);
  });
});

describe('PQ-2 호스트 스캔(실패도 200 + result)', () => {
  it('result 5종 — 입장 · 이미 입장 · 다른 공연 · 취소 · 선물 대기', async () => {
    markTicketCanceled('mock-ticket-g3');
    expect(await scan(OPEN, TICKET_UUID.approved)).toMatchObject({
      result: 'ENTERED',
      ticket: { ticketUuid: TICKET_UUID.approved, entrance: 'DONE' },
    });
    expect(await scan(OPEN, TICKET_UUID.approved)).toMatchObject({ result: 'ALREADY_ENTERED' });
    expect(await scan(OPEN, TICKET_UUID.single)).toEqual({
      result: 'OTHER_EVENT',
      ticket: null,
      candidates: [],
    });
    expect(await scan(OPEN, 'no-such-ticket')).toMatchObject({
      result: 'OTHER_EVENT',
      ticket: null,
    });
    expect(await scan(OPEN, 'mock-ticket-g3')).toMatchObject({ result: 'CANCELED' });
    expect(await scan(OPEN, TICKET_UUID.giftPending)).toMatchObject({
      result: 'GIFT_PENDING',
      ticket: { entrance: 'BEFORE' },
    });
  });

  it('입장하면 GQ-1이 바뀐다', async () => {
    await scan(OPEN, TICKET_UUID.approved);
    expect(await get(checkInStatsQuery(OPEN))).toEqual({
      issuedCount: 7,
      enteredCount: 1,
      notEnteredCount: 6,
      entranceRate: 14.3,
    });
  });

  it.each([
    ['CALCULATING', null],
    ['CLOSED', [400, 'Event_400_27']],
    ['PREPARING', [400, 'Event_400_27']],
  ] as const)('공연 %s → %j(OPEN·정산중만)', async (status, code) => {
    setStoredStatus(OPEN, status);
    expect(await codeOf(scan(OPEN, TICKET_UUID.approved))).toEqual(code);
  });

  it('검사 순서: 본문 검증(400 BAD_REQUEST) → 비멤버 403 → 공연 상태', async () => {
    expect(await codeOf(scan(102, 'a'.repeat(65)))).toEqual([400, 'BAD_REQUEST']);
    expect(await codeOf(scan(102, ' '))).toEqual([400, 'BAD_REQUEST']);
    expect(await codeOf(scan(102, TICKET_UUID.approved))).toEqual([403, 'HOST_400_2']);
    expect(await codeOf(scan('abc', TICKET_UUID.approved))).toEqual([400, 'BAD_REQUEST']);
    setStoredStatus(90, 'CLOSED');
    expect(await codeOf(scan(90, TICKET_UUID.entered))).toEqual([400, 'Event_400_27']);
  });

  it('일반 멤버도 입장 처리한다', async () => {
    actAsRole(11, 'GUEST');
    expect(await scan(OPEN, TICKET_UUID.approved)).toMatchObject({ result: 'ENTERED' });
  });
});

describe('GQ-4 셀프 체크인 QR', () => {
  it('공연별 고정 토큰 · qrPath = /check-in?token=…', async () => {
    expect(await get(checkInQrQuery(OPEN))).toEqual({
      token: CHECK_IN_TOKEN.multi,
      qrPath: `/check-in?token=${CHECK_IN_TOKEN.multi}`,
    });
  });

  it('토큰이 없던 공연은 만들고, 그 토큰으로 PQ-5가 된다', async () => {
    const { token, qrPath } = await get<{ token: string; qrPath: string }>(checkInQrQuery(140));
    expect(qrPath).toBe(`/check-in?token=${encodeURIComponent(token)}`);
    expect(await get(checkInQrQuery(140))).toMatchObject({ token });
    // 준비중 공연이라 셀프 체크인은 OPEN 검사에서 막힌다(토큰은 유효 — Event_400_26이 아니다)
    expect(await codeOf(call(selfCheckInMutation(), { token }))).toEqual([400, 'Event_400_5']);
  });

  it('공연 상태를 보지 않는다(지난 공연도 200) · 비멤버 403', async () => {
    expect(await codeOf(get(checkInQrQuery(90)))).toBeNull();
    expect(await codeOf(get(checkInQrQuery(102)))).toEqual([403, 'HOST_400_2']);
  });
});
