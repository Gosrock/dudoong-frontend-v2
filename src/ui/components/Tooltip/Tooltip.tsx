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
  /**
   * 트리거가 움직이는 곳(드로어처럼 transform으로 들어오는 면 안)에서 늘 열어 둘 때 `always` — 매 프레임 자리를 다시 잰다.
   * 기본 `optimized`(스크롤·크기 변화 때만)
   */
  updatePositionStrategy?: 'optimized' | 'always';
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
  updatePositionStrategy,
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
            updatePositionStrategy={updatePositionStrategy}
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

/**
 * 늘 보이는 안내 말풍선을 **흐름 안에** 그린다 — `Tooltip`과 같은 모양(흰 바탕 · 회색 테두리 · 아래 꼬리), 포털·위치 계산 없음.
 * 그림·버튼과 한 묶음으로 스크롤·오버스크롤되어야 하는 화면 일러스트 위 말풍선(로그인)용. `Tooltip open`은 포털의
 * `position: fixed`라 고무줄 스크롤 때 그림과 따로 놀았다(이슈 #95). 문구는 화면의 일반 글자다(트리거 설명이 아님).
 */
export function TooltipBubble({ children }: { children: ReactNode }) {
  return (
    <div className={s.bubble}>
      {children}
      <svg className={s.bubbleArrow} width={10} height={5} viewBox="0 0 30 10" aria-hidden>
        <polygon points="0,0 30,0 15,10" />
      </svg>
    </div>
  );
}
