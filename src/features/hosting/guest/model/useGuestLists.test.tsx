import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addPendingOrders, GUEST_ORDER } from '@/api/__mocks__/guest-store';
import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { actAsRole } from '@/api/__mocks__/host-store';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { hostingGuestHandlers } from '@/api/__mocks__/hosting-guest.handlers';
import { server } from '@/api/__mocks__/server';
import { errorToast } from '@/test/error-toast';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';
import { saveBlob } from '@/utils/download';

import { EXACT_MATCH_HINT, EXPORT_TOO_MANY_MESSAGE, TICKET_MISSING_MESSAGE } from './guest-rules';
import { useIssuedTicketList } from './useIssuedTicketList';
import { useOrderList } from './useOrderList';
import { useRefundList } from './useRefundList';

vi.mock('@/utils/download', () => ({ saveBlob: vi.fn() }));

let restore: () => void;
beforeEach(() => {
  resetHostMockState();
  resetHostingStore();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(saveBlob).mockReset();
  restore();
  resetHostMockState();
  resetHostingStore();
});

function setup<T>(use: () => T) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="불러오는 중">{children}</Suspense>
    </QueryClientProvider>
  );
  return { ...renderHook(use, { wrapper }), queryClient };
}

describe('주문 탭(GR-1)', () => {
  it('상태 탭 5개(주문 실패 없음) — 탭을 바꾸면 첫 페이지부터, 건수는 그대로', async () => {
    addPendingOrders(101, 25);
    const { result } = setup(() => useOrderList('101'));
    await waitFor(() => expect(result.current?.status).toBe('success'));
    expect(result.current.statusTabs.map((t) => t.key)).toEqual([
      'ALL',
      'PENDING_APPROVE',
      'APPROVED',
      'REFUSED',
      'CANCELED',
    ]);
    expect([result.current.rows.length, result.current.totalPages]).toEqual([20, 2]);
    act(() => result.current.setPage(1));
    await waitFor(() => expect(result.current.rows).toHaveLength(14));
    const sent = recordRequests();
    act(() => result.current.setStatus('REFUSED'));
    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(result.current.page).toBe(0);
    expect((await sent.list()).map((r) => r.query)).toEqual([{ status: 'REFUSED' }]);
    expect(result.current.statusTabs[0]!.count).toBe(34);
  });

  it('검색: 적용해야 보내고, 기준·검색어가 요청에 실린다', async () => {
    const { result } = setup(() => useOrderList('101'));
    await waitFor(() => expect(result.current?.status).toBe('success'));
    act(() => {
      result.current.setSearchType('DEPOSITOR_NAME');
      result.current.setKeywordInput(' 엄마 ');
    });
    const sent = recordRequests();
    act(() => result.current.submitSearch());
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect((await sent.list())[0]!.query).toEqual({
      keyword: '엄마',
      searchType: 'DEPOSITOR_NAME',
    });
    expect(result.current.exactMatchHint).toBeNull();
  });

  it('일반 멤버: 엑셀 없음, 연락처·입금자명 검색에 완전 일치 안내, 가린 값 그대로', async () => {
    actAsRole(11, 'GUEST');
    const { result } = setup(() => useOrderList('101'));
    await waitFor(() => expect(result.current?.status).toBe('success'));
    expect(result.current.canExport).toBe(false);
    expect(result.current.exactMatchHint).toBeNull();
    act(() => result.current.setSearchType('PHONE'));
    expect(result.current.exactMatchHint).toBe(EXACT_MATCH_HINT);
    expect(result.current.rows.find((o) => o.orderUuid === GUEST_ORDER.pendingToss)).toMatchObject({
      buyerPhone: '010-****-7890',
      depositorName: '이***마',
    });
    const sent = recordRequests();
    await act(async () => {
      await result.current.exportExcel();
    });
    expect(await sent.list()).toEqual([]);
  });

  it('엑셀(매니저): 지금 필터로 xlsx를 받아 저장, 1만 행 초과는 안내(공용 토스트 없음)', async () => {
    const { result } = setup(() => useOrderList('101'));
    await waitFor(() => expect(result.current?.status).toBe('success'));
    act(() => result.current.setStatus('APPROVED'));
    const sent = recordRequests();
    let ok = false;
    await act(async () => {
      ok = await result.current.exportExcel();
    });
    expect(ok).toBe(true);
    expect((await sent.list()).find((r) => r.path.endsWith('/export'))?.query).toEqual({
      status: 'APPROVED',
    });
    expect(vi.mocked(saveBlob).mock.calls[0]?.slice(1)).toEqual([
      'orders-101.xlsx',
      'orders-101.xlsx',
    ]);
    server.use(...hostingGuestHandlers.exportTooMany);
    await act(async () => {
      ok = await result.current.exportExcel();
    });
    expect([ok, result.current.exportError]).toEqual([false, EXPORT_TOO_MANY_MESSAGE]);
    expect(errorToast).not.toHaveBeenCalled();
  });
  it('엑셀 403 HOST_400_1(화면을 연 뒤 일반 멤버가 됨) → GE-3 다시 읽기 → 엑셀 버튼이 사라진다(403은 공용 토스트)', async () => {
    const { result } = setup(() => useOrderList('101'));
    await waitFor(() => expect(result.current?.status).toBe('success'));
    expect(result.current.canExport).toBe(true);
    actAsRole(11, 'GUEST');
    const sent = recordRequests();
    let ok = true;
    await act(async () => {
      ok = await result.current.exportExcel();
    });
    expect(ok).toBe(false);
    expect(errorToast).toHaveBeenCalledWith(expect.any(String), 'mutation:HOST_400_1');
    await waitFor(() => expect(result.current.canExport).toBe(false));
    expect(await sent.lines()).toContain('GET /api/v2/events/101/manage');
  });
});

