import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  HIDDEN_NOTICE_ID,
  HOST_NOTICE_ID,
  SANITIZE_NOTICE_ID,
} from '@/api/__mocks__/fixtures/notice';
import { noticeHandlers } from '@/api/__mocks__/notice.handlers';
import { errors } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import { shouldToastQueryError } from '@/api/query-client';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { NoticeBannerView } from '../NoticeBannerView';
import { NoticeDetailView } from '../NoticeDetailView';
import { BANNER_DISMISSED_KEY, resetDismissedBannersMemory } from './banner-dismissal';
import { useNoticeBanner } from './useNoticeBanner';
import { useNoticeDetail } from './useNoticeDetail';
import { useNoticeList } from './useNoticeList';

beforeEach(() => {
  localStorage.clear();
  resetDismissedBannersMemory();
});
afterEach(() => vi.restoreAllMocks());

function setup() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>{children}</Suspense>
    </QueryClientProvider>
  );
  return { queryClient, wrapper };
}

const LIST = '/api/v2/notices';

describe('공지 목록 — useNoticeList', () => {
  it('관객: 첫 페이지 20건(고정 먼저), 다음 페이지는 page=1로 — hasNext로 끝난다', async () => {
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useNoticeList('USER'), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(20));
    expect(result.current.items[0]).toMatchObject({
      id: SANITIZE_NOTICE_ID,
      pinned: true,
      hostOnly: false,
      href: `/notices/${SANITIZE_NOTICE_ID}`,
    });
    expect(result.current.hasNext).toBe(true);

    act(() => result.current.fetchNext());
    await waitFor(() => expect(result.current.items).toHaveLength(24));
    expect(result.current.hasNext).toBe(false);
    expect(result.current.items.some((i) => i.hostOnly)).toBe(false);
    const queries = (await sent.list()).filter((r) => r.path === LIST).map((r) => r.query);
    expect(queries).toEqual([
      { audience: 'USER', page: '0' },
      { audience: 'USER', page: '1' },
    ]);
  });

  it('호스팅 센터: HOST 공지가 섞이고 상세 경로는 /hosting/notices/{id}', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useNoticeList('HOST', { size: 50 }), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(29));
    expect(result.current.items.find((i) => i.id === HOST_NOTICE_ID)).toMatchObject({
      hostOnly: true,
      href: `/hosting/notices/${HOST_NOTICE_ID}`,
    });
  });

  it('공지가 없으면 빈 상태', async () => {
    server.use(...noticeHandlers.empty);
    const { wrapper } = setup();
    const { result } = renderHook(() => useNoticeList('USER'), { wrapper });
    await waitFor(() => expect(result.current.empty).toBe(true));
    expect(result.current.hasNext).toBe(false);
  });

  it('다음 페이지가 실패하면 기존 행을 지우지 않고 nextPageFailed → fetchNext로 다시', async () => {
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useNoticeList('USER'), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(20));

    server.use(
      http.get('*/api/v2/notices', ({ request }) =>
        new URL(request.url).searchParams.get('page') === '1'
          ? errors.serverError(request)
          : undefined,
      ),
    );
    act(() => result.current.fetchNext());
    await waitFor(() => expect(result.current.nextPageFailed).toBe(true));
    expect(result.current.items).toHaveLength(20);
    const query = queryClient.getQueryCache().getAll()[0]!;
    expect(shouldToastQueryError(query.state.error, query.state, query.meta)).toBe(false);

    server.resetHandlers();
    act(() => result.current.fetchNext());
    await waitFor(() => expect(result.current.items).toHaveLength(24));
    expect(result.current.nextPageFailed).toBe(false);
  });
});

describe('공지 상세 — useNoticeDetail · NoticeDetailView', () => {
  it('본문은 sanitize한 html로, 고친 공지 표시, 목록 경로는 보는 화면 기준', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useNoticeDetail(String(SANITIZE_NOTICE_ID), 'HOST'), {
      wrapper,
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.html).not.toMatch(/script|onclick|javascript:/);
    expect(result.current.html).toContain('11월 2일 02:00~04:00 서버 점검이 있어요.');
    expect(result.current.edited).toBe(true);
    expect(result.current.hostOnly).toBe(false);
    expect(result.current.listHref).toBe('/hosting/notices');
  });

  it('숨김·없는 공지(Notice_404_1)는 공용 404 + 공지 목록으로', async () => {
    renderWithProviders(<NoticeDetailView noticeId={String(HIDDEN_NOTICE_ID)} audience="HOST" />);
    expect(await screen.findByText('공지를 찾을 수 없어요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '공지 목록' })).toHaveAttribute(
      'href',
      '/hosting/notices',
    );
  });

  it('숫자가 아닌 id는 GA-2를 부르지 않고 공용 404', async () => {
    const sent = recordRequests();
    renderWithProviders(<NoticeDetailView noticeId="abc" audience="HOST" />);
    expect(await screen.findByText('공지를 찾을 수 없어요')).toBeInTheDocument();
    expect(await sent.list()).toEqual([]);
  });

  it('GA-2가 5xx면 다시 시도', async () => {
    server.use(...noticeHandlers.detailServerError);
    const { user } = renderWithProviders(
      <NoticeDetailView noticeId={String(SANITIZE_NOTICE_ID)} audience="HOST" />,
    );
    const retry = await screen.findByRole('button', { name: '다시 시도' });
    server.resetHandlers();
    await user.click(retry);
    expect(
      await screen.findByRole('heading', { name: '[점검] 11월 2일 새벽 서버 점검 안내' }),
    ).toBeInTheDocument();
  });
});

