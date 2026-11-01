'use client';

import { overlay } from 'overlay-kit';
import { type ReactNode, useState } from 'react';

import { useCloseOnBack } from '../../hooks/useCloseOnBack';
import { ResponsiveOverlay } from '../BottomSheet/ResponsiveOverlay';
import { Button } from '../Button/Button';
import { LoadingLabel } from '../Loader/Loader';
import { Popup } from '../Popup/Popup';

export type ConfirmOptions = {
  title: ReactNode;
  description?: ReactNode;
  /** 설명 아래 내용(사유 선택 등) */
  content?: ReactNode;
  confirmLabel?: string;
  /** null이면 확인 버튼만 */
  cancelLabel?: string | null;
  /**
   * 확인을 누르면 부른다. 도는 동안 버튼·Esc·바깥 클릭·스와이프·뒤로가기를 잠근다(patterns §6 확인 창 계약).
   * - **`false`로 resolve → 열린 채 남는다**(실패). model 훅의 `Promise<boolean>`(실패면 `handleError` 뒤 `false`)을 그대로 넘긴다:
   *   `onConfirm: () => m.remove(id)`
   * - reject(throw) → 열린 채 남는다(`false`와 같다)
   * - 그 밖의 값(`true`·`undefined` …)으로 resolve → 닫히고 `openConfirm`은 `true`
   *
   * 실패 안내는 onConfirm 쪽이 맡는다(`handleError` — patterns §4-5).
   */
  onConfirm?: () => Promise<unknown>;
  /** popup(기본) = 확인 팝업, responsive = PC 모달 · 모바일 바텀시트 */
  variant?: 'popup' | 'responsive';
};

export type EasyOverlayProps = ConfirmOptions & {
  open: boolean;
  /** 결과와 함께 닫는다. overlay-kit openAsync의 `close` */
  onResult: (confirmed: boolean) => void;
  onExited?: () => void;
};

/**
 * "확인 누르면 서버 호출 후 닫힘"(patterns §6). 보통 `openConfirm()`으로 연다.
 *
 * 뒤로가기: 여기서 한 번 처리한다(안쪽 Popup·ResponsiveOverlay는 끈다). 진행 중 뒤로가기는 닫지 않고 history 항목을
 * 다시 넣는다 — 요청은 이미 서버로 갔으니 결과를 보여 줘야 한다. 성공하면 history 항목을 먼저 소비하고(popstate까지 기다림)
 * 그다음 `true`로 닫는다. 호출한 쪽이 이어서 `router.push`해도 `history.back()`과 엇갈리지 않는다.
 */
export function EasyOverlay({
  open,
  onResult,
  onExited,
  title,
  description,
  content,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  variant = 'popup',
}: EasyOverlayProps) {
  const [pending, setPending] = useState(false);
  const { release } = useCloseOnBack(open, () => onResult(false), { hold: pending });

  const handleOpenChange = (next: boolean) => {
    if (!next && !pending) onResult(false);
  };

  const handleConfirm = async () => {
    if (pending) return;
    setPending(true);
    let result: unknown;
    try {
      result = await onConfirm?.();
    } catch {
      result = false;
    }
    if (result === false) {
      // 실패: 열린 채 둔다. 안내는 onConfirm이 맡는다(handleError)
      setPending(false);
      return;
    }
    await release();
    setPending(false);
    onResult(true);
  };

  if (variant === 'popup') {
    return (
      <Popup
        open={open}
        onOpenChange={handleOpenChange}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={handleConfirm}
        loading={pending}
        closeOnBack={false}
        onExited={onExited}
      >
        {content}
      </Popup>
    );
  }

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      dismissible={!pending}
      closeOnBack={false}
      onExited={onExited}
      footer={
        <>
          {cancelLabel !== null && (
            <Button
              variant="secondary"
              size="lg"
              disabled={pending}
              onClick={() => handleOpenChange(false)}
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            size="lg"
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={handleConfirm}
          >
            <LoadingLabel loading={pending} size="md">
              {confirmLabel}
            </LoadingLabel>
          </Button>
        </>
      }
    >
      {content}
    </ResponsiveOverlay>
  );
}

/**
 * 확인 오버레이를 열고 결과를 기다린다. 확인(+ onConfirm 성공)이면 true, 취소·Esc·뒤로가기면 false.
 * "실패하면 열린 채, 성공하면 닫힘"(patterns §6) — 훅이 `Promise<boolean>`을 돌려주면 그대로 넘긴다.
 *
 * ```ts
 * // model 훅: 성공 true, 실패면 handleError 뒤 false
 * const ok = await openConfirm({
 *   title: '주문을 승인할까요?',
 *   onConfirm: () => guests.approve(orderUuid), // false → 열린 채(토스트는 훅이 띄웠다)
 * });
 * if (ok) toast('승인했어요');
 * ```
 *
 * 경로가 바뀌어 `unmountAll`로 사라지면 Promise는 끝나지 않는다(기다리던 화면도 함께 사라진다).
 */
export function openConfirm(options: ConfirmOptions): Promise<boolean> {
  return overlay.openAsync<boolean>(({ isOpen, close, unmount }) => (
    <EasyOverlay {...options} open={isOpen} onResult={close} onExited={unmount} />
  ));
}
