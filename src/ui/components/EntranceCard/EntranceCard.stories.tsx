import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { EntranceCard } from './EntranceCard';

const meta = {
  title: 'Components/EntranceCard',
  component: EntranceCard,
  args: { entered: 100, total: 238, action: { href: '#qr', label: 'QR 체크인 열기' } },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EntranceCard>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 디자인 시스템 `입장 현황` — 숫자 + 막대 + "QR 체크인 열기 →" */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const bar = c.getByRole('progressbar');
    await expect(bar).toHaveAttribute('aria-valuenow', '100');
    await expect(bar).toHaveAttribute('aria-valuemax', '238');
    await expect(c.getByRole('link', { name: 'QR 체크인 열기' })).toHaveAttribute('href', '#qr');
  },
};

/** 발급 0 — 0/0, 빈 막대(PC 판매 0 `745:32726`) */
export const NoneIssued: Story = {
  args: { entered: 0, total: 0 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('0/0')).toBeVisible();
  },
};

/** 모두 입장 */
export const Full: Story = { args: { entered: 54, total: 54 } };
