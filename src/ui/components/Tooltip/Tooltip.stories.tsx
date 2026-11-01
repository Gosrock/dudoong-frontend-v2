import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '../Button/Button';
import { Tooltip, TooltipBubble } from './Tooltip';

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  args: {
    content: '두둥에서 공연을 시작해보세요!',
    side: 'right',
    children: <Button variant="secondary">공연 준비</Button>,
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 40 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 키보드 포커스로 열리고 Esc로 닫힌다. 말풍선은 트리거의 설명이 된다 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: '공연 준비' });
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await expect(await screen.findByRole('tooltip')).toHaveTextContent(
      '두둥에서 공연을 시작해보세요!',
    );
    await expect(trigger).toHaveAccessibleDescription('두둥에서 공연을 시작해보세요!');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  },
};

/** GUI `331:11622` — 햄버거의 늘 보이는 안내 말풍선(open 고정) */
export const AlwaysOpen: Story = { args: { open: true } };

/** 흐름 안 말풍선(`TooltipBubble`) — 로그인 캐릭터 위. 포털 없이 그림과 같이 스크롤된다(이슈 #95) */
export const InlineBubble: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <TooltipBubble>두둥에 로그인하고 즐거운 공연 라이프를 즐겨보세요!</TooltipBubble>
      <div style={{ width: 120, height: 120, background: '#eee' }} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const bubble = within(canvasElement).getByText(
      '두둥에 로그인하고 즐거운 공연 라이프를 즐겨보세요!',
    );
    await expect(getComputedStyle(bubble).position).toBe('relative');
  },
};
