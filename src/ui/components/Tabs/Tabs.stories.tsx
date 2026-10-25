import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withDarkTheme } from '../../stories/storyStyles';
import { Tab, TabList, TabPanel, Tabs } from './Tabs';

const meta = {
  title: 'Components/Tabs',
  component: Tabs,
} satisfies Meta<typeof Tabs>;
export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Figma tab(`271:1234`) — 공연/호스트 2개, `type=모바일`. 선택 = 검정 16 Bold + 밑줄(`271:1226`),
 * 미선택 = `interaction/inactive` 16 Regular(`271:1225`), 모두 44h
 */
export const TwoTabs: Story = {
  render: () => (
    <Tabs defaultValue="host">
      <TabList aria-label="검색 결과">
        <Tab value="concert">공연</Tab>
        <Tab value="host">호스트</Tab>
      </TabList>
    </Tabs>
  ),
  play: async ({ canvas }) => {
    const selected = canvas.getByRole('tab', { name: '호스트' });
    const unselected = canvas.getByRole('tab', { name: '공연' });
    const sel = getComputedStyle(selected);
    const unsel = getComputedStyle(unselected);
    // text/primary-label #141413, interaction/inactive #B8B7B3
    await expect(sel.color).toBe('rgb(20, 20, 19)');
    await expect(sel.borderBottomColor).toBe('rgb(20, 20, 19)');
    await expect(sel.fontWeight).toBe('700');
    await expect(sel.fontSize).toBe('16px');
    await expect(unsel.color).toBe('rgb(184, 183, 179)');
    await expect(unsel.fontWeight).toBe('400');
    await expect(selected.getBoundingClientRect().height).toBe(44);
    await expect(unselected.getBoundingClientRect().height).toBe(44);
  },
};

/** Figma `type=데스크탑`(`657:2012`·`657:2014`) — 20(`Heading/md` / `- emphasized`), 48h로 통일 */
export const Desktop: Story = {
  render: () => (
    <Tabs defaultValue="host">
      <TabList aria-label="검색 결과" size="lg">
        <Tab value="concert">공연</Tab>
        <Tab value="host">호스트</Tab>
      </TabList>
    </Tabs>
  ),
  play: async ({ canvas }) => {
    const selected = canvas.getByRole('tab', { name: '호스트' });
    const unselected = canvas.getByRole('tab', { name: '공연' });
    await expect(getComputedStyle(selected).fontSize).toBe('20px');
    await expect(getComputedStyle(selected).fontWeight).toBe('700');
    await expect(getComputedStyle(unselected).fontWeight).toBe('400');
    await expect(selected.getBoundingClientRect().height).toBe(48);
    await expect(unselected.getBoundingClientRect().height).toBe(48);
  },
};

/** 다크 토큰 미리 보기(출시는 라이트만) */
export const Dark: Story = {
  render: TwoTabs.render,
  decorators: [withDarkTheme],
};

/** 공연 상세처럼 4개 + disabled */
export const Many: Story = {
  render: () => (
    <Tabs defaultValue="intro">
      <TabList aria-label="공연 정보">
        <Tab value="intro">공연소개</Tab>
        <Tab value="booking">예매안내</Tab>
        <Tab value="setlist">세트리스트</Tab>
        <Tab value="notice" disabled>
          유의사항
        </Tab>
      </TabList>
    </Tabs>
  ),
};

/** 제어형 — 화면은 이 값을 ?tab=과 묶는다 */
function Controlled() {
  const [tab, setTab] = useState('concert');
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabList aria-label="검색 결과">
        <Tab value="concert">공연</Tab>
        <Tab value="host">호스트</Tab>
        <Tab value="ticket">티켓</Tab>
      </TabList>
      <TabPanel value="concert">공연 목록</TabPanel>
      <TabPanel value="host">호스트 목록</TabPanel>
      <TabPanel value="ticket">티켓 목록</TabPanel>
      <output data-testid="tab">{tab}</output>
    </Tabs>
  );
}

/** ←→로 이동하며 바로 바뀐다. End/Home, 클릭 */
export const Keyboard: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('tablist', { name: '검색 결과' })).toBeInTheDocument();
    await userEvent.tab();
    await expect(c.getByRole('tab', { name: '공연' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(c.getByRole('tab', { name: '호스트' })).toHaveAttribute('aria-selected', 'true');
    await expect(c.getByRole('tabpanel', { name: '호스트' })).toHaveTextContent('호스트 목록');
    await userEvent.keyboard('{End}');
    await expect(c.getByTestId('tab')).toHaveTextContent('ticket');
    await userEvent.keyboard('{Home}');
    await expect(c.getByTestId('tab')).toHaveTextContent('concert');
    await userEvent.click(c.getByRole('tab', { name: '티켓' }));
    await expect(c.getByTestId('tab')).toHaveTextContent('ticket');
  },
};
