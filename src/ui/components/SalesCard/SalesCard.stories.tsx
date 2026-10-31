import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { SalesCard } from './SalesCard';

const meta = {
  title: 'Components/SalesCard',
  component: SalesCard,
  args: {
    items: [
      { id: 1, name: '무적티켓어쩌고', count: 30 },
      { id: 2, name: '티켓이름길면말줄임표하세요', count: 20 },
      { id: 3, name: '색상은 고정하려고', count: 4 },
    ],
    soldCount: 54,
    amount: 170000,
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

/** `판매 후` — 도넛 + 범례(1줄 말줄임) + 판매 장수 · 총액 */
export const Selling: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('list', { name: '티켓별 판매' }).children).toHaveLength(3);
    await expect(c.getByText('54')).toBeVisible();
    await expect(c.getByText('170,000')).toBeVisible();
  },
};

/** `판매 전` — 판매 0장 */
export const BeforeSale: Story = {
  args: { items: [{ id: 1, name: '일반 예매', count: 0 }], soldCount: 0, amount: 0 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('아직 판매된 티켓이 없어요!')).toBeVisible();
  },
};

/** 티켓 6종 — 4번째부터는 Figma에 없는 색(팔레트로 이음, Figma 코멘트) · 판매 0장은 범례에만 */
export const ManyTickets: Story = {
  args: {
    items: [
      { id: 1, name: '일반 예매', count: 40 },
      { id: 2, name: '학생 할인', count: 25 },
      { id: 3, name: '초대권', count: 10 },
      { id: 4, name: '얼리버드', count: 8 },
      { id: 5, name: 'VIP', count: 3 },
      { id: 6, name: '현장 판매', count: 0 },
    ],
    soldCount: 86,
    amount: 1290000,
  },
};

/** 1133 폭(가운데 579)의 좁은 카드 — 범례 이름이 말줄임 */
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 230 }}>
        <Story />
      </div>
    ),
  ],
};
