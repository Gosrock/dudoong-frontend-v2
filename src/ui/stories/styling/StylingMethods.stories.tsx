import type { Meta, StoryObj } from '@storybook/react-vite';

import { Flex } from '../../primitives/Flex';
import { Txt } from '../../primitives/Txt';
import { colors } from '../../theme/colors';
import { sprinkles } from '../../theme/sprinkles.css';
import * as s from './StylingMethods.css';

const meta = { title: 'Foundation/Styling methods' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 화면 코드가 스타일을 쓰는 세 가지 방법(patterns §3, 이 순서로 고른다).
 * ① 프리미티브 props → ② sprinkles() 인라인 → ③ Foo.css.ts
 */
export const ThreeWays: Story = {
  render: () => (
    <Flex direction="column" gap={5}>
      {/* ① 프리미티브 */}
      <Flex gap={2} align="center">
        <Txt typography="labelMdEmphasized">① 프리미티브</Txt>
        <Txt typography="bodySm" color={colors.textSecondary}>
          Flex · Spacing · Text의 props
        </Txt>
      </Flex>
      {/* ② sprinkles() — 토큰만 받는 인라인 유틸리티 */}
      <div className={sprinkles({ background: 'grey', padding: 4, borderRadius: 3, marginTop: 2 })}>
        <Txt typography="labelMdEmphasized">② sprinkles() 인라인</Txt>
      </div>
      {/* ③ .css.ts — 고유한 모양, hover, 애니메이션 */}
      <div className={s.card}>
        <Txt typography="labelMdEmphasized">③ Foo.css.ts</Txt>{' '}
        <span className={s.live}>● LIVE</span>
      </div>
    </Flex>
  ),
};
