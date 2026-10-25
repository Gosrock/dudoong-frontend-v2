'use client';

import * as RadixTabs from '@radix-ui/react-tabs';
import { type ComponentPropsWithRef, createContext, use } from 'react';

import * as s from './Tabs.css';

export type TabsProps = Omit<
  ComponentPropsWithRef<typeof RadixTabs.Root>,
  'asChild' | 'dir' | 'orientation'
>;

/**
 * Figma Tabs(밑줄형). 동작은 Radix Tabs — ←→로 이동하며 바로 선택(activationMode automatic), Home/End.
 * 화면은 제어형(`value`/`onValueChange`)으로 `?tab=`과 묶는다(tech-decisions §3). 탭 수는 자유.
 * 크기는 `TabList`의 `size` — `md`(기본, Figma `type=모바일` 16) · `lg`(`type=데스크탑` 20).
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

export type TabSize = 'md' | 'lg';

const TabSizeContext = createContext<TabSize>('md');

export type TabListProps = Omit<ComponentPropsWithRef<typeof RadixTabs.List>, 'asChild'> & {
  /** md = Figma `type=모바일`(16, 44h), lg = `type=데스크탑`(20, 48h) */
  size?: TabSize;
};

export function TabList({ className, size = 'md', ...rest }: TabListProps) {
  return (
    <TabSizeContext value={size}>
      <RadixTabs.List className={className ? `${s.list} ${className}` : s.list} {...rest} />
    </TabSizeContext>
  );
}

export type TabProps = Omit<ComponentPropsWithRef<typeof RadixTabs.Trigger>, 'asChild'>;

export function Tab({ className, ...rest }: TabProps) {
  const cls = s.tab({ size: use(TabSizeContext) });
  return <RadixTabs.Trigger className={className ? `${cls} ${className}` : cls} {...rest} />;
}

export type TabPanelProps = Omit<ComponentPropsWithRef<typeof RadixTabs.Content>, 'asChild'>;

export function TabPanel({ className, ...rest }: TabPanelProps) {
  return (
    <RadixTabs.Content className={className ? `${s.panel} ${className}` : s.panel} {...rest} />
  );
}
