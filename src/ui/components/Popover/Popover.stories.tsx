import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { Icon } from '../../icons/Icon';
import { Txt } from '../../primitives/Txt';
import { Popover } from './Popover';

const meta = {
  title: 'Components/Popover',
  component: Popover,
  args: {
    label: '티켓 옵션이란?',
    trigger: (
      <button type="button" aria-label="티켓 옵션이란?" style={{ border: 0, background: 'none' }}>
        <Icon name="information" size={16} />
      </button>
    ),
    children: (
      <Txt typography="bodyMd">
        티켓을 살 때 관객에게 받을 질문이에요. 유료 옵션은 티켓 가격에 더해져요.
      </Txt>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 80 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Popover>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 탭(클릭)·Enter로 열고 Esc로 닫는다. 포커스는 트리거로 돌아온다 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: '티켓 옵션이란?' });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: '티켓 옵션이란?' });
    await waitFor(() => expect(dialog).toBeVisible());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await screen.findByRole('dialog', { name: '티켓 옵션이란?' });
    await userEvent.keyboard('{Escape}');
  },
};

export const Opened: Story = { args: { defaultOpen: true } };
