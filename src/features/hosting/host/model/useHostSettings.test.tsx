import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { actAsRole } from '@/api/__mocks__/host-store';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { errors } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import { MOCK_S3_ORIGIN } from '@/api/__mocks__/upload-handlers';
import { hostDetailQuery, hostViewerQuery, MY_HOSTS_KEY } from '@/api/host/queries';
import { UpdateHostRequestSchema } from '@/api/host/schema';
import { meQuery } from '@/api/me/queries';
import { shouldToastMutationError } from '@/api/query-client';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useHostSettings } from './useHostSettings';

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
});

function setup(hostId = '11', queryClient: QueryClient = createTestQueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="불러오는 중">{children}</Suspense>
    </QueryClientProvider>
  );
  return { ...renderHook(() => useHostSettings(hostId), { wrapper }), queryClient };
}

type Hook = ReturnType<typeof setup>['result'];
const loaded = (result: Hook) => waitFor(() => expect(result.current).not.toBeNull());
const writes = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method !== 'GET');
const lastMutation = (qc: QueryClient) => qc.getMutationCache().getAll().at(-1)!;
const png = () => new File([new Uint8Array([0x89, 0x50])], 'logo.png', { type: 'image/png' });

describe('호스트 설정 — 접근(비멤버 403 · 일반 멤버 읽기 전용)', () => {
  it('마스터: GH-3 viewer(쿠키)로 채우고 편집할 수 있다 — 연락처는 원문', async () => {
    const sent = recordRequests();
    const { result } = setup();
    await loaded(result);
    expect(result.current.access).toBe('ok');
    expect(result.current.canEdit).toBe(true);
    expect(result.current.values.name).toBe('고스락');
    expect(result.current.values.contacts.map((c) => c.value)).toContain('gosrock@example.com');
    expect(await sent.list()).toMatchObject([
      { method: 'GET', path: '/api/v2/hosts/11', credentials: 'include' },
    ]);
  });

  it('비멤버: GH-3이 200 + myRole null이어도 forbidden(공용 403 안내)', async () => {
    const { result } = setup('12');
    await loaded(result);
    expect(result.current.access).toBe('forbidden');
    expect(result.current.canEdit).toBe(false);
  });

  it('일반 멤버: 읽기 전용 — 저장하지 않는다', async () => {
    actAsRole(11, 'GUEST');
    const sent = recordRequests();
    const { result } = setup();
    await loaded(result);
    expect(result.current.access).toBe('ok');
    expect(result.current.canEdit).toBe(false);
    act(() => result.current.setName('바꾼 이름'));
    expect(result.current.canSave).toBe(false);
    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.save();
    });
    expect(saved).toBe(false);
    expect(await writes(sent)).toEqual([]);
  });

  it('매니저: 편집할 수 있다', async () => {
    actAsRole(11, 'MANAGER');
    const { result } = setup();
    await loaded(result);
    expect(result.current.canEdit).toBe(true);
  });
});

