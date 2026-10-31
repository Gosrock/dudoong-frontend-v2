import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { hostingTicketSets } from '@/api/__mocks__/hosting-ticket.handlers';
import { server } from '@/api/__mocks__/server';
import { createOptionMutation } from '@/api/option/mutations';
import { eventOptionsQuery } from '@/api/option/queries';
import { UpdateOptionRequestSchema } from '@/api/option/schema';
import { eventTicketItemsQuery, ticketItemsManageQuery } from '@/api/ticket-item/queries';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useOptionEditor } from './useOptionEditor';
import { useTicketOptions } from './useTicketOptions';

let restore: () => void;
beforeEach(() => {
  resetHostMockState();
  resetHostingStore();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
  resetHostMockState();
  resetHostingStore();
});

function wrap() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="불러오는 중">{children}</Suspense>
    </QueryClientProvider>
  );
  return { queryClient, wrapper };
}
function setupOptions(eventId: string, ticketItemId: number) {
  const { queryClient, wrapper } = wrap();
  return {
    ...renderHook(() => useTicketOptions(eventId, ticketItemId), { wrapper }),
    queryClient,
  };
}
function setupEditor(eventId: string, optionId: number) {
  const { queryClient, wrapper } = wrap();
  return { ...renderHook(() => useOptionEditor(eventId, optionId), { wrapper }), queryClient };
}
const writes = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method !== 'GET');

type OptionsHook = ReturnType<typeof setupOptions>['result'];
const poolLoaded = (result: OptionsHook) =>
  waitFor(() => expect(result.current?.poolStatus).toBe('success'));

describe('티켓 옵션 — 붙이기 · 떼기(P10/O-5)', () => {
  it('무료 티켓(503): 유료 옵션(701)은 선택지에서 빠지고, 주관식(702)을 붙이면 PUT 전체 목록 → 목록·옵션 풀·GP-5 반영', async () => {
    const { result, queryClient } = setupOptions('101', 503);
    await poolLoaded(result);
    expect(result.current.canChange).toBe(true);
    expect(result.current.attachable.map((o) => o.optionId)).toEqual([702]);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const sent = recordRequests();
    expect(await act(() => result.current.attach(702))).toBe(true);
    expect((await writes(sent)).map((r) => [r.method, r.path, r.body])).toEqual([
      ['PUT', '/api/v2/events/101/ticket-items/503/options', { optionIds: [702] }],
    ]);
    await waitFor(() => expect(result.current.attached.map((o) => o.optionId)).toEqual([702]));
    for (const key of [eventOptionsQuery('101').queryKey, eventTicketItemsQuery('101').queryKey]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: key, exact: true });
    }
  });

  it('떼기는 이 티켓에서만 — 남은 목록으로 PUT, 옵션은 풀에 남는다', async () => {
    const { result } = setupOptions('101', 503);
    await poolLoaded(result);
    await act(() => result.current.attach(702));
    await waitFor(() => expect(result.current.attached).toHaveLength(1));
    const sent = recordRequests();
    expect(await act(() => result.current.detach(702))).toBe(true);
    expect((await writes(sent))[0]!.body).toEqual({ optionIds: [] });
    await waitFor(() => expect(result.current.attached).toEqual([]));
    await waitFor(() => expect(result.current.attachable.map((o) => o.optionId)).toEqual([702]));
  });

  it('잠긴 티켓(501)은 붙이기·떼기를 하지 않는다', async () => {
    const { result } = setupOptions('101', 501);
    await poolLoaded(result);
    expect(result.current.canChange).toBe(false);
    const sent = recordRequests();
    expect(await act(() => result.current.detach(701))).toBe(false);
    expect(await writes(sent)).toEqual([]);
  });
});

