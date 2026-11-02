'use client';

import type { ReactNode } from 'react';

import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';

import * as s from './NoticeBox.css';

// FIGMA-CUSTOM: 노란 안내 상자(gui 793:11743 "Frame 1707480439") 커스텀 → 커스텀 NoticeBox.css.ts. DS 후보(design-system §3)
/** 노란 안내 상자(아이콘 + 한 줄). `onClick`이 있으면 버튼 */
export function NoticeBox({
  icon,
  children,
  onClick,
  className,
}: {
  icon: 'lightbulb' | 'important';
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <Icon name={icon} />
      <Txt typography="bodyMd">{children}</Txt>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className={[s.noticeButton, className].filter(Boolean).join(' ')}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }
  return <p className={[s.notice, className].filter(Boolean).join(' ')}>{content}</p>;
}
