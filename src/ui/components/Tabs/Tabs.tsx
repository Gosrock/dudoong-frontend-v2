'use client';

import * as RadixTabs from '@radix-ui/react-tabs';
import type { ComponentPropsWithRef } from 'react';

import * as s from './Tabs.css';

export type TabsProps = Omit<
  ComponentPropsWithRef<typeof RadixTabs.Root>,
  'asChild' | 'dir' | 'orientation'
>;

/**
 * Figma Tabs(밑줄형). 동작은 Radix Tabs — ←→로 이동하며 바로 선택(activationMode automatic), Home/End.
 * 화면은 제어형(`value`/`onValueChange`)으로 `?tab=`과 묶는다(tech-decisions §3). 탭 수는 자유.
 *
 * ```tsx
 * <Tabs value={tab} onValueChange={setTab}>
 *   <TabList aria-label="검색 결과">
 *     <Tab value="concert">공연</Tab>
 *     <Tab value="host">호스트</Tab>
 *   </TabList>
 *   <TabPanel value="concert">…</TabPanel>
 * </Tabs>
 * ```
 */
export function Tabs(props: TabsProps) {
  return <RadixTabs.Root {...props} />;
}

export type TabListProps = Omit<ComponentPropsWithRef<typeof RadixTabs.List>, 'asChild'>;

export function TabList({ className, ...rest }: TabListProps) {
  return <RadixTabs.List className={className ? `${s.list} ${className}` : s.list} {...rest} />;
}

export type TabProps = Omit<ComponentPropsWithRef<typeof RadixTabs.Trigger>, 'asChild'>;

export function Tab({ className, ...rest }: TabProps) {
  return <RadixTabs.Trigger className={className ? `${s.tab} ${className}` : s.tab} {...rest} />;
}

export type TabPanelProps = Omit<ComponentPropsWithRef<typeof RadixTabs.Content>, 'asChild'>;

export function TabPanel({ className, ...rest }: TabPanelProps) {
  return (
    <RadixTabs.Content className={className ? `${s.panel} ${className}` : s.panel} {...rest} />
  );
}
