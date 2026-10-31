import type { Meta, StoryObj } from '@storybook/react-vite';
import { OverlayProvider } from 'overlay-kit';
import { useState } from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { Flex } from '../../primitives/Flex';
import { Txt } from '../../primitives/Txt';
import { Button } from '../Button/Button';
import { openConfirm } from './EasyOverlay';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const readMark = () => (window.history.state as { ddOverlay?: string } | null)?.ddOverlay;

function Demo({ variant }: { variant?: 'popup' | 'responsive' }) {
  const [result, setResult] = useState('없음');
  const open = (fail: boolean) => async () => {
    const ok = await openConfirm({
      variant,
      title: '주문을 승인할까요?',
      description: '승인하면 티켓이 발급되고 주문자에게 알림이 가요.',
      confirmLabel: '승인',
      onConfirm: async () => {
        await wait(400);
        if (fail) throw new Error('재고 부족');
      },
    });
    setResult(String(ok));
  };
  return (
    <Flex direction="column" gap={3}>
      <Flex gap={2}>
        <Button onClick={open(false)}>성공하는 확인</Button>
        <Button variant="secondary" onClick={open(true)}>
          실패하는 확인
        </Button>
      </Flex>
      <Txt typography="bodyMd">결과: {result}</Txt>
    </Flex>
  );
}

const meta = {
  title: 'Components/EasyOverlay',
  component: Demo,
  decorators: [
    (Story) => (
      <OverlayProvider>
        <Story />
      </OverlayProvider>
    ),
  ],
} satisfies Meta<typeof Demo>;
export default meta;

type Story = StoryObj<typeof meta>;

const NAME = '주문을 승인할까요?';

/** 성공: 진행 중 버튼 잠금 → 닫힘 → true. 취소·Esc·뒤로가기 → false */
export const Success: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const base = readMark();
    await userEvent.click(c.getByRole('button', { name: '성공하는 확인' }));
    let dialog = await screen.findByRole('alertdialog', { name: NAME });
    await userEvent.click(within(dialog).getByRole('button', { name: '승인' }));
    await expect(within(dialog).getByRole('button', { name: '승인' })).toBeDisabled();
    await expect(within(dialog).getByRole('button', { name: '취소' })).toBeDisabled();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    await expect(c.getByText('결과: true')).toBeVisible();
    // 성공 처리는 history 항목을 먼저 소비하고 닫는다
    await expect(readMark()).toBe(base);

    // 취소 → false, 포커스 복귀
    await userEvent.click(c.getByRole('button', { name: '성공하는 확인' }));
    dialog = await screen.findByRole('alertdialog', { name: NAME });
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    await waitFor(() => expect(c.getByText('결과: false')).toBeVisible());
    await waitFor(() => expect(c.getByRole('button', { name: '성공하는 확인' })).toHaveFocus());
  },
};

/** 실패: onConfirm reject → 열린 채 남고 버튼이 다시 풀린다 */
export const Failure: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '실패하는 확인' }));
    const dialog = await screen.findByRole('alertdialog', { name: NAME });
    const confirm = within(dialog).getByRole('button', { name: '승인' });
    await userEvent.click(confirm);
    await expect(confirm).toBeDisabled();
    await waitFor(() => expect(confirm).toBeEnabled());
    await expect(screen.getByRole('alertdialog', { name: NAME })).toBeVisible();
    await expect(c.getByText('결과: 없음')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(c.getByText('결과: false')).toBeVisible());
  },
};

/** 진행 중 뒤로가기는 닫지 않는다(항목을 다시 넣는다). 끝나면 닫히고, 그 뒤 뒤로가기는 일반 규칙 */
export const BackWhilePending: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '성공하는 확인' }));
    const dialog = await screen.findByRole('alertdialog', { name: NAME });
    await userEvent.click(within(dialog).getByRole('button', { name: '승인' }));
    window.history.back();
    await wait(100);
    await expect(screen.getByRole('alertdialog', { name: NAME })).toBeVisible();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    await expect(c.getByText('결과: true')).toBeVisible();

    // 진행 전 뒤로가기 → 닫힘(false)
    const base = readMark();
    await userEvent.click(c.getByRole('button', { name: '실패하는 확인' }));
    await screen.findByRole('alertdialog', { name: NAME });
    await waitFor(() => expect(readMark()).not.toBe(base));
    window.history.back();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    await expect(c.getByText('결과: false')).toBeVisible();
  },
};

/** PC 모달 · 모바일 바텀시트(ResponsiveOverlay) */
export const Responsive: Story = {
  args: { variant: 'responsive' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '성공하는 확인' }));
    const dialog = await screen.findByRole('dialog', { name: NAME });
    await userEvent.click(within(dialog).getByRole('button', { name: '승인' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await expect(c.getByText('결과: true')).toBeVisible();
  },
};