describe('상단 배너 — useNoticeBanner', () => {
  it('관객: 상시 배너 한 줄, 누르면 관객 공지 상세로, 쿠키 없이 audience=USER', async () => {
    const sent = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useNoticeBanner('USER'), { wrapper });
    await waitFor(() => expect(result.current.banner).not.toBeNull());
    expect(result.current.banner).toEqual({
      id: SANITIZE_NOTICE_ID,
      title: '[점검] 11월 2일 새벽 서버 점검 안내',
      href: `/notices/${SANITIZE_NOTICE_ID}`,
    });
    expect(result.current.remaining).toBe(1);
    expect(await sent.list()).toMatchObject([
      { path: '/api/v2/notices/banners', query: { audience: 'USER' }, credentials: 'omit' },
    ]);
  });

  it('호스팅 센터: 닫으면 다음 배너(HOST)가, 다 닫으면 없음 — 닫은 기록은 저장소에 남는다', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useNoticeBanner('HOST'), { wrapper });
    await waitFor(() => expect(result.current.banner?.id).toBe(SANITIZE_NOTICE_ID));
    expect(result.current.remaining).toBe(2);

    act(() => result.current.dismiss());
    expect(result.current.banner).toEqual({
      id: HOST_NOTICE_ID,
      title: '[호스트] 두둥티켓 환불 의무 안내',
      href: `/hosting/notices/${HOST_NOTICE_ID}`,
    });
    act(() => result.current.dismiss());
    expect(result.current.banner).toBeNull();
    expect(JSON.parse(localStorage.getItem(BANNER_DISMISSED_KEY)!)).toEqual([
      SANITIZE_NOTICE_ID,
      HOST_NOTICE_ID,
    ]);
  });

  it('닫은 배너는 새로 열어도(새 캐시) 다시 뜨지 않고, 관객 쪽에서도 같이 닫혀 있다', async () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, JSON.stringify([SANITIZE_NOTICE_ID]));
    const host = renderHook(() => useNoticeBanner('HOST'), { wrapper: setup().wrapper });
    await waitFor(() => expect(host.result.current.banner?.id).toBe(HOST_NOTICE_ID));
    const user = renderHook(() => useNoticeBanner('USER'), { wrapper: setup().wrapper });
    await waitFor(() => expect(user.result.current.remaining).toBe(0));
    expect(user.result.current.banner).toBeNull();
  });

  it('응답을 받은 뒤 종료 시각이 지나면 그 배너를 뺀다(캐시한 응답)', async () => {
    server.use(
      http.get('*/api/v2/notices/banners', () =>
        Response.json({
          success: true,
          status: 200,
          data: [{ noticeId: 5, title: '곧 끝나는 배너', bannerEndAt: '2026.10.31 12:00' }],
          timeStamp: '2026-10-31T11:00:00',
        }),
      ),
    );
    let clock = new Date('2026-10-31T02:59:00Z'); // KST 11:59
    const { wrapper } = setup();
    const { result, rerender } = renderHook(() => useNoticeBanner('USER', { now: () => clock }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.banner?.id).toBe(5));
    clock = new Date('2026-10-31T03:00:00Z'); // KST 12:00 — 종료 미포함
    rerender();
    expect(result.current.banner).toBeNull();
  });

  it('GA-3이 실패하면 배너 없이 두고 전역 토스트를 띄우지 않는다(meta.silent)', async () => {
    server.use(...noticeHandlers.bannersServerError);
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useNoticeBanner('USER'), { wrapper });
    await waitFor(() =>
      expect(queryClient.getQueryCache().getAll()[0]?.state.status).toBe('error'),
    );
    const query = queryClient.getQueryCache().getAll()[0]!;
    expect(result.current.banner).toBeNull();
    expect(shouldToastQueryError(query.state.error, { ...query.state, data: [] }, query.meta)).toBe(
      false,
    );
  });

  it('배너 뷰: [닫기]를 누르면 사라진다', async () => {
    server.use(
      http.get('*/api/v2/notices/banners', () =>
        Response.json({
          success: true,
          status: 200,
          data: [{ noticeId: SANITIZE_NOTICE_ID, title: '점검 안내', bannerEndAt: null }],
          timeStamp: '2026-10-31T11:00:00',
        }),
      ),
    );
    const { user } = renderWithProviders(<NoticeBannerView audience="USER" />);
    expect(await screen.findByRole('link', { name: '점검 안내' })).toHaveAttribute(
      'href',
      `/notices/${SANITIZE_NOTICE_ID}`,
    );
    await user.click(screen.getByRole('button', { name: '배너 닫기' }));
    expect(screen.queryByTestId('notice-banner')).not.toBeInTheDocument();
  });
});
