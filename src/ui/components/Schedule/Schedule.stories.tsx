import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { ScheduleStep, WeekStrip } from './Schedule';

const meta = {
  title: 'Components/Schedule',
  component: WeekStrip,
  args: {
    month: '26년 10월',
    days: [
      { weekday: 'SUN', day: 2, state: 'past', label: '10월 2일 일요일' },
      { weekday: 'MON', day: 3, state: 'past', label: '10월 3일 월요일' },
      { weekday: 'TUE', day: 4, state: 'past', label: '10월 4일 화요일' },
      { weekday: 'WED', day: 5, state: 'today', label: '10월 5일 수요일' },
      { weekday: 'THU', day: 6, state: 'future', label: '10월 6일 목요일' },
      { weekday: 'FRI', day: 7, state: 'future', label: '10월 7일 금요일' },
      { weekday: 'SAT', day: 8, state: 'future', label: '10월 8일 토요일' },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ width: 340 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WeekStrip>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 디자인 시스템 `날짜` — 오늘(보라 원)이 든 주 */
export const Week: Story = {
  play: async ({ canvasElement }) => {
    const today = canvasElement.querySelector('[aria-current="date"]');
    await expect(today).toHaveTextContent('10월 5일 수요일');
  },
};

/** 디자인 시스템 `일정 패널` — 주간 줄 + `일정` 4개(지난 · 현재 · 미래 · 공연 완료) */
export const Panel: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <WeekStrip {...args} />
      <ol style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: 0, padding: 0 }}>
        <ScheduleStep state="past" title="공연 등록" dates={['1월 2일']} />
        <ScheduleStep
          state="current"
          title="공연 홍보 및 티켓 판매"
          dates={['1월 2일 (금) ~', '1월 15일 (목)']}
        />
        <ScheduleStep state="upcoming" title="공연 시작" dates={['1월 15일']} />
        <ScheduleStep state="upcoming" title="공연 완료" />
      </ol>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole('listitem').filter((li) => li.dataset.state)).toHaveLength(4);
    await expect(canvasElement.querySelector('[aria-current="step"]')).toHaveTextContent(
      '공연 홍보 및 티켓 판매',
    );
  },
};
