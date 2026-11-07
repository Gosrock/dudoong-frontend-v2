import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Icon } from '../../icons/Icon';
import { pseudoStyle } from '../../stories/storyStyles';
import { vars } from '../../theme/tokens.css';
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

/** Figma `650:1264` — 배경 `interaction/disabled-bg` */
export const Disabled: Story = { args: { disabled: true } };

/** Hover #232220(`650:1260`)·Pressed #0A0A09(`650:1262`). 마우스로 확인하고, play는 규칙 값을 맞춘다 */
export const StateColors: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: '새 공연 만들기' });
    await expect(pseudoStyle(button, ':hover', 'background')).toBe(vars.color.surface.inverseHover);
    await expect(pseudoStyle(button, ':active', 'background')).toBe(
      vars.color.surface.inversePressed,
    );
  },
};

/** 보라 Primary — 티켓 목록 FAB(gui `793:2469`가 round Primary 채움을 `brand/Primary`로 덮어씀, R1b) */
export const Brand: Story = {
  args: { tone: 'brand' },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: '새 공연 만들기' });
    await expect(getComputedStyle(button).backgroundColor).toBe('rgb(99, 62, 231)');
    await expect(pseudoStyle(button, ':hover', 'background')).toBe(vars.color.brand.primaryHover);
  },
};
