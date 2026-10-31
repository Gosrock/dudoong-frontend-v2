import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Icon } from '../../icons/Icon';
import { Flex } from '../../primitives/Flex';
import { Txt } from '../../primitives/Txt';
import { playOverlayBasics } from '../../stories/overlayPlay';
import { Button } from '../Button/Button';
import { Drawer, type DrawerProps } from './Drawer';

type DemoProps = Omit<DrawerProps, 'open' | 'onOpenChange'> & { defaultOpen?: boolean };

function Demo({ defaultOpen = false, ...props }: DemoProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <Button onClick={() => setOpen(true)}>열기</Button>
      <Drawer {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}

const meta = {
  title: 'Components/Drawer',
  component: Demo,
  args: {
    title: '메뉴',
    headerTrailing: (
      <button type="button" aria-label="알림" style={{ all: 'unset', display: 'inline-flex' }}>
        <Icon name="notification" />
      </button>
    ),
    children: (
      <Flex direction="column" gap={5} fullWidth>
        {['주문내역', '관심 호스트', '지난 공연 아카이빙'].map((label) => (
          <Txt key={label} typography="headingMd2">
            {label}
          </Txt>
        ))}
      </Flex>
    ),
  },
} satisfies Meta<typeof Demo>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 와이어 `128:2875` 구조 — 머리 줄 ✕ · 오른쪽 슬롯(벨), 전체 화면 */
export const Default: Story = {
  play: ({ canvasElement }) => playOverlayBasics({ canvasElement, trigger: '열기', name: '메뉴' }),
};

export const Opened: Story = { args: { defaultOpen: true } };

/** 내용이 길면 본문만 스크롤된다(머리 줄은 남는다). iOS 스크롤 잠금은 실기기에서 확인 */
export const LongContent: Story = {
  args: {
    defaultOpen: true,
    children: (
      <Flex direction="column" gap={4} fullWidth>
        {Array.from({ length: 40 }, (_, i) => (
          <Txt key={i} typography="bodyMd">
            항목 {i + 1}
          </Txt>
        ))}
      </Flex>
    ),
  },
};
