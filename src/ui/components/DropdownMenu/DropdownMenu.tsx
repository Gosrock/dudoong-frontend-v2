'use client';

import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';

import { surface } from '../Popover/Popover.css';
import * as s from './DropdownMenu.css';

export type DropdownMenuItem = {
  label: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** 삭제처럼 되돌릴 수 없는 항목 — 글자를 위험 색으로 */
  danger?: boolean;
  icon?: ReactNode;
};

export type DropdownMenuProps = {
  /** 여는 버튼(asChild로 붙는다). ⋮ 아이콘 버튼이면 aria-label="더보기" 등을 준다 */
  trigger: ReactNode;
  items: DropdownMenuItem[];
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
};

/**
 * ⋮ 메뉴(Radix DropdownMenu) — 공연 카드(P11), 티켓 수정·삭제·판매 중단·재개(P12).
 * 방향키로 항목 이동, Enter·Space로 선택, Esc로 닫고 트리거로 포커스가 돌아온다.
 * 디자인이 없어 면은 Toast, 항목은 dropdown item 모양을 따른다.
 */
export function DropdownMenu({
  trigger,
  items,
  side = 'bottom',
  align = 'end',
}: DropdownMenuProps) {
  return (
    <RadixMenu.Root modal={false}>
      <RadixMenu.Trigger asChild>{trigger}</RadixMenu.Trigger>
      <RadixMenu.Portal>
        <RadixMenu.Content
          side={side}
          align={align}
          sideOffset={4}
          collisionPadding={16}
          className={`${surface} ${s.content}`}
        >
          {items.map((item, i) => (
            <RadixMenu.Item
              key={i}
              className={s.item}
              disabled={item.disabled}
              data-danger={item.danger ? 'true' : undefined}
              onSelect={item.onSelect}
            >
              {item.icon}
              {item.label}
            </RadixMenu.Item>
          ))}
        </RadixMenu.Content>
      </RadixMenu.Portal>
    </RadixMenu.Root>
  );
}
