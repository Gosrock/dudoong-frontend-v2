import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setStoredValidTicket } from '@/api/__mocks__/event-store';
import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { actAsRole } from '@/api/__mocks__/host-store';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { type EventErrorCode, hostingEventSets } from '@/api/__mocks__/hosting-event.handlers';
import { server } from '@/api/__mocks__/server';
import {
  eventChecklistQuery,
  eventDetailQuery,
  eventManageQuery,
  MY_EVENTS_KEY,
} from '@/api/event/queries';
import { type EventManage, UpdateEventBasicRequestSchema } from '@/api/event/schema';
import { shouldToastMutationError } from '@/api/query-client';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import type { Geocoder } from './place';
import { useEventBasicInfo } from './useEventBasicInfo';

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

const NOW = () => new Date('2026-10-26T03:00:00Z');
const ROLLING_HALL = { latitude: 37.5509, longitude: 126.9219 };
/** 가짜 Geocoder — "없는 주소"만 못 찾는다 */
const fakeGeocode: Geocoder = vi.fn(async (address: string) =>
  address.includes('없는 주소') ? null : ROLLING_HALL,
);

/** 고스락(mock 사용자 마스터) 준비중 공연(장소 없음) */
const PREPARING = '140';
/** 등록된 공연(장소·상세주소 있음) */
const OPEN = '101';

function setup(eventId: string) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="불러오는 중">{children}</Suspense>
    </QueryClientProvider>
  );
  return {
    ...renderHook(() => useEventBasicInfo(eventId, { geocode: fakeGeocode, now: NOW }), {
      wrapper,
    }),
    queryClient,
  };
}
type Hook = ReturnType<typeof setup>['result'];
const loaded = (result: Hook) => waitFor(() => expect(result.current).not.toBeNull());
const writes = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method !== 'GET' && !r.path.endsWith('/images'));
const png = () => new File([new Uint8Array([0x89, 0x50])], 'poster.png', { type: 'image/png' });
const lastMutation = (qc: ReturnType<typeof setup>['queryClient']) =>
  qc.getMutationCache().getAll().at(-1)!;

async function save(result: Hook) {
  let ok = false;
  await act(async () => {
    ok = await result.current.save();
  });
  return ok;
}

describe('기본 정보 — 장소(주소 → 좌표 → 공연장 이름·상세주소)', () => {
  it('주소를 고르면 좌표를 얻고, 저장 본문에 장소 4필드 + 상세주소를 모두 채운다 → 체크리스트 ①에 반영', async () => {
    const { result, queryClient } = setup(PREPARING);
    await loaded(result);
    await act(() => result.current.selectAddress(' 서울 마포구 어울마당로 35 '));
    expect(fakeGeocode).toHaveBeenCalledWith('서울 마포구 어울마당로 35');
    expect(result.current.values.place).toMatchObject({
      address: '서울 마포구 어울마당로 35',
      ...ROLLING_HALL,
    });
    act(() => {
      result.current.setPlaceName('롤링홀');
      result.current.setDetailAddress('지하 1층');
    });
    const sent = recordRequests();
    expect(await save(result)).toBe(true);
    const [patch] = await writes(sent);
    expect(patch).toMatchObject({
      method: 'PATCH',
      path: '/api/v2/events/140/basic',
      body: {
        place: {
          name: '롤링홀',
          address: '서울 마포구 어울마당로 35',
          latitude: 37.5509,
          longitude: 126.9219,
          detailAddress: '지하 1층',
        },
      },
    });
    expect(Object.keys(patch!.body as object)).toEqual(['place']);
    expect(UpdateEventBasicRequestSchema.safeParse(patch!.body).success).toBe(true);
    // 응답(GE-3 모양)을 GE-3 키에 넣었다
    expect(
      queryClient.getQueryData<EventManage>(eventManageQuery(PREPARING).queryKey)?.place,
    ).toMatchObject({
      name: '롤링홀',
      detailAddress: '지하 1층',
    });
    expect(result.current.savedNotice).toBe('saved');
    expect(result.current.dirty).toBe(false);
  });

  it('좌표를 못 얻으면 다른 주소를 고르게 하고 저장하지 않는다', async () => {
    const { result } = setup(PREPARING);
    await loaded(result);
    await act(() => result.current.selectAddress('없는 주소 1'));
    expect(result.current.placeLookupError).toBe(
      '이 주소의 위치를 찾지 못했어요. 다른 주소를 골라 주세요',
    );
    act(() => result.current.setPlaceName('어딘가'));
    const sent = recordRequests();
    expect(await save(result)).toBe(false);
    expect(result.current.errors.place).toBe(
      '이 주소의 위치를 찾지 못했어요. 다른 주소를 골라 주세요',
    );
    expect(await writes(sent)).toEqual([]);
  });

  it('장소 수정 시 상세주소만 바꿔도 detailAddress를 포함한 장소 전체를 보낸다', async () => {
    const { result } = setup(OPEN);
    await loaded(result);
    act(() => result.current.setDetailAddress('2층'));
    const sent = recordRequests();
    await save(result);
    expect((await writes(sent))[0]!.body).toEqual({
      place: {
        name: '홍대 롤링홀',
        address: '서울 마포구 어울마당로 35',
        latitude: 37.5509,
        longitude: 126.9219,
        detailAddress: '2층',
      },
    });
  });
});

