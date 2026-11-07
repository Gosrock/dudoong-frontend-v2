import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { expect } from 'storybook/test';

import { Flex } from '../../primitives/Flex';
import { Txt } from '../../primitives/Txt';
import { colors } from '../../theme/colors';
import {
  Chip,
  type ChipColor,
  type ChipProps,
  type ChipTheme,
  formatDday,
  formatOptionAmount,
} from './Chip';

const meta = {
  title: 'Components/Chip',
  component: Chip,
  args: { children: '준비중' },
} satisfies Meta<typeof Chip>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const COLORS: ChipColor[] = ['violet', 'red', 'green', 'grey', 'cyan', 'purple'];
const THEMES: ChipTheme[] = ['weak', 'fill', 'border'];

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

/** Figma `tag_v2`(`693:668`) 72변형 전부 — size × shape × color × theme */
export const FigmaVariants: Story = {
  render: () => (
    <Flex direction="column" gap={5}>
      {(['sm', 'lg'] as const).flatMap((size) =>
        (['square', 'round'] as const).map((shape) => (
          <Row key={`${size}-${shape}`} title={`size=${size}, shape=${shape}`}>
            {THEMES.flatMap((theme) =>
              COLORS.map((color) => (
                <Chip
                  key={`${theme}-${color}`}
                  size={size}
                  shape={shape}
                  color={color}
                  theme={theme}
                >
                  {color}
                </Chip>
              )),
            )}
          </Row>
        )),
      )}
    </Flex>
  ),
};

export const Colors: Story = {
  render: () => (
    <Flex gap={2}>
      <Chip color="violet">weak</Chip>
      <Chip color="violet" theme="fill">
        fill
      </Chip>
      <Chip color="violet" theme="border" shape="round" size="lg">
        border
      </Chip>
    </Flex>
  ),
  play: async ({ canvas }) => {
    const style = (text: string) => getComputedStyle(canvas.getByText(text));
    // brand/primary #633EE7, brand/primary-subtle #F2EEFF
    await expect(style('weak').backgroundColor).toBe('rgb(242, 238, 255)');
    await expect(style('weak').color).toBe('rgb(99, 62, 231)');
    await expect(style('weak').height).toBe('22px');
    await expect(style('fill').backgroundColor).toBe('rgb(99, 62, 231)');
    await expect(style('fill').color).toBe('rgb(242, 238, 255)');
    await expect(style('border').backgroundColor).toBe('rgba(0, 0, 0, 0)');
    await expect(style('border').borderTopColor).toBe('rgb(99, 62, 231)');
    await expect(style('border').height).toBe('25px');
  },
};

type Preset = Pick<ChipProps, 'size' | 'shape' | 'color' | 'theme'>;

/**
 * 옛 Tag 5종 → `tag_v2` 대응(2026-10-31 사용자 결정으로 옛 칩을 없앴다, design-system §3).
 * 색이 같은 것은 그대로, 다른 것은 가장 가까운 것 — 차이는 design-system §3 표.
 */
const OLD_TAGS: Array<[string, string, Preset]> = [
  ['Ticket state chip 승인완료', '승인완료', { color: 'violet' }],
  ['Ticket state chip 승인대기', '승인대기', { color: 'grey' }],
  ['Ticket state chip 선물대기', '선물대기', { color: 'red' }],
  ['Ticket state chip 선물완료', '선물완료', { color: 'green' }],
  ['tag 공연 태그', '밴드', { shape: 'round' }],
  ['tag 티켓 수', '2매', { shape: 'round', theme: 'border' }],
  ['role chip 마스터', '마스터', { size: 'lg', shape: 'round', color: 'purple' }],
  ['role chip 매니저', '매니저', { size: 'lg', shape: 'round', color: 'cyan' }],
  ['Concert state chip 준비중', '준비중', { color: 'green' }],
  ['Concert state chip D-day', formatDday(7), { color: 'red' }],
  ['Concert state chip 공연중', '공연중', { color: 'red', theme: 'fill' }],
  ['Concert state chip 지난 공연', '지난 공연', { color: 'grey' }],
  ['money option chip', formatOptionAmount(1000), { color: 'violet', theme: 'fill' }],
];

export const OldTagMapping: Story = {
  render: () => (
    <Flex direction="column" gap={2}>
      {OLD_TAGS.map(([name, label, preset]) => (
        <Flex key={name} gap={3} align="center">
          <Txt
            typography="labelSm"
            color={colors.textSecondary}
            style={{ display: 'inline-block', width: 200 }}
          >
            {name}
          </Txt>
          <Chip {...preset}>{label}</Chip>
        </Flex>
      ))}
    </Flex>
  ),
};

/**
 * GUI 티켓 관리(Ready for dev `767:50048`)가 쓰는 칩 — 판매 상태 round·border, 공개 범위 square·weak.
 * 서버 상태 → 색 매핑 코드는 P12-V가 features에 둔다.
 */
export const TicketManagementExample: Story = {
  render: () => (
    <Flex gap={2}>
      <Chip shape="round" color="green" theme="border">
        판매 중
      </Chip>
      <Chip shape="round" theme="border">
        판매 종료
      </Chip>
      <Chip shape="round" color="cyan" theme="border">
        판매 예정
      </Chip>
      <Chip>무제한 (공개)</Chip>
    </Flex>
  ),
};
