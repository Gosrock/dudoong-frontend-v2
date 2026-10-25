import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hostingSets, resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { hostingEventSets } from '@/api/__mocks__/hosting-event.handlers';
import { resetMeStore } from '@/api/__mocks__/me.handlers';
import { server } from '@/api/__mocks__/server';
import { MY_EVENTS_KEY } from '@/api/event/queries';
import { CreateEventRequestSchema } from '@/api/event/schema';
import { shouldToastMutationError } from '@/api/query-client';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useNewEventWizard } from './useNewEventWizard';

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
  resetHostingStore();
  resetMeStore();
  nav.search.value = '';
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  nav.router.replace.mockReset();
  nav.router.push.mockReset();
  restore();
  resetHostingStore();
});

const NOW = () => new Date('2026-10-26T03:00:00Z');

function setup() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useNewEventWizard({ now: NOW }), { wrapper }), queryClient };
}
type Hook = ReturnType<typeof setup>['result'];
const hostsLoaded = (result: Hook) =>
  waitFor(() => expect(result.current.hosts.status).toBe('success'));
const writes = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method !== 'GET');

/** Step1에서 호스트를 고르고 `?step=2`로 넘어간 상태 */
async function toStep2(hostId = 11) {
  const s = setup();
  await hostsLoaded(s.result);
  act(() => s.result.current.selectHost(hostId));
  act(() => s.result.current.goToStep2());
  nav.search.value = 'step=2';
  s.rerender();
  return s;
}

function fillStep2(result: Hook) {
  act(() => {
    result.current.setName(' 고스락 겨울 공연 ');
    result.current.setSchedule({ date: '2027-01-15', startTime: '23:00', endTime: '01:00' });
    result.current.setHasTicket(false);
  });
}

describe('간편 공연 만들기 Step1 — 호스트 선택', () => {
  it('일반 멤버인 호스트는 고를 수 없다 — 골라도 선택되지 않고 [다음]이 막힌다', async () => {
    server.use(...hostingSets.mixedRoles);
    const { result } = setup();
    await hostsLoaded(result);
    expect(result.current.step).toBe(1);
    expect(result.current.hosts.items.map((h) => [h.hostId, h.myRole, h.selectable])).toEqual([
      [11, 'MASTER', true],
      [12, 'GUEST', false],
    ]);
    act(() => result.current.selectHost(12));
    expect(result.current.selectedHost).toBeNull();
    expect(result.current.canGoToStep2).toBe(false);
    act(() => result.current.goToStep2());
    expect(nav.router.push).not.toHaveBeenCalled();

    act(() => result.current.selectHost(11));
    expect(result.current.selectedHost?.hostId).toBe(11);
    act(() => result.current.goToStep2());
    expect(nav.router.push).toHaveBeenCalledWith('/hosting/new/events?step=2');
  });

  it('호스트 홈의 ?hostId=는 고를 수 있는 호스트일 때만 미리 고른다', async () => {
    server.use(...hostingSets.mixedRoles);
    nav.search.value = 'hostId=11';
    const a = setup();
    await hostsLoaded(a.result);
    expect(a.result.current.selectedHost?.hostId).toBe(11);
    a.unmount();
    nav.search.value = 'hostId=12';
    const b = setup();
    await hostsLoaded(b.result);
    expect(b.result.current.selectedHost).toBeNull();
  });

  it('소속 호스트가 없으면 빈 상태', async () => {
    server.use(...hostingSets.noMembership);
    const { result } = setup();
    await waitFor(() => expect(result.current.hosts.status).toBe('empty'));
  });

  it('Step1 안에서 호스트를 만들면(PH-2) 그 호스트가 골라진 채 ?step=2로 — 공연준비 홈으로 가지 않는다', async () => {
    const sent = recordRequests();
    const { result } = setup();
    await hostsLoaded(result);
    act(() => result.current.startCreateHost());
    expect(result.current.creatingHost).toBe(true);
    act(() => {
      result.current.createHost.setName('새 밴드');
      result.current.createHost.setContactType(0, 'INSTAGRAM');
      result.current.createHost.setContactValue(0, '@newband');
    });
    await act(() => result.current.createHost.submit());
    await waitFor(() => expect(nav.router.push).toHaveBeenCalledWith('/hosting/new/events?step=2'));
    expect(nav.router.replace).not.toHaveBeenCalled();
    expect(result.current.creatingHost).toBe(false);
    // 만든 호스트(9001)가 GH-1에 나오고 골라져 있다
    expect(result.current.selectedHost).toMatchObject({
      hostId: 9001,
      name: '새 밴드',
      myRole: 'MASTER',
    });
    expect(await writes(sent)).toMatchObject([
      { method: 'POST', path: '/api/v2/hosts', body: { name: '새 밴드' } },
    ]);
  });
});

