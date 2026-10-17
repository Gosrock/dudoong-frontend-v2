'use client';

import type { ReactNode } from 'react';

import { Button } from '../Button/Button';
import { LoadingLabel } from '../Loader/Loader';
import { Modal } from '../Modal/Modal';

export type PopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** 설명 아래 추가 내용(결제 요약 등) */
  children?: ReactNode;
  confirmLabel?: string;
  /** null이면 버튼 하나(확인만) */
  cancelLabel?: string | null;
  onConfirm?: () => void;
  onCancel?: () => void;
  /** 확인이 진행 중 — 두 버튼과 Esc를 잠그고 확인 자리에 스피너 */
  loading?: boolean;
  /** 뒤로가기로 닫기. EasyOverlay가 직접 맡을 때 false. 기본 true */
  closeOnBack?: boolean;
  onExited?: () => void;
};

/**
 * 확인 팝업(GUI `567:9468`의 확인 모달 모양 — 제목, 설명, [취소][확인]).
 * 사용자의 결정을 받는 창이라 `role="alertdialog"`이고, 바깥 클릭으로는 닫지 않는다(Esc·취소로 닫는다).
 * 첫 포커스는 [취소](Radix가 첫 버튼에 둔다) — 되돌릴 수 없는 확인을 Enter 한 번에 하지 않게.
 * 확인을 눌러도 스스로 닫지 않는다. 서버 호출 후 닫기는 `EasyOverlay`의 `openConfirm`을 쓴다.
 */
export function Popup({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
  loading,
  closeOnBack = true,
  onExited,
}: PopupProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      showClose={false}
      dismissible={!loading}
      closeOnBack={closeOnBack}
      closeOnOutsideClick={false}
      onExited={onExited}
      role="alertdialog"
      compact
      footer={
        <>
          {cancelLabel !== null && (
            <Button
              variant="secondary"
              size="lg"
              disabled={loading}
              onClick={() => {
                onCancel?.();
                onOpenChange(false);
              }}
            >
              {cancelLabel}
            </Button>
          )}
          <Button size="lg" disabled={loading} aria-busy={loading || undefined} onClick={onConfirm}>
            <LoadingLabel loading={loading} size="md">
              {confirmLabel}
            </LoadingLabel>
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