describe('발급된 티켓 탭(GI-1 · GI-2 · GI-3)', () => {
  it('입장 필터별 건수 + 필터를 바꾸면 그 행만, 검색은 현재 소유자', async () => {
    const { result } = setup(() => useIssuedTicketList('101'));
    await waitFor(() => expect(result.current?.status).toBe('success'));
    expect(result.current.entranceFilters.map((f) => [f.key, f.count])).toEqual([
      ['ALL', 3],
      ['BEFORE', 2],
      ['DONE', 1],
    ]);
    act(() => result.current.setEntrance('DONE'));
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    act(() => {
      result.current.setEntrance('ALL');
      result.current.setKeywordInput('최유진');
    });
    act(() => result.current.submitSearch());
    await waitFor(() => expect(result.current.rows.map((t) => t.ownerName)).toEqual(['최유진']));
  });

  it('상세: 열면 GI-2, 없는 티켓(404)은 닫고 목록을 다시 읽는다', async () => {
    const { result } = setup(() => useIssuedTicketList('101'));
    await waitFor(() => expect(result.current?.status).toBe('success'));
    act(() => result.current.openTicket(`${GUEST_ORDER.approved}-t1`));
    await waitFor(() => expect(result.current.detail?.ticket.entrance).toBe('DONE'));
    const sent = recordRequests();
    act(() => result.current.openTicket('no-such-ticket'));
    await waitFor(() => expect(result.current.missingNotice).toBe(TICKET_MISSING_MESSAGE));
    expect(result.current.selectedTicketUuid).toBeNull();
    await waitFor(async () =>
      expect(await sent.lines()).toContain('GET /api/v2/events/101/issued-tickets'),
    );
  });

  it('수동 입장 처리(#106 §5): 입장 전 티켓을 PQ-2로 입장시키고 목록·상세를 다시 읽는다', async () => {
    const { result } = setup(() => useIssuedTicketList('101'));
    await waitFor(() => expect(result.current?.status).toBe('success'));
    expect(result.current.canManualCheckIn).toBe(true);
    expect(result.current.checkInBlockMessage).toBeNull();
    const before = result.current.rows.find((t) => t.entrance === 'BEFORE')!;
    act(() => result.current.openTicket(before.ticketUuid!));
    await waitFor(() => expect(result.current.detail?.ticket.entrance).toBe('BEFORE'));
    const sent = recordRequests();
    let view: Awaited<ReturnType<typeof result.current.manualCheckIn>> = null;
    await act(async () => {
      view = await result.current.manualCheckIn(before.ticketUuid!);
    });
    expect(view).toMatchObject({ kind: 'result', result: 'ENTERED', title: '입장 완료' });
    expect((await sent.list())[0]).toMatchObject({
      method: 'POST',
      path: '/api/v2/events/101/check-ins',
    });
    await waitFor(() => expect(result.current.detail?.ticket.entrance).toBe('DONE'));
    // 같은 티켓을 또 누르면 서버 판정(이미 입장)을 그대로 보여 준다
    await act(async () => {
      view = await result.current.manualCheckIn(before.ticketUuid!);
    });
    expect(view).toMatchObject({ result: 'ALREADY_ENTERED' });
  });

  it('일반 멤버: 엑셀 없음, 연락처 검색 안내', async () => {
    actAsRole(11, 'GUEST');
    const { result } = setup(() => useIssuedTicketList('101'));
    await waitFor(() => expect(result.current?.status).toBe('success'));
    expect(result.current.canExport).toBe(false);
    act(() => result.current.setSearchType('PHONE'));
    expect(result.current.exactMatchHint).toBe(EXACT_MATCH_HINT);
  });

  it('엑셀 1만 행 초과 안내(IssuedTicket_400_7)', async () => {
    server.use(...hostingGuestHandlers.exportTooMany);
    const { result } = setup(() => useIssuedTicketList('101'));
    await waitFor(() => expect(result.current?.status).toBe('success'));
    await act(async () => {
      await result.current.exportExcel();
    });
    expect(result.current.exportError).toBe(EXPORT_TOO_MANY_MESSAGE);
  });
});

