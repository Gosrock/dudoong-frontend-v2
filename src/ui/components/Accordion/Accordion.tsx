'use client';

import * as Collapsible from '@radix-ui/react-collapsible';
import type { ReactNode } from 'react';

import { Icon } from '../../icons/Icon';
import * as s from './Accordion.css';

export type AccordionProps = {
  /** 행 라벨 */
  label: ReactNode;
  /** 오른쪽 보조 글자 — Figma "(2/3)" */
  meta?: ReactNode;
  /** chevron 앞 노드 — Figma text+money의 금액 칩(`<Chip variant="money" />`) */
  trailing?: ReactNode;
  /** 제어형 */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** 펼친 내용(보통 InfoRow third 여러 줄) */
  children: ReactNode;
  className?: string;
};

/**
 * 펼침형 정보 행(Figma list `second-closed`·`second-open`). 동작은 Radix Collapsible —
 * 트리거는 `<button aria-expanded>`, Enter·Space로 펼친다.
 */
export function Accordion({
  label,
  meta,
  trailing,
  open,
  defaultOpen,
  onOpenChange,
  disabled,
  children,
  className,
}: AccordionProps) {
  return (
    <Collapsible.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      disabled={disabled}
      className={className}
    >
      <Collapsible.Trigger className={s.trigger}>
        <span className={s.label}>{label}</span>
        <span className={s.end}>
          {trailing}
          {meta !== undefined ? <span className={s.meta}>{meta}</span> : null}
          <span className={s.chevron} aria-hidden>
            <Icon name="chevron-down" />
          </span>
        </span>
      </Collapsible.Trigger>
      <Collapsible.Content className={s.content}>{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}
