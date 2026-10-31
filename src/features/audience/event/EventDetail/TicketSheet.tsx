'use client';

import { useEffect, useId } from 'react';

import { BottomSheet } from '@/ui/components/BottomSheet/BottomSheet';
import { Button } from '@/ui/components/Button/Button';
import { useMediaQueries } from '@/ui/hooks/useMediaQueries';

import type { TicketSelection } from '../model/useTicketSelection';
import { TicketSelector } from './TicketSelector';

/**
 * 모바일 [티켓 구매하기] 바텀시트(와이어 `528:2484` → `121:1406`). 부모가 열 때만 마운트한다.
 *
 * overlay-kit으로 열지 않는다 — overlay-kit은 연 순간의 요소를 그대로 그려 PC 카드와 같은 선택 상태(부모 훅)를 따라가지
 * 못한다. 그래서 부모 안에서 선언적으로 그리고, 뒤로가기 닫기는 `BottomSheet`(`useCloseOnBack`)가 그대로 한다.
 * 열린 채 1024 이상이 되면 닫는다 — 같은 선택이 PC 오른쪽 카드에 보인다.
 * 시트 안에서 체크아웃으로 갈 때는 `replace`(patterns §6 — 오버레이 항목 위에 쌓지 않게)라 부모가 `onBuy`에서 정한다.
 */
export function TicketSheet({
  open,
  onOpenChange,
  onExited,
  selection,
  onBuy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExited: () => void;
  selection: TicketSelection;
  onBuy: () => void;
}) {
  const headingId = useId();
  const viewport = useMediaQueries();
  useEffect(() => {
    if (open && viewport === 'desktop') onOpenChange(false);
  }, [open, viewport, onOpenChange]);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      onExited={onExited}
      title={<span id={headingId}>티켓 종류</span>}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!selection.checkoutHref}
          onClick={onBuy}
        >
          티켓 구매하기
        </Button>
      }
    >
      <TicketSelector selection={selection} headingId={headingId} />
    </BottomSheet>
  );
}
