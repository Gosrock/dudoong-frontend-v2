import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';

import { playOverlayBasics } from '../../stories/overlayPlay';
import { Button } from '../Button/Button';
import { Popup, type PopupProps } from './Popup';

type DemoProps = Omit<PopupProps, 'open' | 'onOpenChange'> & { defaultOpen?: boolean };

function Demo({ defaultOpen = false, onConfirm, ...props }: DemoProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <Button onClick={() => setOpen(true)}>열기</Button>
      <Popup
        {...props}
        open={open}
        onOpenChange={setOpen}
        onConfirm={() => {
          onConfirm?.();
          setOpen(false);
        }}
      />
    </>
  );
}

const meta = {
  title: 'Components/Popup',
  component: Demo,
  args: {
    title: '주문 완료하기',
    description: '입금 하셨나요?\n확인을 누르면 즉시 호스트에게 주문이 전달됩니다.',
    onConfirm: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof Demo>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 확인 팝업 — [취소][확인]. alertdialog, 첫 포커스는 [취소] */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await playOverlayBasics({
      canvasElement,
      trigger: '열기',
      name: '주문 완료하기',
      role: 'alertdialog',
    });
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '열기' }));
    const dialog = await screen.findByRole('alertdialog', { name: '주문 완료하기' });
    await expect(dialog).toHaveAccessibleDescription(/입금 하셨나요/);
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '취소' })).toHaveFocus());
    await userEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    await expect(args.onConfirm).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  },
};

export const Opened: Story = { args: { defaultOpen: true } };

/** 버튼 하나 */
export const ConfirmOnly: Story = { args: { defaultOpen: true, cancelLabel: null } };

/** 진행 중 — 버튼 잠금 + 스피너 20(디자인 시스템 `다이얼로그 - 로딩` `772:1180`) */
export const Loading: Story = {
  args: { defaultOpen: true, loading: true },
  play: async () => {
    const dialog = await screen.findByRole('alertdialog');
    const spinner = within(dialog).getByRole('button', { name: '확인' }).querySelector('svg');
    // 열림 애니메이션(scale) 중이라 화면 크기가 아니라 계산된 폭으로 본다
    await expect(spinner && getComputedStyle(spinner).width).toBe('20px');
    await expect(within(dialog).getByRole('button', { name: '확인' })).toBeDisabled();
    await expect(within(dialog).getByRole('button', { name: '취소' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  },
};
