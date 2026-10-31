'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { assignInlineVars } from '@vanilla-extract/dynamic';
import { type MouseEvent, useEffect } from 'react';

import { isSessionLost } from '@/api/errors';
import type { MyTicketElement } from '@/api/my-ticket/schema';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { Spinner } from '@/ui/components/Loader/Loader';
import { QrCode } from '@/ui/components/QrCode/QrCode';
import { useCloseOnBack } from '@/ui/hooks/useCloseOnBack';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { cardTarget } from '../model/my-ticket-state';
import { pagerLabel, type TicketGroupView } from '../model/ticket-groups';
import { type TicketDetailView, useTicketDetail } from '../model/useTicketDetail';
import { EventInfo } from './EventInfo';
import { TicketGiftButton } from './TicketGiftButton';
import * as s from './TicketTab.css';
import { useSnapCarousel } from './useSnapCarousel';

/**
 * 입장 QR 층(QR 전체화면) — GUI `908:11335`. 카드를 누르면 화면 전체를 어둡게 덮고, 그 자리에 카드 뒷면(QR)을 띄운다.
 * 묶음 안 티켓은 좌우로 넘긴다(`(1/3)` 페이저). **지금 칸의 티켓만** T-2를 부른다(plan P8 — 열 때만).
 * 바깥(카드·버튼이 아닌 곳)을 누르거나 Esc·뒤로가기로 닫는다(patterns §6).
 */
export function TicketQrLayer({
  group,
  index,
  onIndexChange,
  onClose,
  top,
}: {
  group: TicketGroupView;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** 카드가 티켓탭의 같은 자리에 오게 하는 위 여백(px). 모르면 기본 */
  top: number | null;
}) {
  useCloseOnBack(true, onClose);

  const onLayerClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    // 포털로 뜬 시트 안의 클릭은 DOM으로는 바깥이다 — 이 층 안의 클릭만 본다
    if (!e.currentTarget.contains(target)) return;
    if (!target.closest('[data-keep-open]')) onClose();
  };

  return (
    <Dialog.Root open onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.layerOverlay} />
        <Dialog.Content
          className={s.layer}
          aria-describedby={undefined}
          style={top !== null ? assignInlineVars({ [s.layerTop]: `${top}px` }) : undefined}
          onClick={onLayerClick}
          onPointerDownOutside={(e) => e.preventDefault()}
          data-testid="qr-layer"
        >
          <VisuallyHidden asChild>
            <Dialog.Title>입장 QR</Dialog.Title>
          </VisuallyHidden>
          <AsyncBoundary holdOn={isSessionLost}>
            <QrLayerBody
              group={group}
              index={index}
              onIndexChange={onIndexChange}
              onClose={onClose}
            />
          </AsyncBoundary>
          <div className={s.layerInfo}>
            <EventInfo group={group} inverse />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** 선물 버튼 줄 + 티켓 캐러셀. 지금 칸의 티켓 상세(T-2 또는 선물 완료 GG-7a)만 부른다. 옛 uuid 404(`gone`)면 층을 닫는다 */
