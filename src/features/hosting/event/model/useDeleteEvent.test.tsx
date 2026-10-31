import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { hostingEventSets } from '@/api/__mocks__/hosting-event.handlers';
import { server } from '@/api/__mocks__/server';
import { MY_EVENTS_KEY } from '@/api/event/queries';
import { MY_HOSTS_KEY } from '@/api/host/queries';
import { errorToast } from '@/test/error-toast';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useDeleteEvent } from './useDeleteEvent';

let restore: () => void;
beforeEach(() => {
  resetHostMockState();
  resetHostingStore();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
  resetHostingStore();
});

function setup() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useDeleteEvent(), { wrapper }), queryClient };
}

const preparing = { eventId: 140, status: 'PREPARING' as const, myRole: 'MASTER' as const };

describe('공연 삭제(DE-9) — 준비중 공연 카드 ⋮', () => {
  it('준비중 + 매니저 이상: DELETE → GE-1·GH-1 무효화', async () => {
    const { result, queryClient } = setup();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const sent = recordRequests();
    let ok = false;
    await act(async () => {
      ok = await result.current.deleteEvent(preparing);
    });
    expect(ok).toBe(true);
    expect(await sent.lines()).toEqual(['DELETE /api/v2/events/140']);
    expect(invalidate.mock.calls.map(([f]) => f?.queryKey)).toEqual([MY_EVENTS_KEY, MY_HOSTS_KEY]);
  });

  it.each([
    ['일반 멤버', { ...preparing, myRole: 'GUEST' as const }],
    ['등록된 공연', { ...preparing, eventId: 101, status: 'OPEN' as const }],
  ])('%s는 요청하지 않는다', async (_, event) => {
    const { result } = setup();
    const sent = recordRequests();
    await act(() => result.current.deleteEvent(event));
    expect(await sent.list()).toEqual([]);
  });

  it('에러 분기 Event_400_19(그사이 등록됨) → GE-1 다시 읽기 + 안내, 토스트 없음', async () => {
    server.use(...hostingEventSets.deleteFails(140, 'Event_400_19'));
    const { result, queryClient } = setup();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    await act(() => result.current.deleteEvent(preparing));
    expect(result.current.error).toBe('등록된 공연은 삭제할 수 없어요');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: MY_EVENTS_KEY });
    expect(errorToast).not.toHaveBeenCalled();
  });
});
