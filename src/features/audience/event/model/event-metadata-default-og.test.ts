import { describe, expect, it, vi } from 'vitest';

import { events, toDetail } from '@/api/__mocks__/fixtures/event';

import { eventMetadata } from './event-metadata';

// 기본 OG 이미지가 정해졌을 때의 동작(지금 값은 디자인 대기라 null — src/utils/site.ts)
vi.mock('@/utils/site', () => ({ DEFAULT_OG_IMAGE: '/og-default.png' }));

const event101 = toDetail(events.find((e) => e.eventId === 101)!);
const url = 'https://dudoong.com/events/101';

describe('공연 OG — 기본 이미지', () => {
  it('포스터가 없으면 기본 OG 이미지(상대 경로 → metadataBase로 절대 주소)', () => {
    const meta = eventMetadata({ ...event101, posterImageUrl: null }, url);
    expect(meta.openGraph?.images).toEqual([{ url: '/og-default.png', alt: event101.name }]);
    expect(meta.twitter).toEqual({ card: 'summary_large_image' });
  });

  it('포스터가 있으면 포스터', () => {
    expect(eventMetadata(event101, url).openGraph?.images).toEqual([
      { url: event101.posterImageUrl, alt: event101.name },
    ]);
  });
});
