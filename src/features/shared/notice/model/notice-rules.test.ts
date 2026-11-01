import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NoticeBanner } from '@/api/notice/schema';
import { parseKstDateTime } from '@/api/shared/date';

import {
  BANNER_DISMISSED_KEY,
  BANNER_DISMISSED_MAX,
  dismissBanner,
  readDismissedBanners,
  resetDismissedBannersMemory,
} from './banner-dismissal';
import { renderNoticeHtml } from './notice-html';
import {
  isBannerLive,
  isNoticeEdited,
  noticeHref,
  noticeListHref,
  parseNoticeIdParam,
  toNoticeRow,
  visibleBanners,
} from './notice-rules';

describe('공지 id·경로(plan P9c)', () => {
  it.each([
    ['12', '12'],
    ['007', '7'],
    ['0', null],
    ['abc', null],
    ['1.5', null],
    ['-1', null],
    ['12345678901234567', null],
  ])('경로 id %s → %s', (raw, expected) => {
    expect(parseNoticeIdParam(raw)).toBe(expected);
  });

  it.each([
    ['USER', '/notices', '/notices/3'],
    ['HOST', '/hosting/notices', '/hosting/notices/3'],
  ] as const)('%s 목록 %s · 상세 %s', (audience, list, detail) => {
    expect(noticeListHref(audience)).toBe(list);
    expect(noticeHref(audience, 3)).toBe(detail);
  });

  it('목록 행 — 제목·고정·호스트 전용 표시·상세 경로', () => {
    expect(
      toNoticeRow('HOST', {
        noticeId: 28,
        title: '<b>호스트</b> 공지',
        target: 'HOST',
        pinned: false,
        createdAt: '2026.10.29 10:00',
      }),
    ).toEqual({
      id: 28,
      title: '<b>호스트</b> 공지',
      pinned: false,
      hostOnly: true,
      createdAt: '2026.10.29 10:00',
      href: '/hosting/notices/28',
    });
  });
});

describe('본문 HTML — 섹션 뷰어와 같은 sanitize를 한 번 더(PR #832 권고)', () => {
  it('스크립트·이벤트 속성·javascript: 링크를 지우고 외부 링크에 rel을 붙인다', () => {
    const html = renderNoticeHtml(
      '<p onclick="x()">점검</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><a href="https://dudoong.com" target="_blank">약관</a>',
    )!;
    expect(html).not.toMatch(/script|onclick|javascript:/);
    expect(html).toContain('<p>점검</p>');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it.each([
    ['빈 문자열', ''],
    ['공백만', '   '],
    ['sanitize 뒤 빈 본문', '<script>alert(1)</script>'],
  ])('%s → null(빈 상태)', (_, content) => {
    expect(renderNoticeHtml(content)).toBeNull();
  });

  it.each([
    ['같은 시각', '2026.10.30 18:00', '2026.10.30 18:00', false],
    ['고친 공지', '2026.10.30 18:00', '2026.10.31 09:30', true],
    ['시각 없음', null, '2026.10.31 09:30', false],
  ])('수정 표시 — %s', (_, createdAt, updatedAt, expected) => {
    expect(isNoticeEdited({ createdAt, updatedAt })).toBe(expected);
  });
});

describe('배너 — 끝난 배너·닫은 배너는 빼고 서버 순서 그대로', () => {
  const now = parseKstDateTime('2026.10.31 12:00');
  const banner = (noticeId: number, bannerEndAt: string | null): NoticeBanner => ({
    noticeId,
    title: `배너 ${noticeId}`,
    bannerEndAt,
  });

  it.each([
    ['종료 없음(운영자가 끌 때까지)', null, true],
    ['종료 전', '2026.10.31 12:01', true],
    ['종료 시각 그 분(종료 미포함)', '2026.10.31 12:00', false],
    ['종료 뒤(캐시한 응답)', '2026.10.31 11:59', false],
    ['읽을 수 없는 시각은 서버 판단을 믿는다', '2026-10-31T11:00', true],
  ])('%s', (_, bannerEndAt, expected) => {
    expect(isBannerLive({ bannerEndAt }, now)).toBe(expected);
  });

  it('닫은 배너와 끝난 배너를 뺀다', () => {
    const list = [banner(3, null), banner(2, '2026.10.31 11:00'), banner(1, null)];
    expect(visibleBanners(list, new Set([3]), now).map((b) => b.noticeId)).toEqual([1]);
  });
});

describe('배너 닫기 기록(localStorage)', () => {
  beforeEach(() => {
    localStorage.clear();
    resetDismissedBannersMemory();
  });
  afterEach(() => vi.restoreAllMocks());

  it('닫은 id를 저장소에 남기고 같은 id는 한 번만', () => {
    dismissBanner(30);
    dismissBanner(30);
    dismissBanner(28);
    expect(readDismissedBanners()).toEqual([30, 28]);
    expect(localStorage.getItem(BANNER_DISMISSED_KEY)).toBe('[30,28]');
  });

  it(`최근 ${BANNER_DISMISSED_MAX}개만 남긴다`, () => {
    for (let id = 1; id <= BANNER_DISMISSED_MAX + 5; id += 1) dismissBanner(id);
    const ids = readDismissedBanners();
    expect(ids).toHaveLength(BANNER_DISMISSED_MAX);
    expect(ids[0]).toBe(6);
  });

  it('깨진 저장 값은 빈 기록으로 본다', () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, '{oops');
    expect(readDismissedBanners()).toEqual([]);
    localStorage.setItem(BANNER_DISMISSED_KEY, '[1,"x",2]');
    expect(readDismissedBanners()).toEqual([1, 2]);
  });

  it('저장소 쓰기가 막혀 있으면 이 탭 메모리에만 남는다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    dismissBanner(30);
    expect(readDismissedBanners()).toEqual([30]);
  });
});
