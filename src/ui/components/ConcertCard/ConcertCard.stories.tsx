import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { Chip } from '../Chip/Chip';
import { ConcertCard } from './ConcertCard';

/** 스토리용 포스터(세로 163:231 단색 SVG) — 서버 이미지 자리 */
const POSTER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="326" height="462"><rect width="100%" height="100%" fill="#2d2a6e"/><text x="50%" y="50%" fill="#fff" font-size="40" text-anchor="middle">POSTER</text></svg>',
  );

/**
 * 디자인 시스템 ConcertCard(GUI 공연홈·공연 리스트 `759:22415`) — 포스터 + 날짜 + 제목(2줄 말줄임). 카드 전체가 링크다.
 * 폭은 놓이는 칸이 정한다 — 스토리는 모바일 카드 폭 163.
 */
const meta = {
  title: 'Components/ConcertCard',
  component: ConcertCard,
  args: {
    href: '/events/101',
    title: '두둥 페스티벌 공연',
    date: '2026.01.01 수요일 (18:00)',
    posterUrl: POSTER,
  },
  render: (args) => (
    <div style={{ width: 163 }}>
      <ConcertCard {...args} />
    </div>
  ),
} satisfies Meta<typeof ConcertCard>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Figma 기본 — 포스터 163×231 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const link = c.getByRole('link', { name: /두둥 페스티벌 공연/ });
    await expect(link).toHaveAttribute('href', '/events/101');
    const img = canvasElement.querySelector('img') as HTMLImageElement;
    const box = img.parentElement!.getBoundingClientRect();
    await expect(Math.round(box.width)).toBe(163);
    await expect(Math.round(box.height)).toBe(231);
  },
};

/** Figma에 없는 상태 — 포스터가 없으면 빈 상자(design-requests Q26) */
export const NoPoster: Story = {
  args: { posterUrl: null },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('img')).toBeNull();
  },
};

/** Figma에 없는 상태 — 포스터를 못 읽으면 빈 상자로 바뀐다 */
export const BrokenPoster: Story = {
  args: { posterUrl: 'data:image/png;base64,broken' },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('img')).toBeNull());
  },
};

/** 제목은 2줄에서 말줄임, 날짜는 그대로 */
export const LongTitle: Story = {
  args: { title: '직장인 밴드 합동공연 Vol.3 — 연말 특별 무대와 게스트 스테이지 그리고 앙코르' },
  play: async ({ canvasElement }) => {
    const title = within(canvasElement).getByText(/직장인 밴드/);
    const lineHeight = parseFloat(getComputedStyle(title).lineHeight);
    await expect(title.getBoundingClientRect().height).toBeLessThanOrEqual(lineHeight * 2 + 1);
  },
};

/** 포스터 왼쪽 위 상태 표시(`badge`) — 호스트 홈 공연 카드 "준비중"·"D-15"(와이어 `503:30867`, P5c-V) */
export const WithBadge: Story = {
  args: {
    badge: (
      <Chip color="green" theme="weak">
        준비중
      </Chip>
    ),
  },
  play: async ({ canvasElement }) => {
    const badge = within(canvasElement).getByText('준비중');
    const poster = canvasElement.querySelector('img')!.parentElement!.getBoundingClientRect();
    const box = badge.getBoundingClientRect();
    await expect(box.left).toBeGreaterThan(poster.left);
    await expect(box.top).toBeGreaterThan(poster.top);
    await expect(box.bottom).toBeLessThan(poster.bottom);
  },
};
