import type { Meta, StoryObj } from '@storybook/react-vite';

import { Flex } from '../primitives/Flex';
import { Txt } from '../primitives/Txt';
import { palette } from '../theme/palette';
import { vars } from '../theme/tokens.css';
import { typographySpecs } from '../theme/typography.css';

const meta = { title: 'Foundation/Tokens' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <Flex direction="column" gap={1} style={{ width: 120 }}>
      <div
        style={{
          height: 40,
          borderRadius: 8,
          background: value,
          border: `1px solid ${vars.color.surface.defaultBorder}`,
        }}
      />
      <Txt typography="labelSm">{name}</Txt>
    </Flex>
  );
}

/** 의미 색. `data-theme="dark"`로 다크 값을 미리 볼 수 있다(출시는 라이트만) */
export const SemanticColors: Story = {
  render: () => (
    <Flex direction="column" gap={5}>
      {Object.entries(vars.color).map(([group, tokens]) => (
        <Flex key={group} direction="column" gap={2}>
          <Txt typography="headingSmEmphasized">{group}</Txt>
          <Flex wrap gap={3}>
            {Object.entries(tokens as Record<string, string>).map(([k, v]) => (
              <Swatch key={k} name={k} value={v} />
            ))}
          </Flex>
        </Flex>
      ))}
    </Flex>
  ),
};

export const Palette: Story = {
  render: () => (
    <Flex direction="column" gap={3}>
      {Object.entries(palette).map(([family, steps]) => (
        <Flex key={family} gap={2} align="center">
          <div style={{ width: 80 }}>
            <Txt typography="labelSm">{family}</Txt>
          </div>
          {Object.entries(steps).map(([k, v]) => (
            <div
              key={k}
              title={`${family}/${k} ${v}`}
              style={{ width: 36, height: 36, background: v, borderRadius: 4 }}
            />
          ))}
        </Flex>
      ))}
    </Flex>
  ),
};

export const Typography: Story = {
  render: () => (
    <Flex direction="column" gap={3}>
      {Object.keys(typographySpecs).map((name) => (
        <Txt key={name} as="p" typography={name as keyof typeof typographySpecs}>
          {name} — 두둥 공연 2026.10.17 · 0123456789
        </Txt>
      ))}
    </Flex>
  ),
};

/** Space/7~10은 데스크탑(≥1024px)에서 커진다 — 창 폭을 바꿔 확인 */
export const Space: Story = {
  render: () => (
    <Flex direction="column" gap={2}>
      {Object.entries(vars.space).map(([k, v]) => (
        <Flex key={k} gap={3} align="center">
          <div style={{ width: 40 }}>
            <Txt typography="labelSm">{k}</Txt>
          </div>
          <div style={{ height: 12, width: v, background: vars.color.brand.primary }} />
        </Flex>
      ))}
    </Flex>
  ),
};
