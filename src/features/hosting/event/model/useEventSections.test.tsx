import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { actAsRole } from '@/api/__mocks__/host-store';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { hostingEventSets } from '@/api/__mocks__/hosting-event.handlers';
import { server } from '@/api/__mocks__/server';
import { eventChecklistQuery, eventManageQuery, eventSectionsQuery } from '@/api/event/queries';
import { UpdateEventSectionsRequestSchema } from '@/api/event/schema';
import { shouldToastMutationError } from '@/api/query-client';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useEventSections } from './useEventSections';

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

function setup(eventId: string) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="불러오는 중">{children}</Suspense>
    </QueryClientProvider>
  );
  return { ...renderHook(() => useEventSections(eventId), { wrapper }), queryClient };
}
type Hook = ReturnType<typeof setup>['result'];
const loaded = (result: Hook) => waitFor(() => expect(result.current).not.toBeNull());
const writes = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method !== 'GET');
async function save(result: Hook) {
  let ok = false;
  await act(async () => {
    ok = await result.current.save();
  });
  return ok;
}

describe('상세 정보 — 섹션 전체 교체(PE-6)', () => {
  it('준비중 공연: 쿠키를 싣는 GE-5로 읽고, 섹션이 없으면 기본 4탭(본문 없음)', async () => {
    const sent = recordRequests();
    const { result } = setup('140');
    await loaded(result);
    expect(result.current.sections.map((s) => s.title)).toEqual([
      '공연소개',
      '예매안내',
      '세트리스트',
      '유의사항',
    ]);
    expect(result.current.dirty).toBe(false);
    expect(result.current.canSave).toBe(false);
    expect((await sent.list()).find((r) => r.path.endsWith('/sections'))).toMatchObject({
      credentials: 'include',
    });
  });

  it('탭 하나만 고쳐도 모든 섹션을 보낸다(빈 본문은 null) — 응답을 편집용 키에, GE-7·GE-3·공개 GE-5를 무효화', async () => {
    const { result, queryClient } = setup('140');
    await loaded(result);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const first = result.current.sections[0]!.key;
    act(() => result.current.setContent(first, '<p>신입 환영 공연이에요</p>'));
    const sent = recordRequests();
    expect(await save(result)).toBe(true);
    const [put] = await writes(sent);
    expect(put).toMatchObject({
      method: 'PUT',
      path: '/api/v2/events/140/sections',
      body: {
        sections: [
          { title: '공연소개', content: '<p>신입 환영 공연이에요</p>', sortOrder: 0 },
          { title: '예매안내', content: null, sortOrder: 1 },
          { title: '세트리스트', content: null, sortOrder: 2 },
          { title: '유의사항', content: null, sortOrder: 3 },
        ],
      },
    });
    expect(UpdateEventSectionsRequestSchema.safeParse(put!.body).success).toBe(true);
    expect(invalidate.mock.calls.map(([f]) => f?.queryKey)).toEqual(
      expect.arrayContaining([
        eventChecklistQuery('140').queryKey,
        eventManageQuery('140').queryKey,
        eventSectionsQuery('140').queryKey,
      ]),
    );
    expect(result.current.dirty).toBe(false);
    expect(result.current.savedNotice).toBe('saved');
  });

  it('뺀 섹션은 본문에 없다(서버에서 지워진다) — 등록된 공연이면 registeredChanged, 관객 GE-5에 바로 반영', async () => {
    const { result, queryClient } = setup('101');
    await loaded(result);
    expect(result.current.sections).toHaveLength(4);
    const [, setlist] = [result.current.sections[0]!, result.current.sections[2]!];
    act(() => result.current.removeSection(setlist.key));
    const sent = recordRequests();
    await save(result);
    const body = (await writes(sent))[0]!.body as { sections: { title: string }[] };
    expect(body.sections.map((s) => s.title)).toEqual(['공연 소개', '예매안내', '유의사항']);
    expect(result.current.savedNotice).toBe('registeredChanged');
    const pub = await queryClient.fetchQuery(eventSectionsQuery('101'));
    expect(pub.map((s) => s.title)).toEqual(['공연 소개', '예매안내', '유의사항']);
  });

  it('1~10개: 10개면 더하지 않고 1개면 빼지 않는다, 빈 제목은 칸 오류로 요청하지 않는다', async () => {
    const { result } = setup('140');
    await loaded(result);
    for (let i = 0; i < 7; i += 1) act(() => result.current.addSection());
    expect(result.current.sections).toHaveLength(10);
    expect(result.current.canAddSection).toBe(false);
    act(() => result.current.addSection());
    expect(result.current.sections).toHaveLength(10);
    const sent = recordRequests();
    expect(await save(result)).toBe(false);
    const blank = result.current.sections.at(-1)!.key;
    expect(result.current.errors[blank]!.title).toBe('탭 이름을 입력해 주세요');
    expect(await writes(sent)).toEqual([]);
  });

  it('본문 이미지: PE-10(SECTION) → S3 → url을 돌려준다', async () => {
    const { result } = setup('140');
    await loaded(result);
    const sent = recordRequests();
    let url: string | null = null;
    await act(async () => {
      url = await result.current.uploadSectionImage(
        new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' }),
      );
    });
    expect(url).toMatch(/^https:\/\/image\.mock\.dudoong\.test\/event\/140\/.+\.jpeg$/);
    expect((await sent.list())[0]).toMatchObject({
      path: '/api/v2/events/140/images',
      body: { purpose: 'SECTION', extension: 'JPEG' },
    });
  });

  it('일반 멤버: 읽기 전용 — 고치지도 올리지도 않는다', async () => {
    actAsRole(11, 'GUEST');
    const { result } = setup('101');
    await loaded(result);
    expect(result.current.canEdit).toBe(false);
    const key = result.current.sections[0]!.key;
    act(() => result.current.setTitle(key, '바꿈'));
    expect(result.current.sections[0]!.title).toBe('공연 소개');
    expect(result.current.canAddSection).toBe(false);
    const sent = recordRequests();
    await act(() =>
      result.current.uploadSectionImage(new File([], 'a.png', { type: 'image/png' })),
    );
    expect(await sent.list()).toEqual([]);
  });

  it('에러 분기 Event_400_21 → 폼 오류, 토스트 없음', async () => {
    server.use(...hostingEventSets.sectionsFails(140, 'Event_400_21'));
    const { result, queryClient } = setup('140');
    await loaded(result);
    act(() => result.current.setContent(result.current.sections[0]!.key, '<p>x</p>'));
    expect(await save(result)).toBe(false);
    expect(result.current.formError).toBe(
      '섹션 형식을 확인해 주세요(1~10개, 탭 이름 20자, 본문 20,000자)',
    );
    const m = queryClient.getMutationCache().getAll().at(-1)!;
    expect(shouldToastMutationError(m.state.error, m.options.meta)).toBe(false);
  });
});
