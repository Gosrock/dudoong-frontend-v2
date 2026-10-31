import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createStoredEvent, saveStoredEvent, storedEvent } from '@/api/__mocks__/event-store';
import { HOST_GOSROCK } from '@/api/__mocks__/fixtures/event';
import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { actAsRole } from '@/api/__mocks__/host-store';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { hostingEventSets } from '@/api/__mocks__/hosting-event.handlers';
import { server } from '@/api/__mocks__/server';
import { eventChecklistQuery, eventManageQuery, MY_EVENTS_KEY } from '@/api/event/queries';
import { errorToast } from '@/test/error-toast';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useEventDashboard } from './useEventDashboard';

const nav = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn() },
  search: { value: '' },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => nav.router,
  useSearchParams: () => new URLSearchParams(nav.search.value),
}));

let restore: () => void;
beforeEach(() => {
  resetHostMockState();
  resetHostingStore();
  nav.search.value = '';
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  nav.router.replace.mockReset();
  restore();
  resetHostMockState();
  resetHostingStore();
});

/** 티켓 없는 준비중 공연. `filled`면 ① 기본 정보 · ② 섹션이 차 있다(→ canOpen) */
function arrangeEvent({ filled }: { filled: boolean }) {
  const e = createStoredEvent({
    host: HOST_GOSROCK,
    name: '체크리스트 공연',
    startAt: '2030.05.01 19:00',
    endAt: '2030.05.01 21:00',
    hasTicket: false,
  });
  if (filled) fill(e.eventId);
  return String(e.eventId);
}
function fill(eventId: number) {
  const e = storedEvent(eventId)!;
  saveStoredEvent({
    ...e,
    posterImageKey: `event/${eventId}/poster.png`,
    place: { name: '롤링홀', address: '서울', detailAddress: null, latitude: 1, longitude: 2 },
    contacts: [{ type: 'INSTAGRAM', value: '@band' }],
    sections: [
      {
        sectionId: 1,
        title: '공연 소개',
        content: '<p>소개</p>',
        contentFormat: 'HTML',
        sortOrder: 0,
      },
    ],
  });
}

function setup(eventId: string, queryClient = createTestQueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="불러오는 중">{children}</Suspense>
    </QueryClientProvider>
  );
  return { ...renderHook(() => useEventDashboard(eventId), { wrapper }), queryClient };
}
type Hook = ReturnType<typeof setup>['result'];
const checklistLoaded = (result: Hook) =>
  waitFor(() => expect(result.current?.checklistStatus).toBe('success'));
const writes = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method !== 'GET');

