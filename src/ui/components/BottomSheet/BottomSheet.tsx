'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import type { ReactNode } from 'react';
import { Drawer } from 'vaul';

import { useCloseOnBack } from '../../hooks/useCloseOnBack';
import { useOnExited } from '../../hooks/useOnExited';
import { useReturnFocus } from '../../hooks/useReturnFocus';
import { Icon } from '../../icons/Icon';
import { Txt } from '../../primitives/Txt';
import { colors } from '../../theme/colors';
import * as s from './BottomSheet.css';

export type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 접근성 이름. GUI 티켓 시트처럼 화면 제목이 없으면 `hideTitle` */
  title: ReactNode;
  hideTitle?: boolean;
  description?: ReactNode;
  children?: ReactNode;
  /** 하단 고정 버튼 영역 */
  footer?: ReactNode;
  /** false면 스와이프·Esc·바깥 클릭·손잡이로 닫지 않는다(진행 중 잠금) */
  dismissible?: boolean;
  /** 뒤로가기로 닫기. 바깥 컴포넌트가 맡으면 false. 기본 true */
  closeOnBack?: boolean;
  /** 닫힘 애니메이션 뒤. overlay-kit의 `unmount`를 넘긴다 */
  onExited?: () => void;
};

/**
 * 모바일 바텀시트(vaul — Radix Dialog 기반). 높이는 내용에 맞추고, 본문만 스크롤되며 버튼 영역은 아래에 남는다.
 * 키보드 회피는 vaul `repositionInputs`(입력칸에 포커스가 가면 visualViewport에 맞춰 시트 높이를 줄인다),
 * 스크롤 잠금은 vaul(iOS 대응) + Radix Dialog가 한다.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  hideTitle,
  description,
  children,
  footer,
  dismissible = true,
  closeOnBack = true,
  onExited,
}: BottomSheetProps) {
  useCloseOnBack(open, () => onOpenChange(false), { enabled: closeOnBack });
  useOnExited(open, onExited, 550); // vaul 기본 전환 0.5s
  const focus = useReturnFocus();

  const titleNode = (
    <Drawer.Title className={s.title}>
      <Txt typography="headingSmEmphasized">{title}</Txt>
    </Drawer.Title>
  );

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      dismissible={dismissible}
      repositionInputs
      // 첫 포커스를 시트 안(손잡이 버튼)으로 옮긴다. 손잡이가 먼저라 입력칸에 바로 포커스가 가 키보드가 뜨지 않는다
      autoFocus
    >
      <Drawer.Portal>
        <Drawer.Overlay className={s.overlay} />
        <Drawer.Content
          className={s.content}
          {...focus}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <div className={s.handleRow}>
            <Drawer.Close className={s.handle} aria-label="닫기" disabled={!dismissible}>
              <Icon name="chevron-down" />
            </Drawer.Close>
          </div>
          {hideTitle ? (
            <VisuallyHidden asChild>{titleNode}</VisuallyHidden>
          ) : (
            <div className={s.header}>
              {titleNode}
              {description && (
                <Drawer.Description className={s.description}>
                  <Txt typography="bodyMd" color={colors.textSecondary}>
                    {description}
                  </Txt>
                </Drawer.Description>
              )}
            </div>
          )}
          {hideTitle && description && (
            <VisuallyHidden asChild>
              <Drawer.Description>{description}</Drawer.Description>
            </VisuallyHidden>
          )}
          <div className={[s.body, !footer && s.bodyLast].filter(Boolean).join(' ')}>
            {children}
          </div>
          {footer && <div className={s.footer}>{footer}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
