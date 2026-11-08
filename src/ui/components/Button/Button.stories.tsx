import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Icon } from '../../icons/Icon';
import { Flex } from '../../primitives/Flex';
import { pseudoStyle } from '../../stories/storyStyles';
import { vars } from '../../theme/tokens.css';
import { Button } from './Button';

const meta = {
  component: Button,
  args: { children: '텍스트' },
} satisfies Meta<typeof Button>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Tonal: Story = { args: { variant: 'tonal', size: 'lg' } };
/** Figma `Color=Warning`(#185) — 위험 동작 확인. Normal `brand/accent` · Hover `accent-hover` · Pressed `accent-pressed` */
export const Warning: Story = {
  args: { variant: 'warning', children: '삭제' },
  play: async ({ canvas }) => {
    const btn = canvas.getByRole('button', { name: '삭제' });
    await expect(getComputedStyle(btn).backgroundColor).toBe('rgb(232, 66, 48)');
    await expect(getComputedStyle(btn).color).toBe('rgb(247, 247, 246)');
    await expect(pseudoStyle(btn, ':hover', 'background')).toBe(vars.color.brand.accentHover);
    await expect(pseudoStyle(btn, ':active', 'background')).toBe(vars.color.brand.accentPressed);
  },
};
export const Selected: Story = { args: { variant: 'secondary', selected: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Dark: Story = { args: { variant: 'dark', size: 'lg' } };
export const Loading: Story = {
  args: { loading: true, children: '결제하기' },
  play: async ({ canvas }) => {
    const btn = canvas.getByRole('button', { name: '결제하기' });
    await expect(btn).toBeDisabled();
    await expect(btn).toHaveAttribute('aria-busy', 'true');
  },
};

/** Figma Button 변형 비교용 — 크기 × 종류 */
export const Matrix: Story = {
  render: () => (
    <Flex direction="column" gap={4}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Flex key={size} gap={3} align="center">
          <Button size={size}>텍스트</Button>
          <Button size={size} variant="secondary">
            텍스트
          </Button>
          <Button size={size} variant="tonal">
            텍스트
          </Button>
          <Button size={size} variant="warning">
            텍스트
          </Button>
          <Button size={size} disabled>
            텍스트
          </Button>
        </Flex>
      ))}
    </Flex>
  ),
};

/** medium 글자만은 모든 색이 45h(2026-11-08 판), 아이콘이 있으면 46 · 아이콘만 46×46 */
export const MediumHeight: Story = {
  render: () => (
    <Flex gap={3} align="center">
      <Button>글자</Button>
      <Button variant="secondary">글자 2</Button>
      <Button variant="warning">글자 3</Button>
      <Button icon={<Icon name="add" size={24} />}>아이콘 글자</Button>
      <Button icon={<Icon name="add" />} aria-label="추가" />
    </Flex>
  ),
  play: async ({ canvas }) => {
    for (const name of ['글자', '글자 2', '글자 3']) {
      await expect(canvas.getByRole('button', { name }).getBoundingClientRect().height).toBe(45);
    }
    await expect(
      canvas.getByRole('button', { name: '아이콘 글자' }).getBoundingClientRect().height,
    ).toBe(46);
    const add = canvas.getByRole('button', { name: '추가' }).getBoundingClientRect();
    await expect([add.width, add.height]).toEqual([46, 46]);
  },
};

/**
 * min width(#186) — 글자만 small 55 · medium 69 · Large 82, 아이콘 + 글자 75 · 92 · 108. 아이콘만은 정사각 그대로.
 * 짧은 글자("예")도 이 폭보다 좁아지지 않는다
 */
