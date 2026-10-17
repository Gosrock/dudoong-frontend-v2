import type { Meta, StoryObj } from '@storybook/react-vite';

import { Icon } from './Icon';
import { iconList, icons } from './registry';

const meta = {
  component: Icon,
  args: { name: 'home' },
} satisfies Meta<typeof Icon>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Labeled: Story = { args: { name: 'notification-on', title: '새 알림' } };

export const Gallery: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 16,
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    >
      {iconList.map((spec) => {
        const key = `${spec.name}/${spec.variant}/${spec.size}`;
        return (
          <figure
            key={key}
            style={{
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                display: 'grid',
                placeItems: 'center',
                outline: '1px dashed #ccc',
              }}
            >
              <Icon {...spec} />
            </div>
            <figcaption style={{ textAlign: 'center' }}>
              {key}
              {icons[key]?.multicolor ? ' ●' : ''}
            </figcaption>
          </figure>
        );
      })}
    </div>
  ),
};

/** currentColor를 따르는지 확인 — 다색 아이콘은 강조색이 남는다 */
export const Colored: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, color: '#6b4eff' }}>
      {iconList.map((spec) => (
        <Icon key={`${spec.name}/${spec.variant}/${spec.size}`} {...spec} />
      ))}
    </div>
  ),
};