function QrLayerBody({
  group,
  index,
  onIndexChange,
  onClose,
}: {
  group: TicketGroupView;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const tickets = group.group.tickets;
  const {
    ref: carouselRef,
    active: activeIndex,
    scrollTo,
  } = useSnapCarousel({ count: tickets.length, initial: index, onChange: onIndexChange });
  const current = tickets[activeIndex] ?? null;
  const state = useTicketDetail(current ? cardTarget(current) : null);
  const view = state.status === 'ready' ? state : null;
  const gone = state.status === 'gone';
  useEffect(() => {
    if (gone) onClose();
  }, [gone, onClose]);

  return (
    <>
      <div className={s.layerTopRow}>
        <span className={s.layerGift}>
          <TicketGiftButton
            key={current?.ticketUuid ?? `i${activeIndex}`}
            view={view}
            onGone={onClose}
          />
        </span>
        <Txt typography="labelMd" color={colors.textSecondary}>
          바깥을 탭하여 QR 끄기
        </Txt>
      </div>
      <div ref={carouselRef} className={s.layerCarousel} aria-label="티켓">
        {tickets.map((t, i) => {
          const active = i === activeIndex;
          return (
            <div
              key={t.ticketUuid ?? `${t.issuedTicketNo}-${i}`}
              className={s.item}
              data-carousel-item
              data-active={active}
            >
              {active ? (
                <BackFace view={view} ticket={t} pager={pagerLabel(i, tickets.length)} />
              ) : (
                <button
                  type="button"
                  className={s.back}
                  data-active="false"
                  data-keep-open
                  aria-label={`${i + 1}번째 티켓으로`}
                  onClick={() => scrollTo(i)}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/** 카드 뒷면 — QR(`908:11563`) · 선물중(`908:16587`) · 입장 완료(`908:16750`) · 그 밖 안내 */
function BackFace({
  view,
  ticket,
  pager,
}: {
  view: TicketDetailView | null;
  ticket: MyTicketElement;
  pager: string | null;
}) {
  const ticketNo = view?.detail.issuedTicketNo ?? ticket.issuedTicketNo;
  const state = view?.detail.state ?? ticket.state;
  // FIGMA-CUSTOM: 카드 뒷면(gui 908:11563 "Frame 1707480443") · 티켓 번호(gui 908:11579 "Frame 1707480444") 커스텀 → 커스텀 TicketTab.css.ts. DS 후보(design-system §3)
  return (
    <div
      className={s.back}
      data-active="true"
      data-keep-open
      data-testid="ticket-back"
      data-state={state}
      aria-busy={!view}
    >
      {!view ? (
        <Spinner size="md" />
      ) : (
        <div className={s.backBody}>
          {pager && (
            <Txt typography="labelMd" color={colors.textPrimary}>
              ({pager})
            </Txt>
          )}
          <BackArt view={view} />
          {ticketNo && (
            <span className={s.ticketNo} data-dim={state === 'ENTERED'}>
              <Txt typography="labelMd" color={colors.white}>
                {ticketNo}
              </Txt>
            </span>
          )}
          <BackMessage view={view} />
        </div>
      )}
    </div>
  );
}

function BackArt({ view }: { view: TicketDetailView }) {
  const { detail, entryQr } = view;
  // 입장 완료는 QR 값이 와도 Figma(`908:16734`)대로 회색 티켓 그림
  if (detail.state !== 'ENTERED' && entryQr.kind === 'qr')
    return <QrCode value={entryQr.value} size={440} label="입장 QR" data-testid="qr-value" />;
  const gift =
    detail.state === 'GIFT_PENDING' ||
    detail.state === 'GIFT_EXPIRED' ||
    detail.state === 'GIFT_SENT';
  return (
    <span className={s.backArt}>
      <Illustration name={gift ? 'gift' : 'no-ticket'} />
    </span>
  );
}

function BackMessage({ view }: { view: TicketDetailView }) {
  const { detail, entryQr } = view;
  if (detail.state === 'ENTERED' || entryQr.kind === 'qr')
    return (
      <Txt as="p" typography="headingMd2Emphasized" color={colors.textPrimary}>
        {detail.state === 'ENTERED' ? '입장 완료 티켓' : '입장 QR을 찍어주세요'}
      </Txt>
    );
  // 선물중은 Figma 문구(`908:16587`), 그 밖(만료·선물 완료·취소·환불·삭제된 공연)은 GUI가 없어 P8-L 안내 문구
  return (
    <p data-testid="qr-notice" data-reason={entryQr.reason}>
      {detail.state === 'GIFT_PENDING' ? (
        <Txt typography="headingMd2Emphasized" color={colors.textPrimary}>
          선물중인 티켓
        </Txt>
      ) : (
        <Txt typography="bodyMd" color={colors.textSecondary}>
          {entryQr.message}
        </Txt>
      )}
    </p>
  );
}