export const MinWidth: Story = {
  render: () => (
    <Flex direction="column" gap={3}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Flex key={size} gap={3} align="center">
          <Button size={size} data-testid={`text-${size}`}>
            예
          </Button>
          <Button size={size} icon={<Icon name="add" size={24} />} data-testid={`icon-${size}`}>
            예
          </Button>
          <Button
            size={size}
            variant="secondary"
            icon={<Icon name="add" />}
            aria-label="추가"
            data-testid={`only-${size}`}
          />
        </Flex>
      ))}
    </Flex>
  ),
  play: async ({ canvas }) => {
    const w = (id: string) => canvas.getByTestId(id).getBoundingClientRect().width;
    await expect([w('text-sm'), w('text-md'), w('text-lg')]).toEqual([55, 69, 82]);
    await expect([w('icon-sm'), w('icon-md'), w('icon-lg')]).toEqual([75, 92, 108]);
    await expect([w('only-sm'), w('only-md'), w('only-lg')]).toEqual([32, 46, 56]);
  },
};

/** primary 2 medium 글자만은 45h(`754:2529`), 아이콘 있는 판은 46 · 아이콘 + 글자 간격 5(`36:68`) */
export const TonalMedium: Story = {
  render: () => (
    <Flex gap={3} align="center">
      <Button variant="tonal">글자만</Button>
      <Button variant="tonal" icon={<Icon name="add" size={24} />}>
        아이콘
      </Button>
    </Flex>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: '글자만' }).getBoundingClientRect().height,
    ).toBe(45);
    const withIcon = canvas.getByRole('button', { name: '아이콘' });
    await expect(withIcon.getBoundingClientRect().height).toBe(46);
    await expect(getComputedStyle(withIcon).columnGap).toBe('5px');
  },
};

/** 원형 34 아이콘 버튼 — 대시보드 머리 연필(gui `727:23261`, R1a). 검정 · 아이콘 24 · 안쪽 5 */
export const Round: Story = {
  render: () => (
    <Button variant="dark" round icon={<Icon name="edit" size={24} />} aria-label="수정" />
  ),
  play: async ({ canvas }) => {
    const btn = canvas.getByRole('button', { name: '수정' });
    const box = btn.getBoundingClientRect();
    await expect([box.width, box.height]).toEqual([34, 34]);
    await expect(getComputedStyle(btn).backgroundColor).toBe('rgb(20, 20, 19)');
  },
};

/**
 * 상태 색(design-system §3 "Button 상태 색"). Hover·Pressed는 CSS 상태라 화면에서는 마우스로 확인하고,
 * play는 규칙 값을 Figma 변형과 맞춘다 — Secondary Hover `650:1200`·Pressed `438:1793`,
 * primary 2 Normal `645:1506`·Hover `650:1219`·Pressed `650:1224`.
 */
export const StateColors: Story = {
  render: () => (
    <Flex direction="column" gap={4}>
      {(['primary', 'secondary', 'tonal'] as const).map((variant) => (
        <Flex key={variant} gap={3} align="center">
          <Button variant={variant} icon={<Icon name="add" />}>
            {variant}
          </Button>
          <Button variant={variant} size="lg" icon={<Icon name="add" />}>
            {variant}
          </Button>
          <Button variant={variant} size="lg" icon={<Icon name="add" />} aria-label="추가" />
          <Button variant={variant} disabled>
            {variant}
          </Button>
        </Flex>
      ))}
    </Flex>
  ),
  play: async ({ canvas }) => {
    const secondary = canvas.getAllByRole('button', { name: 'secondary' })[0]!;
    await expect(pseudoStyle(secondary, ':hover', 'background')).toBe(vars.color.surface.container);
    await expect(pseudoStyle(secondary, ':active', 'background')).toBe(vars.color.background.grey);

    const tonal = canvas.getAllByRole('button', { name: 'tonal' })[0]!;
    // Normal 글자 brand/on Primary container — Violet 400(#633EE7, 2026-10-25 Figma에서 300 → 400)
    await expect(getComputedStyle(tonal).color).toBe('rgb(99, 62, 231)');
    await expect(pseudoStyle(tonal, ':hover', 'background')).toBe(
      vars.color.brand.primaryContainerHover,
    );
    await expect(pseudoStyle(tonal, ':hover', 'color')).toBe(
      vars.color.brand.onPrimaryContainerHover,
    );
    await expect(pseudoStyle(tonal, ':active', 'background')).toBe(
      vars.color.brand.primaryContainerPressed,
    );
    await expect(pseudoStyle(tonal, ':active', 'color')).toBe(vars.color.text.onBrandFixed);
  },
};
