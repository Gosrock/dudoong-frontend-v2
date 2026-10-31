import type { Meta, StoryObj } from '@storybook/react-vite';

import { Flex } from '../../primitives/Flex';
import { colors } from '../../theme/colors';
import { Button } from '../Button/Button';
import { LoadingLabel, ScreenLoader, Spinner } from './Loader';

const meta = { title: 'Components/Loader', component: Spinner } satisfies Meta<typeof Spinner>;
export default meta;

type Story = StoryObj<typeof meta>;

/** sm 16 · base 20(디자인 시스템 `Spinner`) · md 24. 색은 currentColor */
export const Sizes: Story = {
  render: () => (
    <Flex gap={4} align="center" style={{ color: colors.brandPrimary }}>
      <Spinner size="sm" label="불러오는 중" />
      <Spinner size="base" label="불러오는 중" />
      <Spinner size="md" label="불러오는 중" />
    </Flex>
  ),
};

/** Button 로딩(design-system "없는 상태") — 라벨 폭 유지, 라벨 자리에 스피너 */
export const InButton: Story = {
  render: () => (
    <Flex gap={3} align="center">
      <Button size="sm" disabled aria-busy>
        <LoadingLabel loading>저장하기</LoadingLabel>
      </Button>
      <Button size="md" disabled aria-busy>
        <LoadingLabel loading>저장하기</LoadingLabel>
      </Button>
      <Button size="lg" disabled aria-busy>
        <LoadingLabel loading size="md">
          저장하기
        </LoadingLabel>
      </Button>
      <Button size="lg">
        <LoadingLabel>저장하기</LoadingLabel>
      </Button>
    </Flex>
  ),
};

/** 화면(영역) 로딩 — AsyncBoundary 기본 pending */
export const Screen: Story = { render: () => <ScreenLoader /> };
