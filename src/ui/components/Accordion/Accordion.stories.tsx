import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Chip, formatOptionAmount } from '../Chip/Chip';
import { InfoRow } from '../InfoRow/InfoRow';
import { Accordion } from './Accordion';

const meta = {
  title: 'Components/Accordion',
  component: Accordion,
  args: {
    label: 'label text',
    meta: '(2/3)',
    children: (
      <>
        <InfoRow label="A석" value="2매" />
        <InfoRow label="B석" value="1매" />
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 390 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Accordion>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `second-closed, value type=text` */
export const Closed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /label text/ });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));
    await expect(canvas.getByText('A석')).toBeVisible();

    await userEvent.keyboard(' ');
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
    await expect(canvas.queryByText('A석')).not.toBeInTheDocument();
  },
};

/** Figma `second-open, value type=text` */
export const Open: Story = { args: { defaultOpen: true } };

/** Figma `second-closed·open, value type=text+money` */
export const WithMoney: Story = {
  args: {
    trailing: (
      <Chip color="violet" theme="fill">
        {formatOptionAmount(1000)}
      </Chip>
    ),
    defaultOpen: true,
  },
};

/** Figma에 없는 상태 */
export const Disabled: Story = { args: { disabled: true } };
