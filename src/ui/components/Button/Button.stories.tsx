import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './Button';

const meta = { component: Button, args: { children: '티켓 구매하기' } } satisfies Meta<
  typeof Button
>;
export default meta;

type Story = StoryObj<typeof meta>;
export const Medium: Story = {};
export const Small: Story = { args: { size: 'sm' } };
export const Disabled: Story = { args: { disabled: true } };
