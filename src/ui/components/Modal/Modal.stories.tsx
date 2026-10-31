import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

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