describe('호스트 설정 — 저장(PH-4, 바뀐 필드만)', () => {
  it('바뀐 것이 없으면 요청하지 않는다', async () => {
    const sent = recordRequests();
    const { result } = setup();
    await loaded(result);
    expect(result.current.dirty).toBe(false);
    await act(() => result.current.save());
    expect(await writes(sent)).toEqual([]);
  });

  it('이름·연락처를 바꾸면 그 두 필드만 PATCH — 응답을 viewer 키에 넣고 공개 GH-3·GH-1·GM-1을 무효화, 폼은 새 기준', async () => {
    const sent = recordRequests();
    const { result, queryClient } = setup();
    await loaded(result);
    act(() => {
      result.current.setName(' 고스락 밴드 ');
      result.current.addContact();
      result.current.setContactType(3, 'PHONE');
      result.current.setContactValue(3, '01012345678');
    });
    expect(result.current.dirty).toBe(true);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.save();
    });
    expect(saved).toBe(true);
    const [patch] = await writes(sent);
    expect(patch).toMatchObject({ method: 'PATCH', path: '/api/v2/hosts/11' });
    expect(Object.keys(patch!.body as object).sort()).toEqual(['contacts', 'name']);
    expect(UpdateHostRequestSchema.parse(patch!.body)).toEqual({
      name: '고스락 밴드',
      contacts: [
        { type: 'INSTAGRAM', value: '@gosrock_official' },
        { type: 'YOUTUBE', value: 'https://www.youtube.com/@gosrock' },
        { type: 'EMAIL', value: 'gosrock@example.com' },
        { type: 'PHONE', value: '01012345678' },
      ],
    });
    expect(queryClient.getQueryData(hostViewerQuery('11').queryKey)).toMatchObject({
      name: '고스락 밴드',
      myRole: 'MASTER',
    });
    expect(result.current.dirty).toBe(false);
    expect(result.current.values.name).toBe('고스락 밴드');
    const keys = invalidate.mock.calls.map(([f]) => f?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([hostDetailQuery('11').queryKey, MY_HOSTS_KEY, meQuery().queryKey]),
    );
  });

  it('소개를 비우면 introduce ""를 보낸다', async () => {
    const sent = recordRequests();
    const { result } = setup();
    await loaded(result);
    act(() => result.current.setIntroduce(''));
    await act(() => result.current.save());
    expect((await writes(sent))[0]!.body).toEqual({ introduce: '' });
    expect(result.current.host.introduce).toBeNull();
  });

  it('칸 오류가 있으면 요청하지 않고 attempted만 켠다', async () => {
    const sent = recordRequests();
    const { result } = setup();
    await loaded(result);
    act(() => result.current.setName('  '));
    await act(() => result.current.save());
    expect(await writes(sent)).toEqual([]);
    expect(result.current.attempted).toBe(true);
    expect(result.current.errors.name).toBe('호스트 이름을 입력해 주세요');
  });

  it('에러 분기 HOST_400_16(연락처 형식) → 연락처 영역 오류, 토스트 없음 — 연락처를 고치면 지운다', async () => {
    server.use(
      http.patch('*/api/v2/hosts/11', () =>
        HttpResponse.json(
          {
            success: false,
            status: 400,
            code: 'HOST_400_16',
            reason: '연락처 형식이 올바르지 않습니다.',
          },
          { status: 400 },
        ),
      ),
    );
    const { result, queryClient } = setup();
    await loaded(result);
    act(() => result.current.setContactValue(0, '@changed'));
    await act(() => result.current.save());
    expect(result.current.contactsServerError).toBe('연락처 형식을 확인해 주세요');
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(false);
    act(() => result.current.setContactValue(0, '@changed2'));
    expect(result.current.contactsServerError).toBeNull();
  });

  it('표에 없는 실패(5xx)는 전역 토스트로 간다', async () => {
    server.use(http.patch('*/api/v2/hosts/11', ({ request }) => errors.serverError(request)));
    const { result, queryClient } = setup();
    await loaded(result);
    act(() => result.current.setName('새 이름'));
    await act(() => result.current.save());
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(true);
    expect(result.current.dirty).toBe(true);
  });
});

