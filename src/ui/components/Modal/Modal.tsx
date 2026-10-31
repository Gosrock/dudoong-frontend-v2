'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import type { ReactNode } from 'react';

import { useCloseOnBack } from '../../hooks/useCloseOnBack';
import { useOnExited } from '../../hooks/useOnExited';
import { useReturnFocus } from '../../hooks/useReturnFocus';
import { Icon } from '../../icons/Icon';
import { Txt } from '../../primitives/Txt';
import { colors } from '../../theme/colors';
import * as s from './Modal.css';

export type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 접근성 이름. 화면에 제목을 두지 않을 때도 넘기고 `hideTitle`을 준다 */
  title: ReactNode;
  hideTitle?: boolean;
  description?: ReactNode;
  children?: ReactNode;
  /** 하단 버튼 영역. 버튼은 같은 폭으로 나뉜다 */
  footer?: ReactNode;
  /** 오른쪽 위 ✕ (GUI `567:9468`). 기본 true */
  showClose?: boolean;
  /** false면 Esc·바깥 클릭으로 닫지 않는다(진행 중 잠금) */
  dismissible?: boolean;
  /** 뒤로가기로 닫기(useCloseOnBack). 바깥 컴포넌트가 맡으면 false. 기본 true */
  closeOnBack?: boolean;
  /** 닫힘 애니메이션 뒤. overlay-kit의 `unmount`를 넘긴다 */
  onExited?: () => void;
  /** @internal Popup이 쓴다 */
  role?: 'dialog' | 'alertdialog';
  /** @internal Popup이 쓴다 — 바깥 클릭으로 닫지 않는다 */
  closeOnOutsideClick?: boolean;
  /** @internal Popup이 쓴다 */
  compact?: boolean;
};

/**
 * 데스크탑 중앙 모달(Radix Dialog). 포커스 트랩·Esc·바깥 클릭 닫기·포커스 복귀는 Radix가 한다.
 * 모양은 GUI 확인 모달 `567:9468`(제목 + ✕, 설명, 본문, 하단 버튼).
 *
 * ```tsx
 * overlay.open(({ isOpen, close, unmount }) => (
 *   <Modal open={isOpen} onOpenChange={(o) => !o && close()} onExited={unmount} title="주문 상세">…</Modal>
 * ));
 * ```
 */
export function Modal({
  open,
  onOpenChange,
  title,
  hideTitle,
  description,
  children,
  footer,
  showClose = true,
  dismissible = true,
  closeOnBack = true,
  onExited,
  role = 'dialog',
  closeOnOutsideClick = true,
  compact,
}: ModalProps) {
  useCloseOnBack(open, () => onOpenChange(false), { enabled: closeOnBack });
  useOnExited(open, onExited);
  const focus = useReturnFocus();

  // Txt는 id·ref를 넘기지 않으므로 Radix Title·Description을 바깥에 두고 Txt를 안에 넣는다
  const titleNode = (
    <Dialog.Title className={s.title}>
      <Txt typography="headingSmEmphasized">{title}</Txt>
    </Dialog.Title>
  );
  const closeNode = showClose && (
    <Dialog.Close className={s.closeButton} aria-label="닫기" disabled={!dismissible}>
      <Icon name="close" />
    </Dialog.Close>
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} />
        <Dialog.Content
          role={role}
          className={[s.content, compact && s.contentCompact].filter(Boolean).join(' ')}
          // 설명이 없으면 Radix의 aria-describedby 경고를 끈다
          {...(description ? {} : { 'aria-describedby': undefined })}
          {...focus}
          onEscapeKeyDown={(e) => {
            if (!dismissible) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (!dismissible || !closeOnOutsideClick) e.preventDefault();
          }}
        >
          {hideTitle ? (
            <>
              <VisuallyHidden asChild>{titleNode}</VisuallyHidden>
              {closeNode && <div className={s.headerEnd}>{closeNode}</div>}
            </>
          ) : (
            <div className={s.header}>
              {titleNode}
              {closeNode}
            </div>
          )}
          {description && (
            <Dialog.Description className={s.description}>
              {/* 확인 팝업(DS `다이얼로그`)은 본문 `Label/sm` `text/secondary-label` */}
              <Txt
                typography={compact ? 'labelSm' : 'labelMd'}
                color={compact ? colors.textSecondaryLabel : colors.textPrimary}
              >
                {description}
              </Txt>
            </Dialog.Description>
          )}
          {children && <div className={s.body}>{children}</div>}
          {footer && <div className={s.footer}>{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