describe('대시보드 — 체크리스트 모드(준비중)', () => {
  it('GE-3 + GE-7을 읽고 행 3개(티켓 없음 공연은 ③ 면제) — 아직 등록할 수 없다', async () => {
    const id = arrangeEvent({ filled: false });
    const sent = recordRequests();
    const { result } = setup(id);
    await checklistLoaded(result);
    expect(result.current.mode).toBe('checklist');
    expect(result.current.checklistItems?.map((i) => [i.key, i.done, i.exempt])).toEqual([
      ['basic', false, false],
      ['detail', false, false],
      ['ticket', true, true],
    ]);
    expect(result.current.progress).toEqual({ done: 1, total: 3 });
    expect(result.current.showRegister).toBe(true);
    expect(result.current.canRegister).toBe(false);
    expect(await sent.lines()).toEqual([
      `GET /api/v2/events/${id}/manage`,
      `GET /api/v2/events/${id}/checklist`,
    ]);
  });

  it('다 채운 순간: 이 화면이 본 canOpen이 false → true로 바뀐 직후 justCompleted(한 번) — 확인하면 꺼진다', async () => {
    const id = arrangeEvent({ filled: false });
    const { result, queryClient } = setup(id);
    await checklistLoaded(result);
    expect(result.current.justCompleted).toBe(false);
    // 기본 정보·상세 정보를 저장하고 돌아와 GE-7을 다시 읽는다
    fill(Number(id));
    await act(() => queryClient.invalidateQueries({ queryKey: eventChecklistQuery(id).queryKey }));
    await waitFor(() => expect(result.current.canOpen).toBe(true));
    expect(result.current.justCompleted).toBe(true);
    expect(result.current.canRegister).toBe(true);
    act(() => result.current.acknowledgeCompleted());
    expect(result.current.justCompleted).toBe(false);
  });

  it('처음부터 다 찬 채로 들어오면(새로고침) 알리지 않는다', async () => {
    const id = arrangeEvent({ filled: true });
    const { result } = setup(id);
    await checklistLoaded(result);
    expect(result.current.canOpen).toBe(true);
    expect(result.current.justCompleted).toBe(false);
  });

  it('등록(PE-8): GE-3·GE-1만 무효화(GE-7은 아님) → GE-3이 다시 오면 등록 후 모드 + justRegistered', async () => {
    const id = arrangeEvent({ filled: true });
    const { result, queryClient } = setup(id);
    await checklistLoaded(result);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const sent = recordRequests();
    let ok = false;
    await act(async () => {
      ok = await result.current.register();
    });
    expect(ok).toBe(true);
    expect(await writes(sent)).toMatchObject([
      { method: 'POST', path: `/api/v2/events/${id}/open` },
    ]);
    expect(invalidate.mock.calls.map(([f]) => f?.queryKey)).toEqual([
      eventManageQuery(id).queryKey,
      MY_EVENTS_KEY,
    ]);
    await waitFor(() => expect(result.current.mode).toBe('registered'));
    expect(result.current.justRegistered).toBe(true);
    expect(result.current.checklistItems).toBeNull();
    expect(result.current.showRegister).toBe(false);
  });

  it('일반 멤버: 체크리스트는 보지만 [등록하기]가 없고 register()는 요청하지 않는다', async () => {
    const id = arrangeEvent({ filled: true });
    actAsRole(11, 'GUEST');
    const sent = recordRequests();
    const { result } = setup(id);
    await checklistLoaded(result);
    expect(result.current.showRegister).toBe(false);
    expect(result.current.canRegister).toBe(false);
    await act(() => result.current.register());
    expect(await writes(sent)).toEqual([]);
  });

  it.each([
    ['Event_400_7', '아직 채우지 않은 항목이 있어요', ['checklist']],
    ['Event_400_8', '이미 등록된 공연이에요', ['manage']],
    [
      'Event_400_15',
      '공연 시작 시각이 지나 등록할 수 없어요. 일정을 바꿔 주세요',
      ['checklist', 'manage'],
    ],
  ] as const)(
    '에러 분기 %s → "%s", 다시 읽기 %o, 토스트 없음',
    async (code, message, refetched) => {
      const id = arrangeEvent({ filled: true });
      server.use(...hostingEventSets.openFails(Number(id), code));
      const { result, queryClient } = setup(id);
      await checklistLoaded(result);
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
      let ok = true;
      await act(async () => {
        ok = await result.current.register();
      });
      expect(ok).toBe(false);
      expect(result.current.registerError).toBe(message);
      const keys = {
        checklist: eventChecklistQuery(id).queryKey,
        manage: eventManageQuery(id).queryKey,
      };
      expect(invalidate.mock.calls.map(([f]) => f?.queryKey)).toEqual(
        refetched.map((k) => keys[k]),
      );
      expect(errorToast).not.toHaveBeenCalled();
    },
  );

  it('Event_400_15인데 다시 읽은 GE-3이 이미 등록(OPEN)이면 시작 시각 문구 대신 "이미 등록된 공연"', async () => {
    // 서버 Event.open()은 시작 시각을 이미 오픈 검사보다 먼저 본다 — 다른 멤버가 먼저 등록했고 시작이 지난 공연
    const id = arrangeEvent({ filled: true });
    server.use(...hostingEventSets.openFails(Number(id), 'Event_400_15'));
    const { result } = setup(id);
    await checklistLoaded(result);
    saveStoredEvent({ ...storedEvent(Number(id))!, status: 'OPEN' });
    await act(async () => {
      await result.current.register();
    });
    await waitFor(() => expect(result.current.mode).toBe('registered'));
    expect(result.current.registerError).toBe('이미 등록된 공연이에요');
  });
});

