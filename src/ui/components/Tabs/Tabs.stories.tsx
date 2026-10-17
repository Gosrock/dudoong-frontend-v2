import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Tab, TabList, TabPanel, Tabs } from './Tabs';

const meta = {
  title: 'Components/Tabs',
  component: Tabs,
} satisfies Meta<typeof Tabs>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Figma tab — 공연/호스트 2개 */
export const TwoTabs: Story = {
  render: () => (
    <Tabs defaultValue="host">
      <TabList aria-label="검색 결과">
        <Tab value="concert">공연</Tab>
        <Tab value="host">호스트</Tab>
      </TabList>
    </Tabs>
  ),
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
