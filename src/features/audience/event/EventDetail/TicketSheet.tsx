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
 * 모바일 [티켓 구매하기] 바텀시트(GUI `759:21725` · `759:21918` "공연상세 - 티켓 구매하기 선택", 시트 `1948:39697` — Design Sync #343 · #344).
 * 부모가 열 때만 마운트한다. 머리 글자 없이 막대 손잡이 → 티켓 목록 → 버튼 줄 [문의][티켓 구매하기](화면 하단 바와 같은 줄).
 * 티켓을 누르면 그 줄이 회색으로 골라지고(`759:21918`), 시트의 [티켓 구매하기]를 누르면 시트가 닫히며 화면 아래 고른 티켓 줄
 * (수량 · 금액, `759:22015` #345)이 뜬다. 그다음 하단 [티켓 구매하기]가 결제로 간다(#347). 고르기 전 시트의 버튼은 잠긴다.
 *
 * overlay-kit으로 열지 않는다 — overlay-kit은 연 순간의 요소를 그대로 그려 PC 카드와 같은 선택 상태(부모 훅)를 따라가지
 * 못한다. 그래서 부모 안에서 선언적으로 그리고, 뒤로가기 닫기는 이 시트가 `useCloseOnBack`으로 직접 맡는다(BottomSheet는 끈다).
 * 열린 채 1024 이상이 되면 닫는다 — 같은 선택이 PC 오른쪽 카드에 보인다.
 * 시트 안 [문의]는 시트가 넣은 기록 항목을 `release()`로 먼저 소비한 뒤(popstate까지 기다림) 부모 동작을 부른다 — 시트를 닫고
 * 연락처 시트가 자기 기록 항목을 넣는다(코드 패턴 점검 A20과 같은 순서).
 */
export function TicketSheet({
  open,
  onOpenChange,
  onExited,
  selection,
  onContact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExited: () => void;
  selection: TicketSelection;
  /** 연락처가 있으면 [문의] — 시트를 닫고 연락처 시트를 연다 */
  onContact?: () => void;
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
      footer={
        <BuyButtons
          inSheet
          onContact={onContact && (() => void release().then(onContact))}
          buyDisabled={!selection.checkoutHref}
          // 고른 티켓을 확정 — 시트를 닫으면 하단 바 위 고른 티켓 줄이 보인다(`759:22015`). 기록 항목을 먼저 소비한 뒤 닫아
          // 곧바로 하단 [티켓 구매하기](push)를 눌러도 닫힘의 `history.back()`과 엇갈리지 않는다(useCloseOnBack release)
          onBuy={() => void release().then(() => onOpenChange(false))}
        />
      }
    >
      <TicketSelector selection={selection} label="티켓 종류" />
    </BottomSheet>
  );
}

/**
 * 버튼 줄 [문의 56][티켓 구매하기] — 화면 하단 바(`759:14902`)와 시트 버튼 줄(`1948:25358`)이 같은 모양.
 * [문의]는 DS Button `primary 2` Large 아이콘만(`ic_chat` — 코드 `tonal` 아이콘만), [티켓 구매하기]는 Primary Large.
 */
export function BuyButtons({
  onContact,
  onBuy,
  buyDisabled,
  buyHasPopup,
  inSheet = false,
}: {
  onContact?: () => void;
  onBuy?: () => void;
  buyDisabled: boolean;
  /** 누르면 시트가 열리는지(하단 바에서 고른 티켓이 없을 때) */
  buyHasPopup?: boolean;
  /** 시트 버튼 줄이면 사이 12(화면 하단 바는 8) */
  inSheet?: boolean;
}) {
  return (
    <div className={inSheet ? `${s.buyButtons} ${s.buyButtonsSheet}` : s.buyButtons}>
      {onContact && (
        <Button
          variant="tonal"
          size="lg"
          icon={<Icon name="chat" />}
          aria-label="문의하기"
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
