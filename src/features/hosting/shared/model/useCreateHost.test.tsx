import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hostingSets, resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { resetMeStore } from '@/api/__mocks__/me.handlers';
import { server } from '@/api/__mocks__/server';
import { VALIDATION_ERROR_MESSAGE } from '@/api/error-toast';
import { myHostsQuery } from '@/api/host/queries';
import { CreateHostRequestSchema } from '@/api/host/schema';
import { meQuery } from '@/api/me/queries';
import { errorToast } from '@/test/error-toast';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useCreateHost } from './useCreateHost';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

let restore: () => void;
beforeEach(() => {
  resetHostingStore();
  resetMeStore();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  router.replace.mockReset();
  restore();
});

function setup() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useCreateHost(), { wrapper }), queryClient };
}

const writes = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method !== 'GET');

type Hook = ReturnType<typeof setup>['result'];
function fill(result: Hook) {
  act(() => {
    result.current.setName(' 새 밴드 ');
    result.current.setIntroduce('');
    result.current.setContactType(0, 'YOUTUBE');
    result.current.setContactValue(0, 'https://youtube.com/@newband');
  });
}

describe('호스트 만들기 — useCreateHost(PH-2)', () => {
  it('연락처 유형 6종(YOUTUBE 포함)과 처음 값(연락처 한 줄, 유형 미선택)', () => {
    const { result } = setup();
    expect(result.current.contactOptions.map((o) => o.type)).toEqual([
      'PHONE',
      'EMAIL',
      'INSTAGRAM',
      'OPEN_CHAT',
      'YOUTUBE',
      'ETC',
    ]);
    expect(result.current.values.contacts).toEqual([{ type: null, value: '' }]);
    expect(result.current.canRemoveContact).toBe(false);
    expect(result.current.attempted).toBe(false);
  });

  it('칸 오류가 있으면 요청하지 않고 attempted만 켠다', async () => {
    const sent = recordRequests();
    const { result } = setup();
    await act(() => result.current.submit());
    expect(await writes(sent)).toEqual([]);
    expect(result.current.attempted).toBe(true);
    expect(result.current.errors.name).toBe('호스트 이름을 입력해 주세요');
    expect(result.current.errors.contacts).toEqual(['연락처 유형을 골라 주세요']);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('PH-2 {name, introduce, contacts}를 보내고(공백 정리·빈 소개 null), GH-1·GM-1을 다시 읽게 한 뒤 공연준비 홈 호스트 탭으로 replace', async () => {
    const sent = recordRequests();
    const { result, queryClient } = setup();
    // 공연준비 홈에서 넘어온 상황 — GH-1·GM-1 캐시가 있다
    await queryClient.fetchInfiniteQuery(myHostsQuery());
    await queryClient.fetchQuery(meQuery());
    fill(result);
    await act(() => result.current.submit());

    const posts = await writes(sent);
    expect(posts).toMatchObject([
      {
        method: 'POST',
        path: '/api/v2/hosts',
        credentials: 'include',
        body: {
          name: '새 밴드',
          introduce: null,
          contacts: [{ type: 'YOUTUBE', value: 'https://youtube.com/@newband' }],
        },
      },
    ]);
    expect(CreateHostRequestSchema.safeParse(posts[0]!.body).success).toBe(true);
    expect(router.replace).toHaveBeenCalledWith('/hosting?tab=hosts');
    expect(queryClient.getQueryState(myHostsQuery().queryKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(meQuery().queryKey)?.isInvalidated).toBe(true);
    expect(result.current.submitting).toBe(true);
  });

  it('호스트 생성 → 목록 반영: 만든 호스트가 다음 GH-1에 마스터로 나온다', async () => {
    const { result, queryClient } = setup();
    fill(result);
    await act(() => result.current.submit());
    const data = await queryClient.fetchInfiniteQuery(myHostsQuery());
    expect(data.pages[0]!.content.map((h) => [h.name, h.myRole])).toEqual([
      ['새 밴드', 'MASTER'],
      ['고스락', 'MASTER'],
    ]);
  });

  it('연락처는 1~10줄 — 더하고 지울 수 있다', () => {
    const { result } = setup();
    act(() => result.current.addContact());
    expect(result.current.values.contacts).toHaveLength(2);
    act(() => result.current.removeContact(0));
    expect(result.current.values.contacts).toHaveLength(1);
    act(() => result.current.removeContact(0));
    expect(result.current.values.contacts).toHaveLength(1);
    for (let i = 0; i < 12; i++) act(() => result.current.addContact());
    expect(result.current.values.contacts).toHaveLength(10);
    expect(result.current.canAddContact).toBe(false);
  });

  it('에러 분기 HOST_400_16(연락처 형식) → 연락처 영역 오류, 이동 없음, 토스트 없음 — 연락처를 고치면 지운다', async () => {
    server.use(...hostingSets.createFails('HOST_400_16'));
    const { result } = setup();
    fill(result);
    await act(() => result.current.submit());
    await waitFor(() =>
      expect(result.current.contactsServerError).toBe('연락처 형식을 확인해 주세요'),
    );
    expect(errorToast).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(result.current.submitting).toBe(false);
    act(() => result.current.setContactValue(0, 'https://youtube.com/@band2'));
    expect(result.current.contactsServerError).toBeNull();
  });

  it('표에 없는 실패(BAD_REQUEST·5xx)는 공용 토스트로 간다', async () => {
    server.use(...hostingSets.createFails('BAD_REQUEST'));
    const { result } = setup();
    fill(result);
    await act(() => result.current.submit());
    expect(errorToast).toHaveBeenCalledWith(VALIDATION_ERROR_MESSAGE, 'mutation:BAD_REQUEST');
    expect(result.current.contactsServerError).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('만드는 중에 다시 눌러도 한 번만 보낸다', async () => {
    const sent = recordRequests();
    const { result } = setup();
    fill(result);
    await act(async () => {
      void result.current.submit();
      void result.current.submit();
    });
    await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(1));
    expect(await writes(sent)).toHaveLength(1);
  });
});
