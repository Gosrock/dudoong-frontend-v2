import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { QrCode } from './QrCode';

const meta = {
  title: 'Components/QrCode',
  component: QrCode,
  args: { value: 'https://dudoong.com/check-in?token=mock-checkin-101', label: '셀프 체크인 QR' },
  decorators: [
    (Story) => (
      <div style={{ width: 240, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof QrCode>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 값 그대로 인코딩한 QR(svg). 스크린 리더 이름은 `label` */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const img = within(canvasElement).getByRole('img', { name: '셀프 체크인 QR' });
    await waitFor(() => expect(img.querySelector('svg')).not.toBeNull());
  },
};

/** 티켓 QR(값 = 티켓 uuid, P8) — 그림은 하나만 그린다 */
export const TicketValue: Story = {
  args: { value: 'mock-ticket-a1', label: '티켓 QR' },
  play: async ({ canvasElement }) => {
    const img = within(canvasElement).getByRole('img', { name: '티켓 QR' });
    await waitFor(() => expect(img.querySelectorAll('svg')).toHaveLength(1));
  },
};
