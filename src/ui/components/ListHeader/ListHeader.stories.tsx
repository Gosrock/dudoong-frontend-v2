import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Txt } from '../../primitives/Txt';
import { colors } from '../../theme/colors';
import { ListHeader } from './ListHeader';

const meta = {
  title: 'Components/ListHeader',
  component: ListHeader,
  args: { title: '다가오는 공연' },
  decorators: [
    (Story) => (
      <div style={{ width: 390 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ListHeader>;
export default meta;

type Story = StoryObj<typeof meta>;

export const TitleOnly: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('heading', { level: 2, name: '다가오는 공연' }),
    ).toBeInTheDocument();
  },
};

export const WithAction: Story = {
  args: {
    action: (
      <a href="#more">
        <Txt typography="labelSm" color={colors.textSecondary}>
          더보기
        </Txt>
      </a>
    ),
  },
};

export const WithDescription: Story = {
  args: { title: '티켓 목록', description: '관객들을 위한 티켓을 만들어 주세요.', paddingX: 5 },
};
