'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import type { ReactNode } from 'react';

import { useCloseOnBack } from '../../hooks/useCloseOnBack';
import { useOnExited } from '../../hooks/useOnExited';
import { useReturnFocus } from '../../hooks/useReturnFocus';
import { Icon } from '../../icons/Icon';
import { Txt } from '../../primitives/Txt';
import {
  type OverlayDescriptionStyle,
  overlayDescriptionText,
  type OverlayTitleSize,
  overlayTitleTypography,
} from '../../theme/overlay-text';
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
  /**
   * 크기 — 둘 다 흰 판 · 안쪽 24 · 묶음(머리 · 본문 · 버튼) 사이 24 · 모서리 16. 폭만 다르다.
   * `md`(기본) — 최대 480(GUI 예매자 주문 상세 `1029:6888`, 2026-11-08 `fm-ds-overlays` — 옛 회색 판 · 안쪽 16에서 바꿈).
   * `lg` — 520(GUI 호스팅 PC 티켓 옵션 모달 `956:3157` 등 13장, 2026-11-07 I-h1)
   */
  size?: 'md' | 'lg';
  /** 제목 크기 — sm 16(기본) · md2 18 · lg 24 · label `Label/lg-emphasized` */
  titleSize?: OverlayTitleSize;
  /** 설명 글자(`theme/overlay-text`). 기본 `default` */
  descriptionStyle?: OverlayDescriptionStyle;
  /** 머리 줄 앞쪽(제목 앞) 슬롯 — GUI 옵션 상세 PC `956:5913` [✎ 수정] + ✕ 한 줄 */
  headerStart?: ReactNode;
  /**
   * @internal Popup이 쓴다.
   * `popup` — 확인 팝업(DS `다이얼로그` 310 — 데스크탑은 `popupWidth`).
   * `summary` — 입금 확인 창(GUI `567:9756`): 342 · 회색 판 · 안쪽 16 · 간격 8 · ✕
   */
  layout?: 'popup' | 'summary';
  /** @internal Popup이 쓴다 — 데스크탑(1024~) 폭. sm 310(기본) · md 480 · lg 520 */
  popupWidth?: 'sm' | 'md' | 'lg';
};

/**
 * 데스크탑 중앙 모달(Radix Dialog). 포커스 트랩·Esc·바깥 클릭 닫기·포커스 복귀는 Radix가 한다.
 * 모양은 GUI 예매자 주문 상세 `1029:6888` · 티켓 옵션 모달 `956:3281`(머리 = 제목 행 + 설명, 본문, 하단 버튼).
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
  size = 'md',
  layout,
  titleSize = layout === 'summary' ? 'label' : 'sm',
  descriptionStyle = layout === 'summary' ? 'labelPrimary' : 'default',
  headerStart,
  popupWidth = 'sm',
}: ModalProps) {
  useCloseOnBack(open, () => onOpenChange(false), { enabled: closeOnBack });
  useOnExited(open, onExited);
  const focus = useReturnFocus();

  // Txt는 id·ref를 넘기지 않으므로 Radix Title·Description을 바깥에 두고 Txt를 안에 넣는다
  const titleNode = (
    <Dialog.Title className={s.title}>
      <Txt typography={overlayTitleTypography[titleSize]}>{title}</Txt>
    </Dialog.Title>
  );
  const closeNode = showClose && (
    <Dialog.Close className={s.closeButton} aria-label="닫기" disabled={!dismissible}>
      <Icon name="close" />
    </Dialog.Close>
  );
  const desc = overlayDescriptionText(descriptionStyle, layout === 'popup' ? 'popup' : 'modal');
  const contentClass = [
    s.content,
    layout === 'popup'
      ? [s.contentPopup, s.popupWidth[popupWidth]]
      : layout === 'summary'
        ? s.contentSummary
        : size === 'lg'
          ? s.contentLarge
          : s.contentMedium,
  ]
    .flat()
    .join(' ');

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} />
        <Dialog.Content
          role={role}
          className={contentClass}
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
          {/* 머리 묶음 — 제목 행(앞 슬롯 · 제목 · ✕) + 설명. 보일 것이 없으면 묶음을 그리지 않는다(간격이 생기지 않게) */}
          {!(hideTitle && !headerStart && !closeNode && !description) ? (
            <div className={s.headGroup}>
              {hideTitle && !headerStart ? (
                <>
                  <VisuallyHidden asChild>{titleNode}</VisuallyHidden>
                  {closeNode && <div className={s.headerEnd}>{closeNode}</div>}
                </>
              ) : (
                <div className={s.header}>
                  {headerStart}
                  {hideTitle ? (
                    <VisuallyHidden asChild>{titleNode}</VisuallyHidden>
                  ) : (
                    <div className={s.headTitle}>{titleNode}</div>
                  )}
                  {closeNode}
                </div>
              )}
              {description && (
                <Dialog.Description className={[s.description, desc.gap].join(' ')}>
                  <Txt typography={desc.typography} color={desc.color}>
                    {description}
                  </Txt>
                </Dialog.Description>
              )}
            </div>
          ) : (
            <VisuallyHidden asChild>{titleNode}</VisuallyHidden>
          )}
          {children && <div className={s.body}>{children}</div>}
          {footer && <div className={s.footer}>{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
