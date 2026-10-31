import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { Flex } from '../../primitives/Flex';
import { Button } from '../Button/Button';
import { toast, Toaster } from './Toast';

function Demo() {
  return (
    <Flex gap={2}>
      <Button onClick={() => toast('새로운 공연이 추가되었습니다!')}>토스트</Button>
      <Button
        variant="secondary"
        onClick={() => toast('잠시 후 다시 시도해 주세요', { id: 'dup' })}
      >
        같은 id 토스트
      </Button>
      <Toaster />
    </Flex>
  );
}

const meta = { title: 'Components/Toast', component: Demo } satisfies Meta<typeof Demo>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Figma Toast popup `303:2665` — 358×54, 가운데 정렬, 성공·에러 구분 없음. 같은 id는 하나만 뜬다 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '토스트' }));
    const first = await screen.findByText('새로운 공연이 추가되었습니다!');
    await waitFor(() => expect(first).toBeVisible());
    await userEvent.click(c.getByRole('button', { name: '같은 id 토스트' }));
    await userEvent.click(c.getByRole('button', { name: '같은 id 토스트' }));
    await screen.findByText('잠시 후 다시 시도해 주세요');
    await expect(screen.getAllByText('잠시 후 다시 시도해 주세요')).toHaveLength(1);
  },
};
