import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { Logo } from '../brand/Logo';
import { Avatar, type AvatarColor } from '../components/Avatar/Avatar';
import { Illustration, illustrationNames } from '../illustrations/Illustration';
import { Flex } from '../primitives/Flex';
import { Txt } from '../primitives/Txt';
import { colors } from '../theme/colors';
import { sprinkles } from '../theme/sprinkles.css';
import { withDarkTheme } from './storyStyles';

const meta = { title: 'Foundation/Assets' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Cell = ({ name, children }: { name: string; children: ReactNode }) => (
  <Flex direction="column" gap={2} align="center">
    {children}
    <Txt typography="labelSm" color={colors.textSecondary}>
      {name}
    </Txt>
  </Flex>
);

/** src/ui/illustrations — 빈 화면 6종·illust_dashboard 4종(모두 SVG). Figma 크기 그대로 */
export const Illustrations: Story = {
  render: () => (
    <Flex wrap gap={6} align="flex-end">
      {illustrationNames.map((name) => (
        <Cell key={name} name={name}>
          <Illustration name={name} />
        </Cell>
      ))}
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    // 장식(alt="")이라 presentation 역할이다
    const imgs = canvasElement.querySelectorAll('img');
    await expect(imgs).toHaveLength(illustrationNames.length);
    for (const img of imgs) {
      await expect(img).toHaveAttribute('alt', '');
      // 파일이 실제로 불러와지는지(빌드 경로·import 확인)
      await waitFor(() => expect(img.complete && img.naturalWidth > 0).toBe(true));
    }
  },
};

/**
 * 다크 토큰에서 보기(출시는 라이트만). 일러스트는 `<img>`라 색이 바뀌지 않는다 — 검정 선(#141413) 그림은
 * 다크 배경(Neutral 900)에서 거의 보이지 않는다(PNG일 때와 같다). 다크 모드를 켤 때 디자인이 필요하다.
 */
export const IllustrationsDark: Story = {
  render: () => (
    <Flex
      wrap
      gap={6}
      align="flex-end"
      className={sprinkles({ padding: 4 })}
      style={{ background: colors.backgroundNormal }}
    >
      {illustrationNames.map((name) => (
        <Cell key={name} name={name}>
          <Illustration name={name} />
        </Cell>
      ))}
    </Flex>
  ),
  decorators: [withDarkTheme],
};

export const IllustrationWithAlt: Story = {
  render: () => <Illustration name="no-search-result" width={120} alt="검색 결과 없음" />,
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('img', { name: '검색 결과 없음' }),
    ).toHaveAttribute('width', '120');
  },
};

const avatarColors: AvatarColor[] = ['teal', 'orange', 'indigo', 'grey'];

/** src/ui/illustrations/avatar-*.svg — Figma Avatar "40"(45px) 변형에서 뽑았다 */
export const AvatarCharacters: Story = {
  render: () => (
    <Flex gap={5}>
      {avatarColors.map((c) => (
        <Cell key={c} name={`avatar-${c}`}>
          <Avatar size={45} color={c} />
        </Cell>
      ))}
    </Flex>
  ),
};

/** src/ui/brand — 인라인 SVG, 색은 currentColor */
export const Logos: Story = {
  render: () => (
    <Flex direction="column" gap={5}>
      <Flex gap={6} align="center">
        <Cell name="audience">
          <Logo variant="audience" />
        </Cell>
        <Cell name="host">
          <Logo variant="host" />
        </Cell>
      </Flex>
      <Flex gap={6} align="center" className={sprinkles({ background: 'dark', padding: 4 })}>
        <span style={{ color: colors.textInverse }}>
          <Logo variant="audience" />
        </span>
        <span style={{ color: colors.textInverse }}>
          <Logo variant="host" height={64} />
        </span>
      </Flex>
    </Flex>
  ),
};
