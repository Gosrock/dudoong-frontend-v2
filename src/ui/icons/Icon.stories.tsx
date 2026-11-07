import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

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

/** 2026-10-25 판에서 더해진 11개(design-system §3 ic 행)와 세트 밖 낱개 `ic/ticket/filled/24`(`183:1130`) */
export const AddedIn20261025: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <Icon name="edit" title="edit" />
      <Icon name="up" title="up" />
      <Icon name="diagonal" title="diagonal" />
      <Icon name="pop-out" title="pop-out" />
      <Icon name="archiving" title="archiving" />
      <Icon name="location" title="location" />
      <Icon name="music" title="music" />
      <Icon name="log-out" title="log-out" />
      <Icon name="update" title="update" />
      <Icon name="chevron-left" size={20} title="chevron-left 20" />
      <Icon name="chevron-right" size={20} title="chevron-right 20" />
      <Icon name="ticket" variant="filled" title="ticket filled" />
    </div>
  ),
  play: async ({ canvas }) => {
    const imgs = canvas.getAllByRole('img');
    await expect(imgs).toHaveLength(12);
    for (const img of imgs) await expect(img.childElementCount).toBeGreaterThan(0);
    await expect(canvas.getByRole('img', { name: 'chevron-left 20' })).toHaveAttribute(
      'viewBox',
      '0 0 20 20',
    );
  },
};

/**
 * 2026-11-07 판 ic_v2의 선물 상태 아이콘 2개(`811:32` 선물 대기 · `811:68` 선물 받음) — 24 원본과 예매자 관리 GUI 크기 16,
 * DS 원본 색(대기 neutral 300 · 받음 #141413)
 */
export const AddedIn20261107: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ color: '#b8b7b3' }}>
        <Icon name="gift-waiting" variant="filled" title="gift-waiting 24" />
      </span>
      <span style={{ color: '#141413' }}>
        <Icon name="gift-done" variant="filled" title="gift-done 24" />
      </span>
      <span style={{ color: '#b8b7b3' }}>
        <Icon
          name="gift-waiting"
          variant="filled"
          title="gift-waiting 16"
          style={{ width: 16, height: 16 }}
        />
      </span>
      <span style={{ color: '#141413' }}>
        <Icon
          name="gift-done"
          variant="filled"
          title="gift-done 16"
          style={{ width: 16, height: 16 }}
        />
      </span>
    </div>
  ),
  play: async ({ canvas }) => {
    const imgs = canvas.getAllByRole('img');
    await expect(imgs).toHaveLength(4);
    for (const img of imgs) {
      await expect(img.childElementCount).toBeGreaterThan(0);
      await expect(img).toHaveAttribute('viewBox', '0 0 24 24');
    }
  },
};
