import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Flex } from '../../primitives/Flex';
import { Txt } from '../../primitives/Txt';
import { LinkProgressIndicator } from './LinkProgress';

/**
 * 스토리에는 Next 라우터가 없어 `useLinkStatus`를 쓰는 LinkProgress 대신 표시 부분만 보인다.
 * 실제 지연 페이드는 앱에서 `prefetch={false}` 링크로 확인한다.
 */
const meta = {
  title: 'Components/LinkProgress',
  component: LinkProgressIndicator,
  args: { pending: false },
  render: (args) => (
    <Flex gap={2} align="center" style={{ width: 200 }}>
      <Txt typography="headingSmEmphasized">제 29회 정기공연</Txt>
      <LinkProgressIndicator {...args} />
    </Flex>
  ),
} satisfies Meta<typeof LinkProgressIndicator>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 대기 아님 — 자리만 차지(투명) */
export const Idle: Story = {
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('[aria-hidden][class]:not(svg)') as HTMLElement;
    await expect(el.getBoundingClientRect().width).toBe(16);
  },
};

/** 대기 중 — 100ms 뒤 페이드인. 크기는 Idle과 같다(레이아웃 밀림 없음) */
export const Pending: Story = {
  args: { pending: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('제 29회 정기공연')).toBeVisible();
  },
};
