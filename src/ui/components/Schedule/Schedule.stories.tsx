import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { SchedulePanel } from './Schedule';

const meta = {
  title: 'Components/SchedulePanel',
  component: SchedulePanel,
  args: {
    today: '1월 8일',
    steps: [
      { key: 'registered', title: '공연 등록', date: '1월 2일', state: 'past' },
      {
        key: 'promotion',
        title: '공연 홍보 · 티켓 판매',
        date: '1월 2일 ~ 1월 15일',
        state: 'current',
      },
      { key: 'start', title: '공연 당일', date: '1월 15일 18:00', state: 'upcoming' },
      { key: 'done', title: '공연 완료', date: '1월 15일 21:00', state: 'upcoming' },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ width: 388 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SchedulePanel>;
export default meta;

type Story = StoryObj<typeof meta>;

/** `현재 단계=홍보·판매`(GUI `1868:2240`) */
export const Promotion: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('오늘 · 1월 8일')).toBeVisible();
    await expect(c.getByText('진행 중')).toBeVisible();
    await expect(c.getAllByRole('listitem')).toHaveLength(4);
  },
};

/** `현재 단계=공연 당일` */
export const Today: Story = {
  args: {
    steps: [
      { key: 'registered', title: '공연 등록', date: '1월 2일', state: 'past' },
      {
        key: 'promotion',
        title: '공연 홍보 · 티켓 판매',
        date: '1월 2일 ~ 1월 15일',
        state: 'past',
      },
      { key: 'start', title: '공연 당일', date: '1월 15일 18:00', state: 'current' },
      { key: 'done', title: '공연 완료', date: '1월 15일 21:00', state: 'upcoming' },
    ],
  },
};

/** `현재 단계=공연 취소` — 취소 단계는 배지 없는 회색 상자 */
export const Canceled: Story = {
  args: {
    today: '1월 10일',
    steps: [
      { key: 'registered', title: '공연 등록', date: '1월 2일', state: 'past' },
      {
        key: 'promotion',
        title: '공연 홍보 · 티켓 판매',
        date: '1월 2일 ~ 1월 10일',
        state: 'past',
      },
      { key: 'canceled', title: '공연 취소', date: '1월 10일 14:30', state: 'canceled' },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText('진행 중')).toBeNull();
  },
};
