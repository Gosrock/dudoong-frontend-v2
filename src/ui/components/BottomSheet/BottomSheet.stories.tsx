import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Flex } from '../../primitives/Flex';
import { Txt } from '../../primitives/Txt';
import { playOverlayBasics } from '../../stories/overlayPlay';
import { colors } from '../../theme/colors';
import { Button } from '../Button/Button';
import { BottomSheet, type BottomSheetProps } from './BottomSheet';

type DemoProps = Omit<BottomSheetProps, 'open' | 'onOpenChange'> & { defaultOpen?: boolean };

function Demo({ defaultOpen = false, ...props }: DemoProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <Button onClick={() => setOpen(true)}>열기</Button>
      <BottomSheet {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}

const ticket = (
  <Flex direction="column" gap={1} fullWidth>
    <Flex justify="space-between" fullWidth>
      <Txt typography="headingSmEmphasized">얼리버드</Txt>
      <Txt typography="headingSmEmphasized">6,000 ₩</Txt>
    </Flex>
    <Txt typography="labelSm">얼리버드 전용 할인 티켓</Txt>
    <Txt typography="labelXs" color={colors.textSecondary}>
      인당 3매 제한 / 호스트 승인 후 확정
    </Txt>
  </Flex>
);

const meta = {
  title: 'Components/BottomSheet',
  component: Demo,
  args: {
    title: '티켓 선택',
    hideTitle: true,
    children: (
      <Flex direction="column" gap={5} fullWidth>
        {ticket}
        {ticket}
      </Flex>
    ),
  },
} satisfies Meta<typeof Demo>;
export default meta;

type Story = StoryObj<typeof meta>;

/** GUI `331:5853` — 화면 제목 없음(접근성 이름만), 손잡이(chevron-down), 내용 높이 */
export const Default: Story = {
  play: ({ canvasElement }) =>
    playOverlayBasics({ canvasElement, trigger: '열기', name: '티켓 선택' }),
};

export const Opened: Story = { args: { defaultOpen: true } };

/** 제목·설명 + 하단 고정 버튼 영역 */
export const WithTitleAndFooter: Story = {
  args: {
    hideTitle: false,
    title: '선물하기',
    description: '티켓을 선물하시겠습니까?\n받는 사람이 수락할 때까지 선물 대기 상태가 됩니다.',
    footer: (
      <Button size="lg" fullWidth>
        선물하기
      </Button>
    ),
  },
  play: ({ canvasElement }) =>
    playOverlayBasics({ canvasElement, trigger: '열기', name: '선물하기' }),
};

/** 내용이 길면 본문만 스크롤되고 버튼 영역은 남는다 */
export const LongContent: Story = {
  args: {
    defaultOpen: true,
    hideTitle: false,
    title: '유의사항',
    children: (
      <Flex direction="column" gap={3} fullWidth>
        {Array.from({ length: 30 }, (_, i) => (
          <Txt key={i} typography="bodyMd">
            {i + 1}. 공연 시작 후에는 주문을 취소할 수 없어요.
          </Txt>
        ))}
      </Flex>
    ),
    footer: <Button size="lg">확인</Button>,
  },
};

/** 입력칸 — iOS 키보드 회피(repositionInputs)는 실기기에서 확인 */
export const WithInput: Story = {
  args: {
    defaultOpen: true,
    hideTitle: false,
    title: '거절 사유',
    children: <input aria-label="사유" placeholder="사유를 입력해 주세요" style={{ height: 44 }} />,
    footer: <Button size="lg">보내기</Button>,
  },
};
