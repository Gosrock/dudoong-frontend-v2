'use client';

import * as RadixPopover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';

import * as s from './Popover.css';

export type PopoverProps = {
  /** 여는 요소. 버튼이어야 한다(asChild로 붙는다). 아이콘만 있으면 aria-label을 준다 */
  trigger: ReactNode;
  children: ReactNode;
  /** 내용의 접근성 이름(대화상자 이름) */
  label?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * 눌러서 여는 말풍선(Radix Popover). Esc·바깥 클릭으로 닫히고 포커스는 트리거로 돌아온다.
 * 모바일 ⓘ 설명처럼 탭으로 열어야 하는 곳은 Tooltip(hover·focus 전용) 대신 이것을 쓴다.
 */
export function Popover({
  trigger,
  children,
  label,
  side = 'bottom',
  align = 'center',
  open,
  defaultOpen,
  onOpenChange,
}: PopoverProps) {
  return (
    <RadixPopover.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={16}
          aria-label={label}
          className={`${s.surface} ${s.content}`}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
