import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { expect } from 'storybook/test';

import { Flex } from '../../primitives/Flex';
import { Txt } from '../../primitives/Txt';
import { withDarkTheme } from '../../stories/storyStyles';
import { colors } from '../../theme/colors';
import { sprinkles } from '../../theme/sprinkles.css';
import { Chip, type ChipProps, formatDday } from './Chip';

const meta = {
  title: 'Components/Chip',
  component: Chip,
  args: { variant: 'status', tone: 'brand', children: '승인완료' },
} satisfies Meta<typeof Chip>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Concert state chip small(Figma `300:1067`, 2026-10-25): 준비중 `300:1068`, D-day 배경 `brand/accent-subtle`·글자
 * `brand/accent`(`300:1070`), 공연중 배경 `brand/accent`·글자 `brand/accent-subtle`(`585:798`),
 * 지난 공연 배경 `interaction/disabled-bg`(`300:1072`). large(P10a-V)는 아직 없다.
 */
export const ConcertStates: Story = {
  render: () => (
    <Flex gap={2}>
      <Chip variant="concert" tone="ready">
        준비중
      </Chip>
      <Chip variant="concert" tone="dday">
        D-7
      </Chip>
      <Chip variant="concert" tone="ing">
        공연중
      </Chip>
      <Chip variant="concert" tone="past">
        지난 공연
      </Chip>
    </Flex>
  ),
  play: async ({ canvas }) => {
    const style = (text: string) => getComputedStyle(canvas.getByText(text));
    // brand/accent #E84230, brand/accent-subtle #FEEDEC, interaction/disabled-bg #EEEEED
    await expect(style('D-7').backgroundColor).toBe('rgb(254, 237, 236)');
    await expect(style('D-7').color).toBe('rgb(232, 66, 48)');
    await expect(style('공연중').backgroundColor).toBe('rgb(232, 66, 48)');
    await expect(style('공연중').color).toBe('rgb(254, 237, 236)');
    await expect(style('지난 공연').backgroundColor).toBe('rgb(238, 238, 237)');
  },
};

/** 다크 토큰 미리 보기(출시는 라이트만) */
export const ConcertStatesDark: Story = {
  render: ConcertStates.render,
  decorators: [withDarkTheme],
};

const Row = ({ title, children }: { title: string; children: ReactNode }) => (
  <Flex direction="column" gap={2}>
    <Txt typography="labelSm" color={colors.textSecondary}>
      {title}
    </Txt>
    <Flex gap={2} align="center" wrap>
      {children}
    </Flex>
  </Flex>
);

/** Figma Tag 페이지 5종 전부 */
export const FigmaVariants: Story = {
  render: () => (
    <Flex direction="column" gap={5}>
      <Row title="Ticket state chip">
        <Chip variant="status" tone="brand">
          승인완료
        </Chip>
        <Chip variant="status" tone="muted">
          승인대기
        </Chip>
        <Chip variant="status" tone="accent">
          선물대기
        </Chip>
        <Chip variant="status" tone="success">
          선물완료
        </Chip>
      </Row>
      <Row title="tag (공연 태그 / 티켓 수)">
        <Chip variant="tag">밴드</Chip>
        <div className={sprinkles({ background: 'grey', padding: 2 })}>
          <Chip variant="tag" tone="plain">
            2매
          </Chip>
        </div>
      </Row>
      <Row title="role chip (GUEST는 칩 없음)">
        <Chip variant="role" tone="master">
          마스터
        </Chip>
        <Chip variant="role" tone="manager">
          매니저
        </Chip>
      </Row>
      <Row title="Concert state chip small (+ D-day)">
        <Chip variant="concert" tone="ready">
          준비중
        </Chip>
        <Chip variant="concert" tone="dday">
          {formatDday(7)}
        </Chip>
        <Chip variant="concert" tone="dday">
          {formatDday(0)}
        </Chip>
        <Chip variant="concert" tone="ing">
          공연중
        </Chip>
        <Chip variant="concert" tone="past">
          지난 공연
        </Chip>
      </Row>
      <Row title="money option chip">
        <Chip variant="money" amount={1000} />
        <Chip variant="money" amount={15000} />
      </Row>
    </Flex>
  ),
};

/**
 * 서버 티켓 상태 11가지 → 모양 매핑 **예시**(design-system §3 "없는 상태"). 매핑 코드는 쓰는 Phase가 features에 둔다.
 * neutral·danger는 디자이너에게 색을 요청한 임시 모양이다.
 */
const TICKET_STATE_EXAMPLE: Array<
  [string, Extract<ChipProps, { variant: 'status' }>['tone'], string]
> = [
  ['PENDING_APPROVE', 'muted', '승인대기'],
  ['APPROVED', 'brand', '승인완료'],
  ['RECEIVED', 'brand', '받은 선물'],
  ['GIFT_PENDING', 'accent', '선물대기'],
  ['GIFT_EXPIRED', 'accent', '선물 만료'],
  ['GIFT_SENT', 'success', '선물완료'],
  ['REFUSED', 'danger', '승인거절'],
  ['CANCELED', 'danger', '취소'],
  ['REFUND_REQUESTED', 'neutral', '환불 요청'],
  ['REFUNDED', 'neutral', '환불 완료'],
  ['ENTERED', 'neutral', '입장 완료'],
];

export const TicketStateMappingExample: Story = {
  render: () => (
    <Flex direction="column" gap={2}>
      {TICKET_STATE_EXAMPLE.map(([state, tone, label]) => (
        <Flex key={state} gap={3} align="center">
          <Txt
            typography="labelSm"
            color={colors.textSecondary}
            style={{ display: 'inline-block', width: 160 }}
          >
            {state}
          </Txt>
          <Chip variant="status" tone={tone}>
            {label}
          </Chip>
        </Flex>
      ))}
    </Flex>
  ),
};
