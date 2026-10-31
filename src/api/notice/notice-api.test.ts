import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  HIDDEN_NOTICE_ID,
  HOST_NOTICE_ID,
  MISSING_NOTICE_ID,
  PINNED_NOTICE_ID,
  SANITIZE_NOTICE_ID,
} from '@/api/__mocks__/fixtures/notice';
import { recordRequests } from '@/test/requests';

import { ApiError } from '../errors';
import { flattenPages } from '../shared/page';
import { noticeBannersQuery, noticeQuery, noticesQuery } from './queries';
import { NOTICE_TARGETS, NoticeDetailSchema, NoticeTargetSchema } from './schema';

/**
 * 서비스 공지 GA-1 · GA-2 · GA-3 — 백엔드 `V2NoticeController`·`V2NoticeDtos`·`V2ReadNoticesUseCase`·`NoticeRepository`
 * (dev d89d4f9, `V2NoticeTest`의 시나리오) 기준(plan §0 테스트 2). 모두 공개 GET — 쿠키 없이(`omit`) 보낸다.
 */
afterEach(() => vi.restoreAllMocks());

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('스키마', () => {
  it('대상은 ALL · HOST 2종, 모르는 값은 UNKNOWN', () => {
    expect(NOTICE_TARGETS).toEqual(['ALL', 'HOST']);
    expect(NoticeTargetSchema.parse('HOST')).toBe('HOST');
    expect(NoticeTargetSchema.parse('PARTNER')).toBe('UNKNOWN');
  });

  it('상세 — 시각이 null이어도 읽는다(서버 타입이 nullable)', () => {
    const parsed = NoticeDetailSchema.parse({
      noticeId: 1,
      title: '점검 안내',
      content: '<p>점검</p>',
      target: 'ALL',
      pinned: false,
      createdAt: null,
      updatedAt: null,
    });
    expect(parsed.createdAt).toBeNull();
  });
});

describe('GA-1 목록', () => {
  it('관객(USER)은 ALL 공지만, 고정 먼저 → 최신순, 20건씩(Page — totalElements가 온다), 쿠키 없이', async () => {
    const sent = recordRequests();
    const qc = client();
    const data = await qc.fetchInfiniteQuery(noticesQuery('USER'));
    const first = data.pages[0]!;
    expect(first.totalElements).toBe(24);
    expect(first.hasNext).toBe(true);
    expect(first.content).toHaveLength(20);
    expect(first.content.slice(0, 3).map((n) => n.noticeId)).toEqual([
      SANITIZE_NOTICE_ID,
      PINNED_NOTICE_ID,
      26,
    ]);
    expect(first.content.every((n) => n.target === 'ALL')).toBe(true);
    expect(first.content.some((n) => n.noticeId === HIDDEN_NOTICE_ID)).toBe(false);
    expect(await sent.list()).toMatchObject([
      {
        method: 'GET',
        path: '/api/v2/notices',
        query: { audience: 'USER', page: '0' },
        credentials: 'omit',
      },
    ]);
  });

  it('호스팅 센터(HOST)는 ALL + HOST 공지', async () => {
    const qc = client();
    const data = await qc.fetchInfiniteQuery(noticesQuery('HOST', { size: 50 }));
    const items = flattenPages(data, (n) => n.noticeId);
    expect(items).toHaveLength(29);
    expect(items.find((n) => n.noticeId === HOST_NOTICE_ID)?.target).toBe('HOST');
  });

  it('size 상한(50)을 넘으면 400 BAD_REQUEST', async () => {
    await expect(
      client().fetchInfiniteQuery(noticesQuery('USER', { size: 51 })),
    ).rejects.toMatchObject({ status: 400, code: 'BAD_REQUEST' });
  });
});

describe('GA-2 상세', () => {
  it('본문 HTML과 수정 시각이 온다(ALL 공지)', async () => {
    const notice = await client().fetchQuery(noticeQuery(SANITIZE_NOTICE_ID));
    expect(notice).toMatchObject({ noticeId: SANITIZE_NOTICE_ID, target: 'ALL', pinned: true });
    expect(notice.content).toContain('<p');
    expect(notice.updatedAt).not.toBe(notice.createdAt);
  });

  it('HOST 공지도 audience 없이 열린다(공유 링크)', async () => {
    const notice = await client().fetchQuery(noticeQuery(HOST_NOTICE_ID));
    expect(notice.target).toBe('HOST');
  });

  it.each([
    ['숨긴 공지', HIDDEN_NOTICE_ID],
    ['없는 공지', MISSING_NOTICE_ID],
  ])('%s는 404 Notice_404_1', async (_, id) => {
    const error = await client()
      .fetchQuery(noticeQuery(id))
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: 'Notice_404_1' });
  });
});

describe('GA-3 배너', () => {
  it('관객은 노출 기간 안의 ALL 배너만(상시), 지난·예정·숨긴 배너는 없다, 쿠키 없이', async () => {
    const sent = recordRequests();
    const banners = await client().fetchQuery(noticeBannersQuery('USER'));
    expect(banners).toEqual([
      {
        noticeId: SANITIZE_NOTICE_ID,
        title: '[점검] 11월 2일 새벽 서버 점검 안내',
        bannerEndAt: null,
      },
    ]);
    expect(await sent.list()).toMatchObject([
      { path: '/api/v2/notices/banners', query: { audience: 'USER' }, credentials: 'omit' },
    ]);
  });

  it('호스팅 센터는 HOST 배너까지, 최신순(id 내림차순)', async () => {
    const banners = await client().fetchQuery(noticeBannersQuery('HOST'));
    expect(banners.map((b) => b.noticeId)).toEqual([SANITIZE_NOTICE_ID, HOST_NOTICE_ID]);
    expect(banners[1]!.bannerEndAt).toBe('2099.12.31 23:59');
  });

  it('배너 조회는 실패해도 전역 토스트를 띄우지 않는다(meta.silent)', () => {
    expect(noticeBannersQuery('USER').meta).toEqual({ silent: true });
  });
});
