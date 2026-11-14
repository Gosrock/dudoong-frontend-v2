'use client';

import { useId, useState } from 'react';

import { CHECK_IN_TICKET_NO_MAX } from '@/api/check-in/schema';
import { Button } from '@/ui/components/Button/Button';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { Input } from '@/ui/components/Input/Input';
import { toast } from '@/ui/components/Toast/Toast';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { type ScanCard, ticketNoCard } from '../model/scan-card';
import {
  CANCEL_ENTRANCE_CONFIRM,
  CANCEL_ENTRANCE_DONE_MESSAGE,
  useTicketNoCheckIn,
} from '../model/useTicketNoCheckIn';
import * as s from './QrCheckIn.css';
import { SCAN_TONE } from './scan-tone';

/**
 * 티켓 번호로 입장 처리(PQ-2b — 백엔드 #926). [호스트가 QR 스캔] 카메라 아래, 구분선 뒤(GUI `1360:13509` — #221~#224).
 * 모바일은 제목 · 입력 줄 · 도움말 · 결과 카드가 위에서 아래로, PC는 왼쪽 480에 입력, 오른쪽에 카드(`1368:5083`).
 * 처리 중은 [입장 처리] 스피너(`1368:4991`), 결과는 `티켓 번호 결과 카드`(`1368:4838`) — 결과가 있으면 도움말을 내린다.
 * 번호는 QR과 달리 추측할 수 있어(서버 요청) 관객 이름(`ownerName`)을 크게 보이고 "본인이 맞는지 확인해 주세요".
 * 입장 완료 카드의 [입장 취소](매니저 이상)는 확인 창 → 취소 → 토스트(`1372:18887` · `1372:19151`).
 */
export function TicketNoCheckIn({ eventId }: { eventId: string }) {
  const ticketNo = useTicketNoCheckIn(eventId);
  const [value, setValue] = useState('');
  const titleId = useId();
  if (ticketNo.blocked) return null;
  const st = ticketNo.state;
  const card = ticketNoCard(st);
  const invalid = st.status === 'invalid' ? st.message : undefined;
  const { entranceCancel } = ticketNo;

  const cancelEntrance = async () => {
    let message: string | null = null;
    // 확인 창 계약(patterns §6): 실패(`false`)면 열린 채, 처리됐거나 상태가 이미 바뀌었으면 닫는다
    const ok = await openConfirm({
      ...CANCEL_ENTRANCE_CONFIRM,
      onConfirm: async () => {
        const out = await entranceCancel.run();
        if (out.kind === 'failed') return false;
        message = out.kind === 'done' ? CANCEL_ENTRANCE_DONE_MESSAGE : out.message;
        return true;
      },
    });
    if (ok && message) toast(message);
  };

  return (
    <section aria-labelledby={titleId} className={s.ticketNoBox} data-testid="ticket-no-check-in">
      <div className={s.ticketNoFormCol}>
        <Txt as="h2" typography="headingSmEmphasized" color={colors.textPrimaryLabel}>
          <span id={titleId}>티켓 번호로 입장</span>
        </Txt>
        <form
          className={s.ticketNoForm}
          onSubmit={(e) => {
            e.preventDefault();
            if (ticketNo.submit(value)) setValue('');
          }}
          noValidate
        >
          <Input
            aria-labelledby={titleId}
            placeholder="예: T1000118"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            maxLength={CHECK_IN_TICKET_NO_MAX}
            showCount={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={invalid}
            className={s.ticketNoInput}
          />
          <Button type="submit" variant="primary" size="md" loading={ticketNo.checking}>
            입장 처리
          </Button>
        </form>
        {!card && !invalid && (
          <Txt typography="labelSm" color={colors.textSecondary}>
            카메라를 쓸 수 없을 때 티켓의 번호를 입력해요. 숫자만 입력해도 돼요.
          </Txt>
        )}
      </div>
      {card && (
        <TicketNoResultCard
          card={card}
          canCancel={card.kind === 'entered' && entranceCancel.can}
          onCancel={() => void cancelEntrance()}
        />
      )}
    </section>
  );
}

/** `티켓 번호 결과 카드`(`1368:4838`) — 머리(아이콘 24 · 제목 · 설명) → 관객 정보(번호 · 이름 크게 · 티켓) → [입장 취소] */
function TicketNoResultCard({
  card,
  canCancel,
  onCancel,
}: {
  card: ScanCard;
  canCancel: boolean;
  onCancel: () => void;
}) {
  const tone = card.tone === 'checking' ? null : SCAN_TONE[card.tone];
  const alert = card.tone === 'error';
  return (
    <div
      className={s.ticketNoCard}
      aria-live={alert ? undefined : 'polite'}
      role={alert ? 'alert' : undefined}
      data-testid="ticket-no-result"
      data-card={card.kind}
      data-result={card.cause}
    >
      <div className={s.ticketNoHead}>
        {tone && (
          <span className={s.toneIcon} style={{ color: tone.color }} aria-hidden>
            <Icon name={tone.icon} variant="filled" />
          </span>
        )}
        <div>
          <Txt as="p" typography="headingMd2Emphasized">
            {card.title}
          </Txt>
          {card.description && (
            <Txt as="p" typography="bodyMd" color={colors.textSecondary}>
              {card.description}
            </Txt>
          )}
        </div>
      </div>
      {card.ticket && (
        <div className={s.ticketNoOwner}>
          {card.ticket.issuedTicketNo && (
            <Txt typography="labelSm" color={colors.textSecondary}>
              {card.ticket.issuedTicketNo}
            </Txt>
          )}
          <Txt typography="headingLgEmphasized">
            <span data-testid="ticket-no-owner">{card.ticket.ownerName ?? '이름 없음'}</span>
          </Txt>
          {card.ticket.ticketName && (
            <Txt typography="bodyMd" color={colors.textSecondary}>
              {card.ticket.ticketName}
            </Txt>
          )}
        </div>
      )}
      {canCancel && (
        <div className={s.ticketNoFoot}>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            입장 취소
          </Button>
        </div>
      )}
    </div>
  );
}
