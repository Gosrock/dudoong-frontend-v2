'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

import * as s from './Tooltip.css';

export type TooltipProps = {
  /** 말풍선 문구. 트리거의 설명(aria-describedby)이 된다 */
  content: ReactNode;
  /** 트리거. 포커스 가능한 요소여야 한다(asChild로 붙는다) */
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  /** 늘 보이는 안내 말풍선(GUI 햄버거의 "두둥에서 공연을 시작해보세요!")은 open을 고정한다 */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** ms. 기본 200 */
  delayDuration?: number;
};

/**
 * 짧은 설명 말풍선(Radix Tooltip). hover·키보드 포커스로 열리고 Esc로 닫힌다.
 * 터치에서는 열리지 않는다 — 모바일에서 눌러 봐야 하는 ⓘ 설명은 Popover를 쓴다.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  open,
  defaultOpen,
  onOpenChange,
  delayDuration = 200,
}: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            align={align}
            sideOffset={6}
            collisionPadding={16}
            className={s.content}
          >
            {content}
            <RadixTooltip.Arrow className={s.arrow} width={10} height={5} />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
