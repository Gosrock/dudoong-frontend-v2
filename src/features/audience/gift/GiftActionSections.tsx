'use client';

import { useState } from 'react';

import type { MyTicketDetail } from '@/api/my-ticket/schema';

import { useGiftLink, useSendGift } from './model/useGiftActions';

/**
 * 선물 보내기 · 링크 생성 완료(메모·공유) — 스타일 없는 최소 마크업(P8b-L). 바텀시트(`528:14520`)·공유 버튼은 P8b-V.
 */
export function SendGiftSection({
  ticketUuid,
  detail,
}: {
  ticketUuid: string;
  detail: MyTicketDetail;
}) {
  const send = useSendGift(ticketUuid);
  const [memo, setMemo] = useState('');
  if (send.link) {
    return (
      <GiftLinkSection
        giftId={send.link.giftId}
        linkPath={send.link.linkPath}
        memo={send.link.memo}
        detail={detail}
      />
    );
  }
  return (
    <form
      aria-label="선물하기"
      onSubmit={(e) => {
        e.preventDefault();
        void send.send(memo);
      }}
    >
      <label>
        메모
        <input value={memo} onChange={(e) => setMemo(e.target.value)} />
      </label>
      {send.error && <p role="alert">{send.error.message}</p>}
      <button type="submit" disabled={send.pending}>
        선물하기
      </button>
    </form>
  );
}

export function GiftLinkSection({
  giftId,
  linkPath,
  memo,
  detail,
}: {
  giftId: number;
  linkPath: string;
  memo: string | null;
  detail: MyTicketDetail;
}) {
  const link = useGiftLink({
    giftId,
    linkPath,
    memo,
    eventName: detail.event?.name ?? null,
    posterImageUrl: detail.event?.posterImageUrl ?? null,
    ticketName: detail.ticketName,
    ticketUuid: detail.ticketUuid,
  });
  const [draft, setDraft] = useState(memo ?? '');
  return (
    <section aria-label="선물 링크">
      <p data-testid="gift-link">{link.share.url}</p>
      <a href={link.share.smsHref}>메세지</a>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void link.saveMemo(draft);
        }}
      >
        <label>
          선물 메모
          <input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={link.closed} />
        </label>
        <button type="submit" disabled={link.savingMemo || link.closed}>
          메모 저장
        </button>
      </form>
      {link.error && <p role="alert">{link.error.message}</p>}
    </section>
  );
}
