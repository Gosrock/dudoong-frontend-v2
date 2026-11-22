import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { SalesCard } from './SalesCard';

const meta = {
  title: 'Components/SalesCard',
  component: SalesCard,
  args: {
    items: [
      { id: 1, name: '얼리버드 티켓', count: 30, tone: 1 },
      { id: 2, name: '일반 티켓', count: 20, tone: 2 },
      { id: 3, name: '현장 티켓', count: 10, tone: 3 },
      { id: 4, name: 'VIP 티켓', count: 0, tone: 'other', faded: true },
    ],
    soldCount: 60,
    amount: 540000,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SalesCard>;
export default meta;

type Story = StoryObj<typeof meta>;

/** `레이아웃=가로`(GUI `1905:3535`) — 도넛 가운데 총 매수 + 범례(N장) + 총액. 판매 0은 맨 아래 흐리게(가이드 `1904:2952` 예시 A) */
export const Selling: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('list', { name: '티켓별 판매' }).children).toHaveLength(4);
    await expect(c.getByText('60')).toBeVisible();
    await expect(c.getByText('30장')).toBeVisible();
    await expect(c.getByText('540,000')).toBeVisible();
  },
};

/** `판매 전` — 판매 0장 */
export const BeforeSale: Story = {
  args: {
    items: [{ id: 1, name: '일반 예매', count: 0, tone: 'other', faded: true }],
    soldCount: 0,
    amount: 0,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('아직 판매된 티켓이 없어요!')).toBeVisible();
  },
};

/** 티켓 8종 — 상위 5개 + 「기타 (3종)」 회색(가이드 `1904:2952` 예시 B) */
export const ManyTickets: Story = {
  args: {
    items: [
      { id: 1, name: '얼리버드 티켓', count: 32, tone: 1 },
      { id: 2, name: '일반 티켓', count: 24, tone: 2 },
      { id: 3, name: '학생 할인 티켓', count: 18, tone: 3 },
      { id: 4, name: '2인 묶음 티켓', count: 12, tone: 4 },
      { id: 5, name: '현장 티켓', count: 8, tone: 5 },
      { id: 'other', name: '기타 (3종)', count: 3, tone: 'other' },
    ],
    soldCount: 97,
    amount: 1060000,
  },
};

/** `레이아웃=세로` — 좁은 카드(1133 2단, 폭 258) */
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 258 }}>
        <Story />
      </div>
    ),
  ],
};