describe('호스트 이미지 — PH-15 발급 → S3 PUT → PH-4', () => {
  it('프로필 이미지를 올리면 폼에 key, 저장하면 profileImageKey로 PH-4 — 응답 이미지 주소가 새 기준', async () => {
    const sent = recordRequests();
    const { result } = setup();
    await loaded(result);
    await act(() => result.current.images.PROFILE.change(png()));
    expect(result.current.images.PROFILE.changed).toBe(true);
    const lines = await sent.lines();
    expect(lines[1]).toBe('POST /api/v2/hosts/11/images');
    expect(lines[2]).toMatch(/^PUT \/host\/11\/[0-9a-f-]{36}\.png$/);
    const [issue] = await writes(sent);
    expect(issue!.body).toEqual({ purpose: 'PROFILE', extension: 'PNG' });
    await act(() => result.current.save());
    const patch = (await writes(sent)).find((r) => r.method === 'PATCH')!;
    expect(patch.body).toEqual({
      profileImageKey: expect.stringMatching(/^host\/11\/[0-9a-f-]{36}\.png$/),
    });
    expect(result.current.host.profileImageUrl).toContain(
      (patch.body as { profileImageKey: string }).profileImageKey,
    );
    expect(result.current.images.PROFILE.changed).toBe(false);
  });

  it('기본 이미지로 되돌리면 coverImageKey ""', async () => {
    const sent = recordRequests();
    const { result } = setup();
    await loaded(result);
    act(() => result.current.images.COVER.reset());
    expect(result.current.images.COVER.url).toBeNull();
    await act(() => result.current.save());
    expect((await writes(sent)).at(-1)!.body).toEqual({ coverImageKey: '' });
    expect(result.current.host.coverImageUrl).toBeNull();
  });

  it('S3 PUT 실패 → 그 자리 오류(토스트 없음), retry()는 같은 파일로 발급부터 다시', async () => {
    let puts = 0;
    server.use(
      http.put(`${MOCK_S3_ORIGIN}/*`, () => {
        puts += 1;
        return new HttpResponse(null, { status: puts === 1 ? 403 : 200 });
      }),
    );
    const sent = recordRequests();
    const { result, queryClient } = setup();
    await loaded(result);
    await act(() => result.current.images.COVER.change(png()));
    expect(result.current.images.COVER.error).toBe('이미지를 올리지 못했어요. 다시 시도해 주세요');
    expect(result.current.images.COVER.changed).toBe(false);
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(false);
    await act(() => result.current.images.COVER.retry());
    expect(result.current.images.COVER.error).toBeNull();
    expect(result.current.images.COVER.changed).toBe(true);
    expect((await sent.lines()).filter((l) => l.startsWith('POST'))).toEqual([
      'POST /api/v2/hosts/11/images',
      'POST /api/v2/hosts/11/images',
    ]);
  });

  it('JPG·PNG가 아니면 요청 없이 그 자리 오류', async () => {
    const sent = recordRequests();
    const { result } = setup();
    await loaded(result);
    await act(() =>
      result.current.images.PROFILE.change(new File(['x'], 'a.gif', { type: 'image/gif' })),
    );
    expect(result.current.images.PROFILE.error).toBe('JPG·PNG 이미지만 올릴 수 있어요');
    expect(await writes(sent)).toEqual([]);
  });

  it('에러 분기 HOST_400_17(이 호스트의 이미지가 아님) → 올린 이미지를 버리고 그 자리 "다시 올려 주세요", 토스트 없음', async () => {
    server.use(
      http.patch('*/api/v2/hosts/11', () =>
        HttpResponse.json(
          {
            success: false,
            status: 400,
            code: 'HOST_400_17',
            reason: '이 호스트에 업로드한 이미지가 아닙니다.',
          },
          { status: 400 },
        ),
      ),
    );
    const { result, queryClient } = setup();
    await loaded(result);
    const before = result.current.images.PROFILE.url;
    await act(() => result.current.images.PROFILE.change(png()));
    act(() => result.current.setName('새 이름'));
    await act(() => result.current.save());
    expect(result.current.images.PROFILE).toMatchObject({
      url: before,
      changed: false,
      error: '이미지를 다시 올려 주세요',
    });
    // 다른 칸 변경은 남는다
    expect(result.current.values.name).toBe('새 이름');
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(false);
  });

  it('mock도 다른 호스트에 발급한 key는 HOST_400_17로 막는다', async () => {
    const res = await fetch('http://localhost:8080/api/v2/hosts/11', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ profileImageKey: 'host/12/00000000-0000-4000-8000-000000000001.png' }),
    });
    expect(await res.json()).toMatchObject({ code: 'HOST_400_17' });
  });
});