describe('대시보드 — 등록 후 · 만든 직후', () => {
  it('등록된 공연은 등록 후 모드 — GE-7을 부르지 않고 GD-1(통계, P13a)을 부른다', async () => {
    const sent = recordRequests();
    const { result } = setup('101');
    await waitFor(() => expect(result.current?.statsStatus).toBe('success'));
    expect(result.current.mode).toBe('registered');
    expect(result.current.checklistStatus).toBe('idle');
    expect(await sent.lines()).toEqual([
      'GET /api/v2/events/101/manage',
      'GET /api/v2/events/101/dashboard',
    ]);
  });

  it('?created=1이면 createdNotice — 닫으면 주소에서 지운다', async () => {
    const id = arrangeEvent({ filled: false });
    nav.search.value = 'created=1';
    const { result } = setup(id);
    await checklistLoaded(result);
    expect(result.current.createdNotice).toBe(true);
    act(() => result.current.dismissCreatedNotice());
    expect(nav.router.replace).toHaveBeenCalledWith(`/hosting/events/${id}/dashboard`, {
      scroll: false,
    });
  });
});

describe('대시보드 — 등록 후 통계(GD-1, P13a)', () => {
  it('NEW 배지 수 = 승인 대기 수, 카드 4개, 판매 정보, 입장 현황 분모 = 발급 수', async () => {
    const { result } = setup('101');
    await waitFor(() => expect(result.current?.stats).toBeTruthy());
    const st = result.current.stats!;
    expect(st.newBadgeCount).toBe(st.dashboard.orders.pendingApprove);
    expect(st.newBadgeCount).toBe(2);
    expect(st.cards.map((c) => [c.label, c.count])).toEqual([
      ['승인 대기', 2],
      ['승인 완료', 2],
      ['승인 거절', 2],
      ['환불 요청', 3],
    ]);
    expect([st.sales.state, st.sales.salesAmount]).toEqual(['selling', 30000]);
    expect(st.entrance.label).toBe('1/3');
    expect(st.qrHref).toBe('/hosting/events/101/qr');
  });

  it('발급 0인 공연(103)은 입장 현황 0/0, 판매 전', async () => {
    const { result } = setup('103');
    await waitFor(() => expect(result.current?.stats).toBeTruthy());
    expect(result.current.stats!.entrance.label).toBe('0/0');
    expect(result.current.stats!.sales.state).toBe('beforeSale');
    expect(result.current.stats!.newBadgeCount).toBe(0);
  });

  it('openedAt이 null이면(2026-10 이전 오픈) 등록 줄 없이 홍보·판매는 "~ 공연 시작"만(Q43 기본안)', async () => {
    const { result } = setup('101');
    await waitFor(() => expect(result.current?.stats).toBeTruthy());
    expect(result.current.stats!.timeline.map((s) => [s.key, s.from, s.to])).toEqual([
      ['promotion', null, '2026.11.21 19:00'],
      ['start', '2026.11.21 19:00', null],
      ['done', null, null],
    ]);
  });

  it('방금 등록한 공연은 등록일 = 서버 openedAt(GD-1)', async () => {
    const id = arrangeEvent({ filled: true });
    const { result } = setup(id);
    await checklistLoaded(result);
    await act(async () => {
      await result.current.register();
    });
    await waitFor(() => expect(result.current.stats).not.toBeNull());
    const openedAt = storedEvent(Number(id))!.openedAt;
    expect(openedAt).not.toBeNull();
    expect(result.current.stats!.timeline[0]).toMatchObject({ key: 'registered', from: openedAt });
  });
});
