import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Txt } from '../../primitives/Txt';
import { playOverlayBasics } from '../../stories/overlayPlay';
import { Button } from '../Button/Button';
import { ResponsiveOverlay, type ResponsiveOverlayProps } from './ResponsiveOverlay';

type DemoProps = Omit<ResponsiveOverlayProps, 'open' | 'onOpenChange'>;

function Demo(props: DemoProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>열기</Button>
      <ResponsiveOverlay {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}

const meta = {
  title: 'Components/ResponsiveOverlay',
  component: Demo,
  args: {
    title: '거절 사유',
    description: '사유를 고르면 주문자에게 알림이 가요.',
    children: <Txt typography="bodyMd">PC(≥1024)는 모달, 모바일은 바텀시트로 열린다.</Txt>,
    footer: (
      <Button size="lg" fullWidth>
        거절하기
      </Button>
    ),
  },
} satisfies Meta<typeof Demo>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 뷰포트 폭에 따라 Modal 또는 BottomSheet. 어느 쪽이든 dialog 이름·Esc·포커스 복귀·뒤로가기가 같다 */
export const Default: Story = {
  play: ({ canvasElement }) =>
    playOverlayBasics({ canvasElement, trigger: '열기', name: '거절 사유' }),
};