describe('기본 정보 — 포스터 · 저장 · 등록된 공연', () => {
  it('포스터: PE-10(POSTER) 발급 → S3 PUT → 저장하면 posterImageKey로 PE-4', async () => {
    const { result } = setup(PREPARING);
    await loaded(result);
    const all = recordRequests();
    await act(() => result.current.poster.change(png()));
    expect(result.current.poster.changed).toBe(true);
    expect(result.current.poster.url).toMatch(/event\/140\//);
    await save(result);
    const list = await all.list();
    expect(list.map((r) => `${r.method} ${r.path.replace(/\/event\/.*$/, '/event/…')}`)).toEqual([
      'POST /api/v2/events/140/images',
      'PUT /event/…',
      'PATCH /api/v2/events/140/basic',
    ]);
    expect(list[0]!.body).toEqual({ purpose: 'POSTER', extension: 'PNG' });
    expect((list[2]!.body as { posterImageKey: string }).posterImageKey).toMatch(
      /^event\/140\/.+\.png$/,
    );
  });

  it('바뀐 것이 없으면 요청하지 않는다', async () => {
    const { result } = setup(OPEN);
    await loaded(result);
    const sent = recordRequests();
    expect(await save(result)).toBe(false);
    expect(await sent.list()).toEqual([]);
  });

  it('저장 뒤 GE-7·GE-1·관객 공연 상세 공개 키를 무효화한다 — 공연 상세를 열면 바로 반영', async () => {
    const { result, queryClient } = setup(OPEN);
    await loaded(result);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    act(() => result.current.setName('고스락 제37회 정기공연(수정)'));
    await save(result);
    const keys = invalidate.mock.calls.map(([f]) => f?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([
        eventChecklistQuery(OPEN).queryKey,
        MY_EVENTS_KEY,
        eventDetailQuery(OPEN).queryKey,
        ['events', OPEN, 'viewer'],
        ['events', OPEN, 'sections'],
      ]),
    );
    const detail = await queryClient.fetchQuery(eventDetailQuery(OPEN));
    expect(detail.name).toBe('고스락 제37회 정기공연(수정)');
  });

  it('등록된 공연을 저장하면 안내가 필요하다는 상태(registeredChanged), 티켓 여부는 잠겨 있다', async () => {
    const { result } = setup(OPEN);
    await loaded(result);
    expect(result.current.registered).toBe(true);
    expect(result.current.hasTicketLocked).toBe(true);
    act(() => result.current.setHasTicket(false));
    expect(result.current.values.hasTicket).toBe(true);
    act(() => result.current.setName('바꾼 이름'));
    await save(result);
    expect(result.current.savedNotice).toBe('registeredChanged');
  });

  it('등록된 공연의 시작을 지금 이전으로 바꾸면 칸 오류 — 요청하지 않는다', async () => {
    const { result } = setup(OPEN);
    await loaded(result);
    act(() => result.current.setSchedule({ date: '2026-10-01' }));
    const sent = recordRequests();
    expect(await save(result)).toBe(false);
    expect(result.current.errors.schedule).toBe('시작 시각은 지금 이후로 정해 주세요');
    expect(await writes(sent)).toEqual([]);
  });

  it('일정: 날짜 1칸 + 시각 — 종료 ≤ 시작이면 다음 날로 보낸다', async () => {
    const { result } = setup(PREPARING);
    await loaded(result);
    act(() => result.current.setSchedule({ startTime: '23:00', endTime: '01:00' }));
    expect(result.current.scheduleRange).toEqual({
      startAt: '2027.03.20 23:00',
      endAt: '2027.03.21 01:00',
      overnight: true,
    });
    const sent = recordRequests();
    await save(result);
    expect((await writes(sent))[0]!.body).toEqual({
      startAt: '2027.03.20 23:00',
      endAt: '2027.03.21 01:00',
    });
  });
});

describe('기본 정보 — 읽기 전용', () => {
  it('일반 멤버: 읽기 전용(role) — 바꾸지도 저장하지도 않는다', async () => {
    actAsRole(11, 'GUEST');
    const { result } = setup(PREPARING);
    await loaded(result);
    expect(result.current.canEdit).toBe(false);
    expect(result.current.readOnlyReason).toBe('role');
    act(() => result.current.setName('바꿈'));
    expect(result.current.values.name).toBe('고스락 신입 환영 공연(준비중)');
    const sent = recordRequests();
    await act(() => result.current.poster.change(png()));
    expect(await save(result)).toBe(false);
    expect(await sent.list()).toEqual([]);
  });

  it('지난 공연: 읽기 전용(ended)', async () => {
    const { result } = setup('90');
    await loaded(result);
    expect(result.current.readOnlyReason).toBe('ended');
    expect(result.current.readOnlyMessage).toBe('끝난 공연은 수정할 수 없어요');
  });
});

describe('기본 정보 — 에러 분기(patterns §24 P11)', () => {
  it.each<[EventErrorCode, 'schedule' | 'contacts' | 'tags', (r: Hook) => void]>([
    ['Event_400_2', 'schedule', (r) => r.current.setSchedule({ endTime: '21:00' })],
    ['Event_400_24', 'schedule', (r) => r.current.setSchedule({ endTime: '21:00' })],
    ['Event_400_20', 'contacts', (r) => r.current.setContactValue(0, '@x')],
    ['Event_400_23', 'tags', (r) => r.current.toggleTag(5)],
  ])('%s → %s 칸 오류, 토스트 없음 — 그 칸을 고치면 지운다', async (code, field, fix) => {
    server.use(...hostingEventSets.basicFails(140, code));
    const { result, queryClient } = setup(PREPARING);
    await loaded(result);
    act(() => {
      result.current.setName('바꾼 이름');
      result.current.setContactType(0, 'INSTAGRAM');
      result.current.setContactValue(0, '@gosrock');
      result.current.toggleTag(1);
      result.current.setSchedule({ endTime: '20:30' });
    });
    expect(await save(result)).toBe(false);
    expect(result.current.serverErrors[field]).toBeTruthy();
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.options.meta)).toBe(false);
    act(() => fix(result));
    expect(result.current.serverErrors[field]).toBeUndefined();
  });

  it('Event_400_25(유효 티켓이 있는데 티켓 없음으로) → 티켓 여부 칸 오류', async () => {
    setStoredValidTicket(140, true);
    const { result } = setup(PREPARING);
    await loaded(result);
    act(() => result.current.setHasTicket(false));
    expect(await save(result)).toBe(false);
    expect(result.current.serverErrors.hasTicket).toBe(
      '티켓이 있는 공연은 티켓 없음으로 바꿀 수 없어요',
    );
  });

  it('Event_400_22(이 공연 포스터 key가 아님) → 올린 포스터를 버리고 "다시 올려 주세요"', async () => {
    server.use(...hostingEventSets.basicFails(140, 'Event_400_22'));
    const { result } = setup(PREPARING);
    await loaded(result);
    await act(() => result.current.poster.change(png()));
    expect(await save(result)).toBe(false);
    expect(result.current.poster.changed).toBe(false);
    expect(result.current.poster.url).toBeNull();
    expect(result.current.poster.error).toBe('포스터를 다시 올려 주세요');
  });

  it('Event_400_17(정산중·지난 공연) → 화면 오류 + GE-3을 다시 읽는다', async () => {
    server.use(...hostingEventSets.basicFails(140, 'Event_400_17'));
    const { result, queryClient } = setup(PREPARING);
    await loaded(result);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    act(() => result.current.setName('바꿈'));
    await save(result);
    expect(result.current.formError).toBe('끝난 공연은 수정할 수 없어요');
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: eventManageQuery(PREPARING).queryKey,
      exact: true,
    });
  });

  it('S3 PUT 실패 → 포스터 자리 오류, retry()는 같은 파일로 발급부터 다시', async () => {
    const { http, HttpResponse } = await import('msw');
    const { MOCK_S3_ORIGIN } = await import('@/api/__mocks__/upload-handlers');
    server.use(
      http.put(`${MOCK_S3_ORIGIN}/*`, () => new HttpResponse(null, { status: 403 }), {
        once: true,
      }),
    );
    const { result } = setup(PREPARING);
    await loaded(result);
    const sent = recordRequests();
    await act(() => result.current.poster.change(png()));
    expect(result.current.poster.error).toBe('이미지를 올리지 못했어요. 다시 시도해 주세요');
    await act(() => result.current.poster.retry());
    expect(result.current.poster.error).toBeNull();
    expect(result.current.poster.changed).toBe(true);
    expect((await sent.list()).filter((r) => r.path.endsWith('/images'))).toHaveLength(2);
  });
});
