import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Icon } from '../../icons/Icon';
import { Flex } from '../../primitives/Flex';
import { Button } from '../Button/Button';
import { EmptyState, EmptyStateAction } from './EmptyState';

/** 일러스트 자리(실제 파일은 src/ui/illustrations) */
const Placeholder = () => (
  <div aria-hidden style={{ width: 170, height: 170, borderRadius: 8, background: '#eeeeed' }} />
);

const meta = {
  title: 'Components/EmptyState',
  component: EmptyState,
  decorators: [
    (Story) => (
      <div style={{ width: 390 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EmptyState>;
export default meta;

type Story = StoryObj<typeof meta>;

/** GUI `37:758` — 문구 + 검정 버튼 */
export const HostEmpty: Story = {
  args: {
    description: '두둥! 등록한 호스트가 없어요.',
    action: (
      <EmptyStateAction onClick={fn()} icon={<Icon name="add" />}>
        새 호스트 만들기
      </EmptyStateAction>
    ),
  },
};

/** GUI `579:2210` — 일러스트 + 문구 + 버튼 */
export const TicketEmpty: Story = {
  args: {
    illustration: <Placeholder />,
    description: '만든 티켓이 없어요',
    action: (
      <EmptyStateAction href="/hosting" icon={<Icon name="add" />}>
        새 티켓 만들기
      </EmptyStateAction>
    ),
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('link', { name: '새 티켓 만들기' }),
    ).toHaveAttribute('href', '/hosting');
  },
};

/** GUI `567:9821` — 일러스트 + 굵은 제목 + 설명 + 버튼 2개 */
export const OrderComplete: Story = {
  args: {
    illustration: <Placeholder />,
    title: '주문 완료 !',
    description: '티켓 승인여부는 티켓 페이지와\n주문내역에서 확인 가능합니다.',
    action: (
      <Flex gap={2}>
        <Button variant="secondary">주문내역</Button>
        <Button>티켓 페이지</Button>
      </Flex>
    ),
  },
};

export const ButtonClick: Story = {
  args: { description: '버튼 동작', action: undefined },
  render: (args) => {
    const onClick = fn();
    return (
      <EmptyState
        {...args}
        action={<EmptyStateAction onClick={onClick}>눌러 보기</EmptyStateAction>}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: '눌러 보기' });
    await userEvent.click(button);
    await expect(button).toBeVisible();
  },
};
