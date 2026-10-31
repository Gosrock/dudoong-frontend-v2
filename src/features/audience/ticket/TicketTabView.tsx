'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { isSessionLost } from '@/api/errors';
import { GiftLinkSection, SendGiftSection } from '@/features/audience/gift/GiftActionSections';
import { useCancelGift, useReturnGift } from '@/features/audience/gift/model/useGiftActions';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';

import type { TicketTarget } from './model/my-ticket-state';
import { useTicketDetail } from './model/useTicketDetail';
import { useTicketTab } from './model/useTicketTab';

/**
 * 티켓탭(`/tickets`) — 스타일 없는 최소 마크업(P8-L). 캐러셀·공지 바·QR 렌더(`qr-code-styling`)·전체화면은 P8-V에서 이 훅들에 붙인다.
 * 지금은 QR 자리에 값(`qrValue`)을 글자로 둔다.
 */
export function TicketTabView() {
  return (
    <main>
      <h1>내 티켓</h1>
      <AsyncBoundary holdOn={isSessionLost}>
        <TicketTabContent />
      </AsyncBoundary>
    </main>
  );
}

function TicketTabContent() {
  const tab = useTicketTab();
  const [open, setOpen] = useState<TicketTarget | null>(null);
  return (
    <>
      {tab.notice.show && (
        <p role="status">
          NEW 티켓 주문이 승인되었습니다!
          {tab.notice.targetGroupKey && (
            <a href={`#group-${tab.notice.targetGroupKey}`}>티켓 보러가기</a>
          )}
        </p>
      )}
      <p>{tab.sortLabel}</p>
      {tab.empty && <p>아직 티켓이 없어요</p>}
      <ul>
        {tab.groups.map((g) => {
          const current = tab.selectedTicket(g.key);
          const target = current ? tab.targetOf(current) : null;
          return (
            <li key={g.key} id={`group-${g.key}`} data-testid="ticket-group">
              <h2>{g.group.event?.name ?? '삭제된 공연'}</h2>
              <p>{g.group.ticketName}</p>
              <ul aria-label="상태별 개수">
                {g.counts.map((c) => (
                  <li key={c.state}>
                    {c.label} {c.count}
                  </li>
                ))}
              </ul>
              {g.orderHref && <Link href={g.orderHref}>주문상세</Link>}
              {!g.orderOnly && (
                <p>
                  <button
                    type="button"
                    onClick={() => tab.select(g.key, tab.selectedIndex(g.key) - 1)}
                  >
                    이전 티켓
                  </button>
                  <span>{tab.pager(g.key)}</span>
                  <button
                    type="button"
                    onClick={() => tab.select(g.key, tab.selectedIndex(g.key) + 1)}
                  >
                    다음 티켓
                  </button>
                </p>
              )}
              {current && (
                <p>
                  {current.issuedTicketNo}
                  {target && (
                    <button type="button" onClick={() => setOpen(target)}>
                      티켓 열기
                    </button>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {open && (
        <AsyncBoundary holdOn={isSessionLost}>
          <TicketDetailSection target={open} onClose={() => setOpen(null)} />
        </AsyncBoundary>
      )}
    </>
  );
}

function TicketDetailSection({ target, onClose }: { target: TicketTarget; onClose: () => void }) {
  const state = useTicketDetail(target);
  useEffect(() => {
    if (state.status === 'gone') onClose();
  }, [state.status, onClose]);
  if (state.status !== 'ready') return <p>불러오는 중</p>;
  const { detail, stateView, entryQr, pendingGift } = state;
  return (
    <section aria-label="티켓 상세">
      <h2>{detail.ticketName}</h2>
      <p data-testid="ticket-state">{stateView.label}</p>
      {entryQr.kind === 'qr' ? (
        <p data-testid="qr-value">{entryQr.value}</p>
      ) : (
        <p data-testid="qr-notice">{entryQr.message}</p>
      )}
      {state.orderHref && <Link href={state.orderHref}>주문상세</Link>}
      {state.canGift && detail.ticketUuid && (
        <SendGiftSection ticketUuid={detail.ticketUuid} detail={detail} />
      )}
      {pendingGift?.linkPath && (
        <GiftLinkSection
          giftId={pendingGift.giftId}
          linkPath={pendingGift.linkPath}
          memo={pendingGift.memo}
          detail={detail}
        />
      )}
      {pendingGift && (
        <CancelGiftButton giftId={pendingGift.giftId} ticketUuid={detail.ticketUuid} />
      )}
      {state.canReturn && detail.ticketUuid && (
        <ReturnGiftButton ticketUuid={detail.ticketUuid} onDone={onClose} />
      )}
      <button type="button" onClick={onClose}>
        닫기
      </button>
    </section>
  );
}

function CancelGiftButton({ giftId, ticketUuid }: { giftId: number; ticketUuid: string | null }) {
  const cancel = useCancelGift(giftId, { ticketUuid });
  return (
    <>
      <button type="button" disabled={cancel.pending} onClick={() => void cancel.cancel()}>
        선물 취소
      </button>
      {cancel.error && <p role="alert">{cancel.error.message}</p>}
    </>
  );
}

function ReturnGiftButton({ ticketUuid, onDone }: { ticketUuid: string; onDone: () => void }) {
  const giveBack = useReturnGift(ticketUuid);
  useEffect(() => {
    if (giveBack.done || giveBack.gone) onDone();
  }, [giveBack.done, giveBack.gone, onDone]);
  return (
    <>
      <button type="button" disabled={giveBack.pending} onClick={() => void giveBack.giveBack()}>
        선물 반환
      </button>
      {giveBack.error && <p role="alert">{giveBack.error.message}</p>}
    </>
  );
}
