import type { Meta, StoryObj } from '@storybook/react-vite';

import { Container } from '../primitives/Container';
import { Divider } from '../primitives/Divider';
import { Flex } from '../primitives/Flex';
import { Spacing } from '../primitives/Spacing';
import { Txt } from '../primitives/Txt';
import { colors } from '../theme/colors';

const meta = { title: 'Foundation/Primitives' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Box = ({ label }: { label: string }) => (
  <div style={{ padding: 12, background: '#eeeeed', borderRadius: 8 }}>
    <Txt typography="labelMd">{label}</Txt>
  </div>
);

export const FlexLayouts: Story = {
  render: () => (
    <Container>
      <Flex direction="column" gap={4}>
        <Flex gap={2}>
          <Box label="A" />
          <Box label="B" />
        </Flex>
        <Flex.Center gap={2} style={{ height: 80, background: '#f7f7f6' }}>
          <Box label="Flex.Center" />
        </Flex.Center>
        {/* 함정: 컬럼 Flex 안의 양끝 정렬 행은 fullWidth가 있어야 꽉 찬다(patterns §3) */}
        <Flex direction="column">
          <Flex justify="space-between" fullWidth>
            <Txt typography="headingSmEmphasized">공연 정보</Txt>
            <Txt typography="labelSm" color={colors.textSecondary}>
              더보기
            </Txt>
          </Flex>
        </Flex>
        <Flex direction={{ mobile: 'column', desktop: 'row' }} gap={{ mobile: 2, desktop: 5 }}>
          <Box label="모바일은 세로" />
          <Box label="데스크탑은 가로" />
        </Flex>
      </Flex>
    </Container>
  ),
};

export const SpacingAndDivider: Story = {
  render: () => (
    <div>
      <Txt typography="bodyMd">위</Txt>
      <Spacing size={{ mobile: 4, desktop: 7 }} />
      <Divider />
      <Spacing size={4} />
      <Txt typography="bodyMd">아래</Txt>
    </div>
  ),
};

export const TextLines: Story = {
  render: () => (
    <div style={{ width: 200 }}>
      <Txt as="p" typography="headingSmEmphasized" lines={2}>
        고스락 정기공연 최대 두줄까지 가능합니다 그 뒤는 말줄임으로 잘립니다
      </Txt>
      <Spacing size={2} />
      <Txt as="p" typography="bodySm" color={colors.textSecondary} lines={1}>
        장소: 서울 마포구 서교동 407-8 클럽 두둥 지하 1층
      </Txt>
    </div>
  ),
};

/** 색은 `colors`의 값으로 넘긴다. 의미 색(테마를 따라감)을 먼저 쓰고, 원시 색은 꼭 필요할 때만 */
export const TxtColors: Story = {
  render: () => (
    <Flex direction="column" gap={2}>
      <Txt typography="bodyLg" color={colors.textPrimary}>
        colors.textPrimary — 본문
      </Txt>
      <Txt typography="bodyMd" color={colors.textSecondary}>
        colors.textSecondary — 보조
      </Txt>
      <Txt typography="labelMdEmphasized" color={colors.brandPrimary}>
        colors.brandPrimary — 브랜드
      </Txt>
      <Txt typography="labelSm" color={colors.blue400}>
        colors.blue400 — 원시 색(테마를 따라가지 않음)
      </Txt>
    </Flex>
  ),
};
