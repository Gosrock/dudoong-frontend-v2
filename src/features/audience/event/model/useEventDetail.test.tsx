import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { eventDetailHandlers } from '@/api/__mocks__/event-detail.handlers';
import { server } from '@/api/__mocks__/server';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { EventDetailView } from '../EventDetail/EventDetailView';
import { useEventDetail } from './useEventDetail';

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as { __xss?: unknown }).__xss;
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="불러오는 중">{children}</Suspense>
    </QueryClientProvider>
  );
}

describe('공연 상세 화면 상태(useEventDetail)', () => {
  it('GP-3·GE-5만 쿠키 없이 부르고, 재고(GP-5)는 부르지 않는다', async () => {
    const sent = recordRequests();
    const { result } = renderHook(() => useEventDetail('101'), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());

    const list = await sent.list();
    expect(list.map((r) => `${r.method} ${r.path}`).sort()).toEqual([
      'GET /api/v2/events/101',
      'GET /api/v2/events/101/sections',
    ]);
    expect(list.every((r) => r.credentials === 'omit')).toBe(true);
  });

  it('제목·일시(러닝타임)·해시태그·섹션 탭을 돌려준다(문의처는 useEventContacts)', async () => {
    const { result } = renderHook(() => useEventDetail('101'), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    const s = result.current;
    expect(s.title).toBe('고스락 제37회 정기공연');
    expect(s.schedule?.label).toBe('2026.11.21 (토) 19:00 (120분)');
    expect(s.hashtags.map((h) => h.label)).toEqual([
      '#정기공연',
      '#락밴드',
      '#서울',
      '#대학동아리',
    ]);
    expect(s.tabs.map((t) => [t.title, t.html !== null])).toEqual([
      ['공연 소개', true],
      ['예매안내', true],
      ['세트리스트', true],
      ['유의사항', false],
    ]);
  });

  it('서버 섹션이 없는 공연은 기본 4탭을 빈 상태로 만든다', async () => {
    server.use(...eventDetailHandlers.noSections(103));
    const { result } = renderHook(() => useEventDetail('103'), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.tabs.map((t) => [t.title, t.html, t.isDefault])).toEqual([
      ['공연소개', null, true],
      ['예매안내', null, true],
      ['세트리스트', null, true],
      ['유의사항', null, true],
    ]);
  });

  it('v1 이관 공연(MARKDOWN 대체 섹션 하나)은 마크다운을 HTML로 바꿔 탭 하나로 둔다', async () => {
    const { result } = renderHook(() => useEventDetail('102'), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0]?.html).toContain('<h2>소음공작소 여름 공연</h2>');
  });
});

describe('공연 상세 최소 마크업(EventDetailView)', () => {
  it('섹션 본문을 sanitize해서 넣는다 — XSS 페이로드가 실행되지 않는다', async () => {
    server.use(...eventDetailHandlers.xssSection(101));
    const { container } = renderWithProviders(<EventDetailView eventId="101" />);
    const section = await screen.findByRole('region', { name: '공연 소개' });
    expect(within(section).getByText('안전한 글')).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/onerror|<script/i);
    expect((window as { __xss?: unknown }).__xss).toBeUndefined();
  });

  it('섹션 10개를 모두 그린다', async () => {
    server.use(...eventDetailHandlers.tenSections(101));
    renderWithProviders(<EventDetailView eventId="101" />);
    expect(await screen.findByRole('heading', { name: '섹션 10' })).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('region')
        .filter((r) => r.getAttribute('aria-labelledby')?.startsWith('section-')),
    ).toHaveLength(10);
  });

  it('잔여 수량을 그리지 않는다', async () => {
    const { container } = renderWithProviders(<EventDetailView eventId="101" />);
    await screen.findByRole('heading', { level: 1, name: '고스락 제37회 정기공연' });
    expect(container.textContent).not.toMatch(/잔여|매진|42/);
  });
});
