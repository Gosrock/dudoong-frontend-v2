import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { Flex } from '../../primitives/Flex';
import { Txt } from '../../primitives/Txt';
import { playOverlayBasics } from '../../stories/overlayPlay';
import { colors } from '../../theme/colors';
import { Button } from '../Button/Button';
import { Modal, type ModalProps } from './Modal';

type DemoProps = Omit<ModalProps, 'open' | 'onOpenChange'> & { defaultOpen?: boolean };

function Demo({ defaultOpen = false, ...props }: DemoProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <Button onClick={() => setOpen(true)}>열기</Button>
      <Modal {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}

const summary = (
  <Flex direction="column" gap={2} fullWidth>
    {[
      ['입금자명', '두둥관람'],
      ['결제방식', '계좌이체'],
      ['예금주', '두둥호스트'],
    ].map(([k, v]) => (
      <Flex key={k} justify="space-between" fullWidth>
        <Txt typography="bodyMd" color={colors.textSecondary}>
          {k}
        </Txt>
        <Txt typography="bodyMd">{v}</Txt>
      </Flex>
    ))}
  </Flex>
);

const meta = {
  title: 'Components/Modal',
  component: Demo,
  args: {
    title: '주문 완료하기',
    description: '입금 하셨나요?\n확인을 누르면 즉시 호스트에게 주문이 전달됩니다.',
    children: summary,
    footer: (
      <Button size="lg" fullWidth>
        결제완료
      </Button>
    ),
  },
} satisfies Meta<typeof Demo>;
export default meta;

type Story = StoryObj<typeof meta>;

/** GUI `567:9468` — 제목 + ✕, 설명, 본문, 하단 버튼 */
export const Default: Story = {
  play: ({ canvasElement }) =>
    playOverlayBasics({ canvasElement, trigger: '열기', name: '주문 완료하기' }),
};

/** 열린 상태(디자이너 비교용) */
export const Opened: Story = { args: { defaultOpen: true } };

/** 화면 제목 없이 접근성 이름만(VisuallyHidden) */
export const HiddenTitle: Story = {
  args: { hideTitle: true, title: '공연 포스터', description: undefined, footer: undefined },
  play: ({ canvasElement }) =>
    playOverlayBasics({ canvasElement, trigger: '열기', name: '공연 포스터' }),
};

/**
 * 큰 판 `size="lg"` — GUI 호스팅 PC 티켓 옵션 모달(`956:3157` 등): 520폭 · 안쪽 24 · 묶음 사이 24 · 흰 판(I-h1).
 * 제목 → 설명은 8 그대로
 */
export const Large: Story = {
  args: {
    size: 'lg',
    title: '티켓 옵션 추가하기',
    description: '추가할 옵션을 선택해 주세요.',
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '열기' }));
    const dialog = await screen.findByRole('dialog', { name: '티켓 옵션 추가하기' });
    await waitFor(() => expect(dialog).toBeVisible());
    const css = getComputedStyle(dialog);
    await expect(css.paddingTop).toBe('24px');
    await expect(css.maxWidth).toBe('520px');
    await expect(css.backgroundColor).toBe('rgb(255, 255, 255)');
    await userEvent.keyboard('{Escape}');
  },
};
