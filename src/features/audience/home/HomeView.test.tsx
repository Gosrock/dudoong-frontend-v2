import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { eventBrowseSets } from '@/api/__mocks__/event.handlers';
import { server } from '@/api/__mocks__/server';
import { renderWithProviders } from '@/test/render';

import { HomeView } from './HomeView';
import { pastItem } from './HomeView.css';

describe('공연홈 근래 공연(Design Sync #356 · #357)', () => {
  it('끝난 공연(displayStatus PAST) 카드만 흐리게 — data-past와 흐림 클래스', async () => {
    // 시작 전 101 + 지난 공연 90 · 91
    server.use(...eventBrowseSets.homeWithPast);
    renderWithProviders(<HomeView />);

    const section = await screen.findByRole('region', { name: '다가오는 공연' });
    const list = within(section).getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);

    const upcoming = within(list)
      .getByRole('link', { name: /고스락 제37회 정기공연/ })
      .closest('li')!;
    const past = within(list)
      .getByRole('link', { name: /고스락 제36회 정기공연/ })
      .closest('li')!;

    expect(upcoming).not.toHaveAttribute('data-past');
    expect(upcoming.className).not.toContain(pastItem);
    expect(past).toHaveAttribute('data-past', 'true');
    expect(past.className).toContain(pastItem);
  });
});
