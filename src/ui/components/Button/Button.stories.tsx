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
          <Button size={size} disabled>
            텍스트
          </Button>
        </Flex>
      ))}
    </Flex>
  ),
};

/** medium은 아이콘 유무와 관계없이 46h(Figma 2026-10-25 `36:47`·`36:68`), 아이콘만 있으면 46×46 */
export const MediumHeight: Story = {
  render: () => (
    <Flex gap={3} align="center">
      <Button>텍스트</Button>
      <Button icon={<Icon name="add" size={24} />}>텍스트</Button>
      <Button icon={<Icon name="add" />} aria-label="추가" />
    </Flex>
  ),
  play: async ({ canvas }) => {
    for (const btn of canvas.getAllByRole('button')) {
      await expect(btn.getBoundingClientRect().height).toBe(46);
    }
    await expect(canvas.getByRole('button', { name: '추가' }).getBoundingClientRect().width).toBe(
      46,
    );
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
    // Normal 글자 Violet 300(#8162F1)
    await expect(getComputedStyle(tonal).color).toBe('rgb(129, 98, 241)');
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
