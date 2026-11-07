import type { ReactNode } from 'react';

import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';

import * as s from './NoticeBox.css';

// FIGMA-CUSTOM: 노란 안내 상자(gui 793:11743 "Frame 1707480439" · 닫기 있는 변형 1269:27557 "일부 실패 안내") 커스텀 → 커스텀 NoticeBox.css.ts. DS 후보(design-system §3)
/**
 * 노란 안내 상자(아이콘 + 한 줄). `onClick`이 있으면 버튼.
 * `onDismiss`가 있으면 끝에 닫기(×16)가 붙고 알림(role="alert")이 된다 — 예매자 관리 일괄 승인 실패 안내(GUI `1269:27557`
 * 모바일 위 맞춤 · PC 인스턴스 `1269:28457` 가운데 맞춤)
 */
export function NoticeBox({
  icon,
  children,
  onClick,
  onDismiss,
  className,
}: {
  icon: 'lightbulb' | 'important';
  children: ReactNode;
  onClick?: () => void;
  onDismiss?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <Icon name={icon} />
      <Txt typography="bodyMd">{children}</Txt>
    </>
  );
  if (onDismiss) {
    return (
      <div role="alert" className={[s.dismissible, className].filter(Boolean).join(' ')}>
        <Icon name={icon} />
        <Txt typography="bodyMd" className={s.dismissibleText}>
          {children}
        </Txt>
        <button type="button" className={s.dismiss} aria-label="안내 닫기" onClick={onDismiss}>
          <Icon name="close" />
        </button>
      </div>
    );
  }
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