describe('환불 탭(GF-1 · PF-2)', () => {
  it('[환불 완료]는 REQUESTED + 매니저만 — 누르면 COMPLETED로, 필터는 요청에 실린다', async () => {
    const { result } = setup(() => useRefundList('101'));
    await waitFor(() => expect(result.current?.status).toBe('success'));
    expect(result.current.rows.map((r) => [r.refund.orderUuid, r.canComplete])).toEqual([
      [GUEST_ORDER.userRefunded, true],
      [GUEST_ORDER.hostCanceled, true],
      [GUEST_ORDER.refusedEtc, false],
      [GUEST_ORDER.refusedDeposit, true],
    ]);
    await act(async () => {
      await result.current.complete(GUEST_ORDER.userRefunded);
    });
    // 다시 읽기를 기다리지 않아도 행은 응답으로 바로 바뀐다(#106 §5 — 누른 뒤 목록이 그대로이던 것)
    expect(result.current.rows[0]!.refund.refundStatus).toBe('COMPLETED');
    expect(result.current.rows[0]!.canComplete).toBe(false);
    expect(result.current.pendingUuid).toBeNull();
    await waitFor(() => expect(result.current.rows[0]!.refund.refundStatus).toBe('COMPLETED'));
    const sent = recordRequests();
    act(() => result.current.setStatus('REQUESTED'));
    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect((await sent.list())[0]!.query).toEqual({ status: 'REQUESTED' });
  });

  it('환불 계좌는 매니저 이상에게만 — 일반 멤버는 null + 버튼 없음', async () => {
    actAsRole(11, 'GUEST');
    const { result } = setup(() => useRefundList('101'));
    await waitFor(() => expect(result.current?.status).toBe('success'));
    expect(result.current.canSeeRefundAccount).toBe(false);
    expect(
      result.current.rows.every((r) => r.refund.refundAccount === null && !r.canComplete),
    ).toBe(true);
  });

  it('목록 5xx는 error 상태 + 다시 시도', async () => {
    server.use(...hostingGuestHandlers.listServerError);
    const { result } = setup(() => useRefundList('101'));
    await waitFor(() => expect(result.current?.status).toBe('error'));
  });
});
