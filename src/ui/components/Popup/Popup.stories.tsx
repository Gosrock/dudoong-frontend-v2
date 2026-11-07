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

/** 확인만 막기(`confirmDisabled`) — 필수 체크 전(체크아웃 두둥 입금 전 확인, 2026-11-01). 취소는 그대로 */
export const ConfirmDisabled: Story = {
  args: { confirmDisabled: true },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '열기' }));
    const dialog = await screen.findByRole('alertdialog', { name: '주문 완료하기' });
    await expect(within(dialog).getByRole('button', { name: '확인' })).toBeDisabled();
    await expect(within(dialog).getByRole('button', { name: '취소' })).toBeEnabled();
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    await expect(args.onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  },
};

/** 데스크탑 폭 520(`size="lg"` — GUI 티켓 삭제 확인 `975:8593`, R1f). 모바일은 310 */
export const SizeLarge: Story = {
  args: {
    defaultOpen: true,
    size: 'lg',
    title: '[얼리버드] 티켓을 삭제할까요?',
    description: '삭제한 티켓은 복구할 수 없어요.',
  },
};

/**
 * 입금 확인 창 `variant="summary"`(GUI `567:9756`, R1e): 342 · 회색 판 · 안쪽 16 · ✕ · 버튼 하나(Large).
 * 본문에는 화면이 흰 카드를 넣는다
 */
export const Summary: Story = {
  args: {
    variant: 'summary',
    confirmLabel: '주문 완료하기',
    children: (
      <div
        style={{
          height: 120,
          borderRadius: 12,
          background: '#ffffff',
          border: '1px solid #dddcda',
        }}
      />
    ),
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '열기' }));
    const dialog = await screen.findByRole('alertdialog', { name: '주문 완료하기' });
    await waitFor(() => expect(dialog).toBeVisible());
    await expect(within(dialog).queryByRole('button', { name: '취소' })).toBeNull();
    const css = getComputedStyle(dialog);
    await expect(css.paddingTop).toBe('16px');
    await expect(css.maxWidth).toBe('342px');
    await userEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  },
};
