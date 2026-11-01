'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { MyTicketDetail } from '@/api/my-ticket/schema';
import { SendGiftSheet } from '@/features/audience/gift/GiftActionSections';
import {
  type GiftLink,
  useCancelGift,
  useReturnGift,
} from '@/features/audience/gift/model/useGiftActions';
import { BottomSheet } from '@/ui/components/BottomSheet/BottomSheet';
import { Button } from '@/ui/components/Button/Button';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { TicketDetailView } from '../model/useTicketDetail';

type Sheet = 'send' | 'cancel' | 'return' | null;

/** 선물 동작이 끝난 뒤 티켓탭이 띄울 결과 화면(GUI `908:13105` 링크 생성 완료 · `908:21359` 취소 완료 · `908:23165` 반송 완료) */
export type GiftDone =
  | { kind: 'linked'; link: GiftLink; detail: MyTicketDetail }
  | { kind: 'canceled'; verb: string }
  | { kind: 'returned' };

/**
 * 입장 QR 층 왼쪽 위 선물 버튼(GUI `908:12013` 등 — DS Button Secondary medium 아이콘만).
 * - `canGift` → 선물(`908:11335`) → 선물하기 시트(`908:12032`, #19) → 링크가 생기면 `onDone({ kind: 'linked' })`
 * - 대기 중 선물 → 선물 취소(`908:16571`) → 확인 시트(`908:21252`). 공연이 끝난 선물은 "회수"
 * - `canReturn` → 선물 반환(`908:23011`) → 확인 시트(`908:23087`)
 * - 그 밖(입장 완료·취소·불러오는 중) → 꺼진 선물 버튼(`908:16734` — Interaction=Disabled)
 *
 * 시트는 버튼 모양이 바뀌어도(보낸 뒤 T-2가 다시 와서 "선물 취소"가 됨) 열린 채 남는다 — 링크가 올 때까지.
 * 취소·반환이 끝나면 `onDone`으로 결과 화면을 띄운다(층은 연 쪽이 닫는다).
 */
export function TicketGiftButton({
  view,
  onGone,
  onDone,
}: {
  view: TicketDetailView | null;
  /** 티켓이 없어짐(반환 중 `gone`) — 층을 닫는다 */
  onGone: () => void;
  onDone: (done: GiftDone) => void;
}) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [sendTarget, setSendTarget] = useState<MyTicketDetail | null>(null);
  /** 연 순간의 대기 중 선물 — 취소가 끝나 T-2가 다시 와서 `pendingGift`가 없어져도 시트가 끝까지 남아 결과를 알린다 */
  const [cancelTarget, setCancelTarget] = useState<{
    giftId: number;
    verb: string;
    /** 다시 보기(이슈 #106 §1) — 대기 중 선물의 링크·메모와 그 티켓 */
    relink: { link: GiftLink; detail: MyTicketDetail } | null;
  } | null>(null);

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
  const onLinked = useCallback(
    (link: GiftLink) => {
      setSheet(null);
      if (sendTarget) onDone({ kind: 'linked', link, detail: sendTarget });
    },
    [sendTarget, onDone],
  );

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
          if (mode === 'cancel' && pending && view) {
            setCancelTarget({
              giftId: pending.giftId,
              verb,
              relink:
                pending.linkPath && !view.detail.isGiftExpired
                  ? {
                      link: {
                        giftId: pending.giftId,
                        linkPath: pending.linkPath,
                        memo: pending.memo,
                        existing: true,
                      },
                      detail: view.detail,
                    }
                  : null,
            });
          }
          if (mode !== 'none') setSheet(mode);
        }}
      />
      {sendTarget?.ticketUuid && (
        <SendGiftSheet
          open={sheet === 'send'}
          onOpenChange={(next) => !next && setSheet(null)}
          ticketUuid={sendTarget.ticketUuid}
          onLinked={onLinked}
        />
      )}
      {cancelTarget && (
        <CancelGiftSheet
          open={sheet === 'cancel'}
          onClose={() => setSheet(null)}
          giftId={cancelTarget.giftId}
          ticketUuid={ticketUuid}
          verb={cancelTarget.verb}
          memo={cancelTarget.relink?.link.memo ?? null}
          onDone={() => onDone({ kind: 'canceled', verb: cancelTarget.verb })}
          onRelink={
            cancelTarget.relink
              ? () => {
                  const relink = cancelTarget.relink!;
                  setSheet(null);
                  onDone({ kind: 'linked', ...relink });
                }
              : null
          }
        />
      )}
      {mode === 'return' && ticketUuid && (
        <ReturnGiftSheet
          open={sheet === 'return'}
          onClose={() => setSheet(null)}
          ticketUuid={ticketUuid}
          onDone={(returned) => (returned ? onDone({ kind: 'returned' }) : onGone())}
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
  memo,
  onDone,
  onRelink,
}: {
  open: boolean;
  onClose: () => void;
  giftId: number;
  ticketUuid: string | null;
  verb: string;
  memo: string | null;
  onDone: () => void;
  /** 링크 다시 보기 — 링크 생성 완료 화면(`908:13105`)을 다시 띄운다. 링크가 없거나 공연이 끝난 선물(회수)은 null */
  onRelink: (() => void) | null;
}) {
  const cancel = useCancelGift(giftId, { ticketUuid });
  const fired = useRef(false);
  useEffect(() => {
    if (cancel.done && !fired.current) {
      fired.current = true;
      onClose();
      onDone();
    }
  }, [cancel.done, onClose, onDone]);
  // FIGMA-CUSTOM: 선물 취소 확인 시트(gui 908:21340 "Frame 1707480354") 커스텀 → DS BottomSheet. Figma 코멘트 2026-11-01
  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => !next && !cancel.pending && onClose()}
      title={`선물을 ${verb}하시겠습니까?`}
      description={`확인을 누르시면 해당 티켓 선물이 ${verb}됩니다.`}
      footer={
        // FIGMA-CUSTOM: GUI 908:21252는 [선물 취소하기] 하나 + X — 이슈 #106 §1로 [아니요]를 더했다(선물 랜딩 거절 시트 939:26914의 두 버튼 배치). 🤖 Q81
        <Flex gap={2} fullWidth>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={cancel.pending}
            onClick={onClose}
          >
            아니요
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={cancel.pending}
            onClick={() => void cancel.cancel()}
          >
            {`선물 ${verb}하기`}
          </Button>
        </Flex>
      }
    >
      {/* 대기 중 선물의 링크·메모를 다시 볼 곳(이슈 #106 §1 ⭐ — 링크 화면을 벗어나면 되찾을 수 없었다). 디자인 없음 → DS Button. 🤖 Q80 */}
      {onRelink && (
        <Flex direction="column" gap={2} align="flex-start">
          {memo && (
            <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
              선물 대상 메모: {memo}
            </Txt>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="link" />}
            disabled={cancel.pending}
            onClick={onRelink}
          >
            선물 링크 다시 보기
          </Button>
        </Flex>
      )}
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
  /** true = 반환됨(반송 완료 화면), false = 티켓이 이미 없어짐 */
  onDone: (returned: boolean) => void;
}) {
  const giveBack = useReturnGift(ticketUuid);
  const fired = useRef(false);
  useEffect(() => {
    if ((giveBack.done || giveBack.gone) && !fired.current) {
      fired.current = true;
      onClose();
      onDone(giveBack.done);
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
