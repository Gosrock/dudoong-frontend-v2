import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Illustration } from '../../illustrations/Illustration';
import { StatCard } from './StatCard';

const meta = {
  title: 'Components/StatCard',
  component: StatCard,
  args: {
    href: '#guests',
    icon: <Illustration name="dashboard-pending" width={36} />,
    label: '승인 대기',
    count: 2,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 172 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StatCard>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 디자인 시스템 `승인 메뉴_desktop`(1024 이상) · `승인 메뉴_mobile`(그 아래) — 같은 DOM, CSS가 바꾼다 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link');
    await expect(link).toHaveAttribute('href', '#guests');
    await expect(link).toHaveTextContent('승인 대기2건');
  },
};

/** 대시보드 카드 4개(승인 대기 · 승인 완료 · 승인 거절 · 환불 요청) */
export const Four: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 'auto' }}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <ul
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 172px)',
        gap: 16,
        listStyle: 'none',
        margin: 0,
        padding: 0,
      }}
    >
      {(
        [
          ['dashboard-pending', '승인 대기', 2],
          ['dashboard-approved', '승인 완료', 12],
          ['dashboard-rejected', '승인 거절', 0],
          ['dashboard-refund', '환불 요청', 1],
        ] as const
      ).map(([icon, label, count]) => (
        <li key={label}>
          <StatCard
            href="#"
            icon={<Illustration name={icon} width={36} />}
            label={label}
            count={count}
          />
        </li>
      ))}
    </ul>
  ),
};