describe('간편 공연 만들기 Step2 — PE-2', () => {
  it('고른 호스트가 없는 ?step=2(새로고침 등)는 Step1로 replace', async () => {
    nav.search.value = 'step=2';
    setup();
    await waitFor(() =>
      expect(nav.router.replace).toHaveBeenCalledWith('/hosting/new/events?step=1'),
    );
  });

  it('PE-2 {hostId, name, startAt, endAt(종료 ≤ 시작이면 다음 날), hasTicket} → GE-1 무효화 → 대시보드(?created=1)로 replace', async () => {
    const { result, queryClient } = await toStep2();
    expect(result.current.step).toBe(2);
    expect(nav.router.replace).not.toHaveBeenCalled();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const sent = recordRequests();
    fillStep2(result);
    expect(result.current.scheduleRange).toMatchObject({ overnight: true });
    await act(() => result.current.submit());
    const [create] = await writes(sent);
    expect(create).toMatchObject({
      method: 'POST',
      path: '/api/v2/events',
      body: {
        hostId: 11,
        name: '고스락 겨울 공연',
        startAt: '2027.01.15 23:00',
        endAt: '2027.01.16 01:00',
        hasTicket: false,
      },
    });
    expect(CreateEventRequestSchema.safeParse(create!.body).success).toBe(true);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: MY_EVENTS_KEY });
    expect(nav.router.replace).toHaveBeenCalledWith('/hosting/events/7001/dashboard?created=1');
  });

  it('칸 오류가 있으면 요청하지 않는다(이름 · 지난 시작 · 티켓 여부 미선택)', async () => {
    const { result } = await toStep2();
    const sent = recordRequests();
    act(() =>
      result.current.setSchedule({ date: '2026-10-25', startTime: '18:00', endTime: '20:00' }),
    );
    await act(() => result.current.submit());
    expect(result.current.attempted).toBe(true);
    expect(result.current.errors).toEqual({
      name: '공연 이름을 입력해 주세요',
      schedule: '시작 시각은 지금 이후로 정해 주세요',
      hasTicket: '티켓 여부를 골라 주세요',
    });
    expect(await writes(sent)).toEqual([]);
  });

  it('에러 분기 Event_400_2 → 일정 칸 오류, 토스트 없음, 이동 없음 — 일정을 고치면 지운다', async () => {
    server.use(...hostingEventSets.createFails('Event_400_2'));
    const { result, queryClient } = await toStep2();
    fillStep2(result);
    await act(() => result.current.submit());
    expect(result.current.scheduleServerError).toBe('종료 시각을 다시 확인해 주세요');
    const m = queryClient.getMutationCache().getAll().at(-1)!;
    expect(shouldToastMutationError(m.state.error, m.options.meta)).toBe(false);
    expect(nav.router.replace).not.toHaveBeenCalled();
    act(() => result.current.setSchedule({ endTime: '02:00' }));
    expect(result.current.scheduleServerError).toBeNull();
  });

  it('검증 실패(400 BAD_REQUEST — 시작이 그사이 지남)는 전역 토스트로', async () => {
    server.use(...hostingEventSets.createFails('BAD_REQUEST'));
    const { result, queryClient } = await toStep2();
    fillStep2(result);
    await act(() => result.current.submit());
    const m = queryClient.getMutationCache().getAll().at(-1)!;
    expect(shouldToastMutationError(m.state.error, m.options.meta)).toBe(true);
    expect(result.current.submitting).toBe(false);
  });
});
