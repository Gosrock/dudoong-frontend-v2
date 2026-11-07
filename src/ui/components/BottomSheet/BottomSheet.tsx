'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Children, type ReactNode } from 'react';
import { Drawer } from 'vaul';

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
import * as s from './BottomSheet.css';

/**
 * 시트 모양.
 * - `default` — 옛 시트(⌄ 손잡이 · 위 테두리 + 위로 그림자 · 모서리 0). Ready 화면이 아직 없는 시트가 쓴다.
 * - `flat` — 호스팅 시트(GUI `994:1154` 주문 상세 · `931:1314` 옵션 추가 등): 위 모서리 16 · 막대 손잡이 · 머리 오른쪽 ✕ ·
 *   테두리 · 그림자 없음 · 안쪽 위 12 · 좌우 24 · 손잡이 · 머리 · 본문 · 버튼 사이 24 · 버튼 위 구분선 없음.
 * - `raised` — 선물 확인 시트(GUI `908:12096` · `908:21340` · `939:26914`): 막대 손잡이 · 머리 가운데 · 위 테두리 + 위로 그림자 ·
 *   손잡이 → 제목 24 · 글자 → 버튼 20(안 12 + 간격 8) · 버튼 사이 12 · 버튼 위 구분선 없음.
 */
export type BottomSheetVariant = 'default' | 'flat' | 'raised';

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
  /** 모양(위 `BottomSheetVariant`). 기본 `default` */
  variant?: BottomSheetVariant;
  /** 제목 크기 — sm 16 · md2 18 · lg 24. 기본 `raised`면 lg, 그 밖은 sm */
  titleSize?: OverlayTitleSize;
  /** 설명 글자(`theme/overlay-text`). 기본 `raised`면 label, 그 밖은 default */
  descriptionStyle?: OverlayDescriptionStyle;
  /** 머리 오른쪽 ✕. 기본 `flat`만 true */
  showClose?: boolean;
  /** 머리 줄 앞쪽(제목 앞) 슬롯 — GUI 옵션 상세 `943:2221` [✎ 수정] + ✕ 한 줄 */
  headerStart?: ReactNode;
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
  variant = 'default',
  titleSize = variant === 'raised' ? 'lg' : 'sm',
  descriptionStyle = variant === 'raised' ? 'label' : 'default',
  showClose = variant === 'flat',
  headerStart,
}: BottomSheetProps) {
  useCloseOnBack(open, () => onOpenChange(false), { enabled: closeOnBack });
  useOnExited(open, onExited, 550); // vaul 기본 전환 0.5s
  const focus = useReturnFocus();

  const bar = variant !== 'default';
  const hasBody = Children.toArray(children).length > 0;
  const desc = overlayDescriptionText(descriptionStyle, 'sheet');

  const titleNode = (
    <Drawer.Title className={s.title}>
      <Txt typography={overlayTitleTypography[titleSize]}>{title}</Txt>
    </Drawer.Title>
  );
  const closeNode = showClose && (
    <Drawer.Close className={s.closeButton} aria-label="닫기" disabled={!dismissible}>
      <Icon name="close" />
    </Drawer.Close>
  );
  const descriptionNode = description && (
    <Drawer.Description className={[s.description, desc.gap].join(' ')}>
      <Txt typography={desc.typography} color={desc.color}>
        {description}
      </Txt>
    </Drawer.Description>
  );
  // 머리 줄(제목 행) — 앞 슬롯 · 제목 · ✕. 제목을 숨기면 앞 슬롯과 ✕만(옵션 상세 `943:2221`). 셋 다 없으면 머리를 그리지 않는다
  const visibleHead = !hideTitle || Boolean(headerStart) || Boolean(closeNode);
  const headRow = (
    <div className={s.headRow}>
      {headerStart}
      {hideTitle ? (
        <VisuallyHidden asChild>{titleNode}</VisuallyHidden>
      ) : (
        <div className={s.headTitle}>{titleNode}</div>
      )}
      {closeNode}
    </div>
  );

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      dismissible={dismissible}
      repositionInputs
      // 첫 포커스를 시트 안(손잡이 · ✕)으로 옮긴다. 손잡이가 먼저라 입력칸에 바로 포커스가 가 키보드가 뜨지 않는다
      autoFocus
    >
      <Drawer.Portal>
        <Drawer.Overlay className={s.overlay} />
        <Drawer.Content
          className={[s.content, s.contentVariant[variant]].join(' ')}
          {...focus}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          {bar ? (
            <div className={s.barRow[variant]}>
              {/* 막대 손잡이는 장식(끌어내리기는 시트 어디서나). ✕가 없으면 화면 읽기 · 키보드용 닫기를 첫 포커스로 둔다 */}
              <span className={s.bar} aria-hidden />
              {!closeNode && (
                <VisuallyHidden asChild>
                  <Drawer.Close disabled={!dismissible}>닫기</Drawer.Close>
                </VisuallyHidden>
              )}
            </div>
          ) : (
            <div className={s.handleRow}>
              <Drawer.Close className={s.handle} aria-label="닫기" disabled={!dismissible}>
                <Icon name="chevron-down" />
              </Drawer.Close>
            </div>
          )}
          {bar ? (
            visibleHead ? (
              <div className={[s.headerVariant[variant], s.headerAlign[variant]].join(' ')}>
                {headRow}
                {!hideTitle && descriptionNode}
              </div>
            ) : (
              <VisuallyHidden asChild>{titleNode}</VisuallyHidden>
            )
          ) : hideTitle ? (
            <VisuallyHidden asChild>{titleNode}</VisuallyHidden>
          ) : (
            <div className={s.header}>
              {titleNode}
              {descriptionNode}
            </div>
          )}
          {hideTitle && description && (
            <VisuallyHidden asChild>
              <Drawer.Description>{description}</Drawer.Description>
            </VisuallyHidden>
          )}
          {(!bar || hasBody || !footer) && (
            <div
              className={[s.body, s.bodyVariant[variant], !footer && s.bodyLast]
                .filter(Boolean)
                .join(' ')}
            >
              {children}
            </div>
          )}
          {footer && <div className={[s.footer, s.footerVariant[variant]].join(' ')}>{footer}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
