'use client';

import { useEffect, useState } from 'react';

import type { MyTicketDetail } from '@/api/my-ticket/schema';
import { SendGiftSection } from '@/features/audience/gift/GiftActionSections';
import { useCancelGift, useReturnGift } from '@/features/audience/gift/model/useGiftActions';
import { BottomSheet } from '@/ui/components/BottomSheet/BottomSheet';
import { Button } from '@/ui/components/Button/Button';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { TicketDetailView } from '../model/useTicketDetail';

type Sheet = 'send' | 'cancel' | 'return' | null;

/**
 * 입장 QR 층 왼쪽 위 선물 버튼(GUI `908:12013` 등 — DS Button Secondary medium 아이콘만).
 * - `canGift` → 선물(`908:11335`) — 보내기 시트 GUI(`908:12032`)는 P8b-V. 지금은 P8b-L 최소 마크업을 바텀시트에 담는다
 * - 대기 중 선물 → 선물 취소(`908:16571`) → 확인 시트(`908:21252`). 공연이 끝난 선물은 "회수"
 * - `canReturn` → 선물 반환(`908:23011`) → 확인 시트(`908:23087`)
 * - 그 밖(입장 완료·취소·불러오는 중) → 꺼진 선물 버튼(`908:16734` — Interaction=Disabled)
 *
 * 시트는 버튼 모양이 바뀌어도(보낸 뒤 T-2가 다시 와서 "선물 취소"가 됨) 열린 채 남는다 — 링크를 보여 줘야 한다.
 */
export function TicketGiftButton({
  view,
  onGone,
}: {
  view: TicketDetailView | null;
  onGone: () => void;
}) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [sendTarget, setSendTarget] = useState<MyTicketDetail | null>(null);

  const pending = view?.pendingGift ?? null;
  const ticketUuid = view?.detail.ticketUuid ?? null;
  const mode: Exclude<Sheet, null> | 'none' = pending
    ? 'cancel'
    : view?.canReturn && ticketUuid
      ? 'return'
      : view?.canGift && ticketUuid
        ? 'send'
        : 'none';
  const verb = view?.detail.isGiftExpired ? '회수' : '취소';

  const icon =
    mode === 'cancel' ? (
      <Icon name="gift-cancel" variant="filled" />
    ) : mode === 'return' ? (
      <Icon name="gift-return" variant="filled" />
    ) : (
      <Icon name="gift" variant="filled" />
    );
  const label = mode === 'cancel' ? `선물 ${verb}` : mode === 'return' ? '선물 반환' : '선물하기';

  return (
    <>
      <Button
        variant="secondary"
        size="md"
        aria-label={label}
        icon={icon}
        disabled={mode === 'none'}
        data-keep-open
        onClick={() => {
          if (mode === 'send' && view) setSendTarget(view.detail);
          if (mode !== 'none') setSheet(mode);
        }}
      />
      <BottomSheet
        open={sheet === 'send'}
        onOpenChange={(next) => !next && setSheet(null)}
        title="선물하기"
      >
        {sendTarget?.ticketUuid && (
          <SendGiftSection ticketUuid={sendTarget.ticketUuid} detail={sendTarget} />
        )}
      </BottomSheet>
      {pending && (
        <CancelGiftSheet
          open={sheet === 'cancel'}
          onClose={() => setSheet(null)}
          giftId={pending.giftId}
          ticketUuid={ticketUuid}
          verb={verb}
        />
      )}
      {mode === 'return' && ticketUuid && (
        <ReturnGiftSheet
          open={sheet === 'return'}
          onClose={() => setSheet(null)}
          ticketUuid={ticketUuid}
          onDone={onGone}
        />
      )}
    </>
  );
}

function CancelGiftSheet({
  open,
  onClose,
  giftId,
  ticketUuid,
  verb,
}: {
  open: boolean;
  onClose: () => void;
  giftId: number;
  ticketUuid: string | null;
  verb: string;
}) {
  const cancel = useCancelGift(giftId, { ticketUuid });
  useEffect(() => {
    if (cancel.done) onClose();
  }, [cancel.done, onClose]);
  // FIGMA-CUSTOM: 선물 취소 확인 시트(gui 908:21340 "Frame 1707480354") 커스텀 → DS BottomSheet. Figma 코멘트 2026-11-01
  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => !next && !cancel.pending && onClose()}
      title={`선물을 ${verb}하시겠습니까?`}
      description={`확인을 누르시면 해당 티켓 선물이 ${verb}됩니다.`}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={cancel.pending}
          onClick={() => void cancel.cancel()}
        >
          {`선물 ${verb}하기`}
        </Button>
      }
    >
      {cancel.error && (
        <p role="alert">
          <Txt typography="bodyMd" color={colors.textDangerLabel}>
            {cancel.error.message}
          </Txt>
        </p>
      )}
    </BottomSheet>
  );
}

function ReturnGiftSheet({
  open,
  onClose,
  ticketUuid,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  ticketUuid: string;
  onDone: () => void;
}) {
  const giveBack = useReturnGift(ticketUuid);
  useEffect(() => {
    if (giveBack.done || giveBack.gone) {
      onClose();
      onDone();
    }
  }, [giveBack.done, giveBack.gone, onClose, onDone]);
  // FIGMA-CUSTOM: 선물 반환 확인 시트(gui 908:23151 "Frame 1707480354") 커스텀 → DS BottomSheet. Figma 코멘트 2026-11-01
  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => !next && !giveBack.pending && onClose()}
      title="선물을 돌려주시겠습니까?"
      description="아래 버튼을 누르면 해당 티켓 선물이 되돌아갑니다."
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={giveBack.pending}
          onClick={() => void giveBack.giveBack()}
        >
          선물 돌려주기
        </Button>
      }
    >
      {giveBack.error && (
        <p role="alert">
          <Txt typography="bodyMd" color={colors.textDangerLabel}>
            {giveBack.error.message}
          </Txt>
        </p>
      )}
    </BottomSheet>
  );
}
