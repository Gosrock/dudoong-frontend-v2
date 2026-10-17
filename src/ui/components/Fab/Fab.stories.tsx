import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Icon } from '../../icons/Icon';
import { Fab } from './Fab';

const meta = {
  title: 'Components/Fab',
  component: Fab,
  args: { icon: <Icon name="add" />, 'aria-label': '새 공연 만들기', onClick: fn() },
} satisfies Meta<typeof Fab>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Figma Button `Color=Primary, type=round` */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: '새 공연 만들기' });
    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/** Figma에 없는 상태 */
export const Disabled: Story = { args: { disabled: true } };
