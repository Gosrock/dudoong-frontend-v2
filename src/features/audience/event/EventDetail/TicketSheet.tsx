'use client';

import { useEffect } from 'react';

import { BottomSheet } from '@/ui/components/BottomSheet/BottomSheet';
import { Button } from '@/ui/components/Button/Button';
import { useCloseOnBack } from '@/ui/hooks/useCloseOnBack';
import { useMediaQueries } from '@/ui/hooks/useMediaQueries';
import { Icon } from '@/ui/icons/Icon';

import type { TicketSelection } from '../model/useTicketSelection';
import * as s from './EventDetailView.css';
import { TicketSelector } from './TicketSelector';

/**
 * 모바일 [티켓 구매하기] 바텀시트(GUI `759:21725` "공연상세 - 티켓 구매하기 선택", Design Sync #343 · #386).
 * 부모가 열 때만 마운트한다. 머리 글자 없이 막대 손잡이 → 티켓 목록뿐(버튼 줄 없음 — `759:21725` 2026-11-22 판).
 * 티켓을 누르면 바로 시트가 닫히고 화면 아래 [티켓 구매하기] 위에 고른 티켓 줄(수량 · 금액, `759:22015` #345)이 뜬다(#386 —
 * 예전 #344 "줄을 골라 두고 시트의 [티켓 구매하기]로 확정"을 바꿨다). 그다음 하단 [티켓 구매하기]가 결제로 간다(#347).
 * 다른 티켓이 이미 골라져 있으면(1주문 1종류) 토스트만 뜨고 시트는 열린 채다.
 *
 * overlay-kit으로 열지 않는다 — overlay-kit은 연 순간의 요소를 그대로 그려 PC 카드와 같은 선택 상태(부모 훅)를 따라가지
 * 못한다. 그래서 부모 안에서 선언적으로 그리고, 뒤로가기 닫기는 이 시트가 `useCloseOnBack`으로 직접 맡는다(BottomSheet는 끈다).
 * 열린 채 1024 이상이 되면 닫는다 — 같은 선택이 PC 오른쪽 카드에 보인다.
 */
export function TicketSheet({
  open,
  onOpenChange,
  onExited,
  selection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExited: () => void;
  selection: TicketSelection;
}) {
  const viewport = useMediaQueries();
  const { release } = useCloseOnBack(open, () => onOpenChange(false));
  useEffect(() => {
    if (open && viewport === 'desktop') onOpenChange(false);
  }, [open, viewport, onOpenChange]);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      onExited={onExited}
      closeOnBack={false}
      variant="rounded"
      title="티켓 종류"
      hideTitle
    >
      <TicketSelector
        selection={selection}
        label="티켓 종류"
        // 고르면 바로 닫는다(#386). 기록 항목을 먼저 소비한 뒤 닫아 곧바로 하단 [티켓 구매하기](push)를 눌러도
        // 닫힘의 `history.back()`과 엇갈리지 않는다(useCloseOnBack release)
        onPicked={() => void release().then(() => onOpenChange(false))}
      />
    </BottomSheet>
  );
}

/**
 * 버튼 줄 [문의 56][티켓 구매하기] — 화면 하단 바(`759:14902`)와 PC 예매 패널(`1989:28153`)이 같은 모양.
 * [문의]는 DS Button `primary 2` Large 아이콘만(`ic_chat` — 코드 `tonal` 아이콘만), [티켓 구매하기]는 Primary Large.
 */
export function BuyButtons({
  onContact,
  onBuy,
  buyDisabled,
  buyHasPopup,
}: {
  onContact?: () => void;
  onBuy?: () => void;
  buyDisabled: boolean;
  /** 누르면 시트가 열리는지(하단 바에서 고른 티켓이 없을 때) */
  buyHasPopup?: boolean;
}) {
  return (
    <div className={s.buyButtons}>
      {onContact && (
        <Button
          variant="tonal"
          size="lg"
          icon={<Icon name="chat" />}
          aria-label="문의하기"
          className={s.contactButton}
          onClick={onContact}
        />
      )}
      {onBuy && (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={buyDisabled}
          aria-haspopup={buyHasPopup ? 'dialog' : undefined}
          onClick={onBuy}
        >
          티켓 구매하기
        </Button>
      )}
    </div>
  );
}