describe('새 옵션 — 만들기(O-2) + 붙이기(O-5) 한 동작', () => {
  it('두 번 호출해 붙인다 → attached', async () => {
    const { result } = setupOptions('101', 503);
    await poolLoaded(result);
    act(() => {
      result.current.setName('응원 문구');
      result.current.setDescription('짧게 적어 주세요');
    });
    const sent = recordRequests();
    let outcome = '';
    await act(async () => {
      outcome = await result.current.createAndAttach();
    });
    expect(outcome).toBe('attached');
    expect((await writes(sent)).map((r) => [r.method, r.path, r.body])).toEqual([
      [
        'POST',
        '/api/v2/events/101/options',
        { name: '응원 문구', description: '짧게 적어 주세요', type: 'SUBJECTIVE' },
      ],
      ['PUT', '/api/v2/events/101/ticket-items/503/options', { optionIds: [8701] }],
    ]);
    await waitFor(() => expect(result.current.attached.map((o) => o.optionId)).toEqual([8701]));
    expect(result.current.values.name).toBe('');
  });

  it('붙이기가 실패하면 createdOnly — 옵션은 풀에 남고 partial, retryAttach로 다시 붙인다', async () => {
    server.use(...hostingTicketSets.replaceOptionsFails(101, 'serverError'));
    const { result, queryClient } = setupOptions('101', 503);
    await poolLoaded(result);
    act(() => {
      result.current.setName('뒤풀이');
      result.current.setDescription('참석하나요?');
    });
    let outcome = '';
    await act(async () => {
      outcome = await result.current.createAndAttach();
    });
    expect(outcome).toBe('createdOnly');
    expect(result.current.partial).toMatchObject({ optionId: 8701 });
    expect(result.current.error).toBe(
      '옵션은 만들어졌지만 티켓에 붙이지 못했어요. 다시 붙여 주세요',
    );
    expect(
      queryClient.getQueryData(eventOptionsQuery('101').queryKey)?.map((o) => o.optionId),
    ).toContain(8701);

    server.resetHandlers();
    expect(await act(() => result.current.retryAttach())).toBe(true);
    expect(result.current.partial).toBeNull();
    await waitFor(() => expect(result.current.attached.map((o) => o.optionId)).toEqual([8701]));
  });

  it('만들기가 실패하면 failed(설명 50자 초과 → 칸 오류), 붙이기를 부르지 않는다', async () => {
    const { result } = setupOptions('101', 503);
    await poolLoaded(result);
    act(() => {
      result.current.setName('a');
      result.current.setDescription('가'.repeat(51));
    });
    expect(result.current.errors.description).toEqual(expect.any(String));
    const sent = recordRequests();
    let outcome = '';
    await act(async () => {
      outcome = await result.current.createAndAttach();
    });
    expect(outcome).toBe('failed');
    expect(await writes(sent)).toEqual([]);
  });

  it('무료 티켓에 붙일 새 옵션은 추가금이 있으면 막는다', async () => {
    const { result } = setupOptions('101', 503);
    await poolLoaded(result);
    act(() => {
      result.current.setName('뒤풀이');
      result.current.setDescription('참석?');
      result.current.setType('YES_NO');
      result.current.setYesAdditionalPrice('5000');
    });
    expect(result.current.errors.yesAdditionalPrice).toBe(
      '무료 티켓에는 추가 금액이 있는 옵션을 붙일 수 없어요',
    );
  });
});

describe('옵션 상세 — 수정(O-3) · 삭제(O-4)', () => {
  it('잠긴 옵션(701): 추가금 칸 잠금·삭제 없음, 이름만 바꾸면 본문에 이름만(형식 없음)', async () => {
    const { result, queryClient } = setupEditor('101', 701);
    await waitFor(() => expect(result.current?.values ?? null).not.toBeNull());
    expect(result.current.type).toBe('YES_NO');
    expect(result.current.priceLocked).toBe(true);
    expect(result.current.canDelete).toBe(false);
    act(() => result.current.setYesAdditionalPrice('1'));
    expect(result.current.values?.yesAdditionalPrice).toBe('10000');
    act(() => result.current.setName('뒤풀이 2차'));
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const sent = recordRequests();
    expect(await act(() => result.current.save())).toBe(true);
    const [patch] = await writes(sent);
    expect(patch).toMatchObject({
      method: 'PATCH',
      path: '/api/v2/events/101/options/701',
      body: { name: '뒤풀이 2차' },
    });
    expect(UpdateOptionRequestSchema.parse(patch!.body)).toEqual(patch!.body);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ticketItemsManageQuery('101').queryKey,
      exact: true,
    });
  });

  it('잠기지 않은 옵션은 지울 수 있다 — DELETE → 남은 풀', async () => {
    const created = await createOptionMutation(140).mutationFn!(
      { name: '이름', description: '설명', type: 'SUBJECTIVE' },
      {} as never,
    );
    const { result, queryClient } = setupEditor('140', created.optionId);
    await waitFor(() => expect(result.current?.values ?? null).not.toBeNull());
    expect(result.current.canDelete).toBe(true);
    const sent = recordRequests();
    expect(await act(() => result.current.remove())).toBe(true);
    expect((await writes(sent)).map((r) => [r.method, r.path])).toEqual([
      ['DELETE', `/api/v2/events/140/options/${created.optionId}`],
    ]);
    expect(result.current.deleted).toBe(true);
    expect(queryClient.getQueryData(eventOptionsQuery('140').queryKey)).toEqual([]);
  });

  it('잠겼다는 응답(Option_Group_400_5)이면 안내 + 풀 다시 읽기', async () => {
    server.use(...hostingTicketSets.updateOptionFails(140, 'Option_Group_400_5'));
    const created = await createOptionMutation(140).mutationFn!(
      { name: '뒤풀이', description: '참석?', type: 'YES_NO', yesAdditionalPrice: 0 },
      {} as never,
    );
    const { result, queryClient } = setupEditor('140', created.optionId);
    await waitFor(() => expect(result.current?.values ?? null).not.toBeNull());
    act(() => result.current.setYesAdditionalPrice('3000'));
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    expect(await act(() => result.current.save())).toBe(false);
    await waitFor(() => expect(result.current.error).toMatch(/이름·설명만/));
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: eventOptionsQuery('140').queryKey,
      exact: true,
    });
  });
});
