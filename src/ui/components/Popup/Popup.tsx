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
  /** 확인만 막는다(필수 체크 전 등). 취소·Esc는 그대로 */
  confirmDisabled?: boolean;
  /** 뒤로가기로 닫기. EasyOverlay가 직접 맡을 때 false. 기본 true */
  closeOnBack?: boolean;
  onExited?: () => void;
  /**
   * 데스크탑(1024~) 폭 — sm 310(기본, DS `다이얼로그`) · md 480 · lg 520. 모바일은 늘 310.
   * R1f(2026-11-08): Ready 화면이 덮어쓴 폭 — 티켓 관리 확인 `975:8593` 등 520(lg), 입장 취소 확인 `1030:9318` 480(md)
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * 모양. `dialog`(기본) = DS `다이얼로그`.
   * `summary` = 입금 확인 창(R1e — GUI `567:9756`): 342 · 회색 판 · 안쪽 16 · 간격 8 · 오른쪽 위 ✕ · 제목 `Label/lg-emphasized` ·
   * 설명 `Label/md` 진한색 · 버튼은 확인 하나를 꽉 차게(Large). 본문(children)에 흰 카드를 넣는다. `cancelLabel`은 쓰지 않는다(✕가 취소)
   */
  variant?: 'dialog' | 'summary';
};

/**
 * 확인 팝업 — 디자인 시스템 `다이얼로그`(`758:1714`, 2026-11-01): 제목 `Heading/sm - emphasized`, 본문 `Label/sm`,
 * [취소](Secondary medium)[확인](Primary medium). 진행 중은 `다이얼로그 - 로딩`(`772:1180`) — 취소 Disabled, 확인은 Primary 색 그대로 +
 * `Spinner` 20(`772:1176`, 코드 `size="base"`). 옛 근거는 GUI 확인 모달 `567:9468`(342폭 · Large 버튼).
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
  confirmDisabled,
  closeOnBack = true,
  onExited,
  size = 'sm',
  variant = 'dialog',
}: PopupProps) {
  const summary = variant === 'summary';
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      showClose={summary}
      dismissible={!loading}
      closeOnBack={closeOnBack}
      closeOnOutsideClick={false}
      onExited={onExited}
      role="alertdialog"
      layout={summary ? 'summary' : 'popup'}
      popupWidth={size}
      footer={
        <>
          {!summary && cancelLabel !== null && (
            <Button
              variant="secondary"
              size="md"
              disabled={loading}
              onClick={() => {
                onCancel?.();
                onOpenChange(false);
              }}
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            size={summary ? 'lg' : 'md'}
            disabled={loading || confirmDisabled}
            aria-busy={loading || undefined}
            onClick={onConfirm}
          >
            <LoadingLabel loading={loading} size={summary ? 'md' : 'base'}>
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
