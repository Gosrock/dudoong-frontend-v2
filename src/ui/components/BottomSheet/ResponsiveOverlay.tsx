'use client';

import type { ReactNode } from 'react';

import { useCloseOnBack } from '../../hooks/useCloseOnBack';
import { useMediaQueries } from '../../hooks/useMediaQueries';
import { Modal } from '../Modal/Modal';
import { BottomSheet } from './BottomSheet';

export type ResponsiveOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  hideTitle?: boolean;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  dismissible?: boolean;
  /** 뒤로가기로 닫기. EasyOverlay가 직접 맡을 때 false. 기본 true */
  closeOnBack?: boolean;
  onExited?: () => void;
};

/**
 * PC(≥1024) = Modal, 모바일 = BottomSheet. 오버레이는 열릴 때 마운트되므로 마운트 뒤 분기로 충분하다(patterns §1-3).
 * 판정 전(첫 렌더, `null`)에는 아무것도 그리지 않는다 — 한 프레임 뒤 열린다.
 * 뒤로가기 처리는 여기서 한 번만 한다(열린 채 화면 폭이 바뀌어 Modal ↔ Sheet가 바뀌어도 history 항목이 하나로 남게).
 */
export function ResponsiveOverlay({ closeOnBack = true, ...props }: ResponsiveOverlayProps) {
  const viewport = useMediaQueries();
  useCloseOnBack(props.open, () => props.onOpenChange(false), { enabled: closeOnBack });
  if (viewport === null) return null;
  return viewport === 'desktop' ? (
    <Modal {...props} closeOnBack={false} />
  ) : (
    <BottomSheet {...props} closeOnBack={false} />
  );
}
