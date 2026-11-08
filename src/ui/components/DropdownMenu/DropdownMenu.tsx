'use client';

import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import { Fragment, type ReactNode } from 'react';

import { dropdownSurface } from '../../theme/surface.css';
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
  /**
   * 모양. `default` = DS `dropdown`(116 · 항목 28h · Label/md).
   * `card` = GUI 상세정보 탭 메뉴(`1318:385` — #191, 화면이 직접 그림): 200 · 모서리 12 · 그림자 `drop shadow` · 안쪽 6 ·
   * 항목 37h(위아래 9 · 좌우 10 · 아이콘 18 ↔ 글자 12) `Label/lg` · 항목 사이 구분선.
   * FIGMA-CUSTOM: DS `dropdown`에 없는 변형(2단계 후보, 2026-11-08 #191)
   */
  variant?: 'default' | 'card';
  /** 제어형 — 트리거 밖에서 열고 닫을 때(탭을 눌러 여는 메뉴 등). 없으면 트리거가 연다 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 닫힌 뒤 포커스를 다른 곳에 둘 때 `e.preventDefault()` 뒤 직접 옮긴다(Radix `onCloseAutoFocus`) */
  onCloseAutoFocus?: (e: Event) => void;
};

/**
 * ⋮ 메뉴(Radix DropdownMenu) — 공연 카드(P11), 티켓 수정·삭제·판매 중단·재개(P12).
 * 방향키로 항목 이동, Enter·Space로 선택, Esc로 닫고 트리거로 포커스가 돌아온다.
 * 면은 DS `dropdown`, 항목은 `dropdown item`(GUI 티켓 ⋮ 메뉴 `958:20518` — 116 · 항목 28h, 2026-11-08 O19).
 */
export function DropdownMenu({
  trigger,
  items,
  side = 'bottom',
  align = 'end',
  variant = 'default',
  open,
  onOpenChange,
  onCloseAutoFocus,
}: DropdownMenuProps) {
  const card = variant === 'card';
  return (
    <RadixMenu.Root modal={false} open={open} onOpenChange={onOpenChange}>
      <RadixMenu.Trigger asChild>{trigger}</RadixMenu.Trigger>
      <RadixMenu.Portal>
        <RadixMenu.Content
          side={side}
          align={align}
          sideOffset={4}
          collisionPadding={16}
          className={card ? s.cardContent : `${dropdownSurface} ${s.content}`}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          {items.map((item, i) => (
            <Fragment key={i}>
              {card && i > 0 && <RadixMenu.Separator className={s.cardSeparator} />}
              <RadixMenu.Item
                className={card ? s.cardItem : s.item}
                disabled={item.disabled}
                data-danger={item.danger ? 'true' : undefined}
                onSelect={item.onSelect}
              >
                {item.icon}
                {item.label}
              </RadixMenu.Item>
            </Fragment>
          ))}
        </RadixMenu.Content>
      </RadixMenu.Portal>
    </RadixMenu.Root>
  );
}
