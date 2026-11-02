'use client';

import { useId, useState } from 'react';

import { CHECK_IN_TICKET_NO_MAX } from '@/api/check-in/schema';
import { Button } from '@/ui/components/Button/Button';
import { Input } from '@/ui/components/Input/Input';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { useTicketNoCheckIn } from '../model/useTicketNoCheckIn';
import * as s from './QrCheckIn.css';

const TONE_ICON = {
  success: { icon: 'circle-check', color: colors.statusSuccess },
  warning: { icon: 'circle-request', color: colors.statusWarning },
  error: { icon: 'circle-reject', color: colors.statusError },
} as const;

/**
 * 티켓 번호로 입장 처리(PQ-2b — 백엔드 #926, 이슈 #93 §5). [호스트가 QR 스캔] 카메라 아래에 둔다.
 * FIGMA-CUSTOM: 디자인 없음 — DS Input + Button, 결과는 QR 스캔 결과 카드와 같은 모양. 🤖 Claude 판단(2026-11-02), design-requests Q99. Figma 코멘트 2026-11-02(wire 424:11941).
 * 번호는 QR과 달리 추측할 수 있어(서버 요청) 입장 처리 뒤 **관객 이름(`ownerName`)을 크게** 보이고 확인을 부탁한다.
 */
export function TicketNoCheckIn({ eventId }: { eventId: string }) {
  const t = useTicketNoCheckIn(eventId);
  const [value, setValue] = useState('');
  const titleId = useId();
  if (t.blocked) return null;
  const st = t.state;
  return (
    <section aria-labelledby={titleId} className={s.ticketNoBox} data-testid="ticket-no-check-in">
      <Txt as="h2" typography="labelLgEmphasized" color={colors.textPrimaryLabel}>
        <span id={titleId}>티켓 번호로 입장</span>
      </Txt>
      <form
        className={s.ticketNoForm}
        onSubmit={(e) => {
          e.preventDefault();
          if (t.submit(value)) setValue('');
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
          error={st.status === 'invalid' ? st.message : undefined}
          className={s.ticketNoInput}
        />
        <Button type="submit" variant="primary" size="md" loading={t.checking}>
          입장 처리
        </Button>
      </form>
      <Txt typography="labelSm" color={colors.textTertiaryLabel}>
        카메라를 쓸 수 없을 때 관객 티켓의 번호를 입력해요. 숫자만 입력해도 돼요.
      </Txt>
      <TicketNoResult state={st} onRetry={t.retry} />
    </section>
  );
}

function TicketNoResult({
  state,
  onRetry,
}: {
  state: ReturnType<typeof useTicketNoCheckIn>['state'];
  onRetry: () => void;
}) {
  if (state.status === 'result') {
    const { view } = state;
    const tone = TONE_ICON[view.tone];
    const name = view.ticket?.ownerName ?? null;
    return (
      <div
        className={s.ticketNoResult}
        aria-live="polite"
        data-testid="ticket-no-result"
        data-result={view.result}
      >
        <Flex align="center" gap={2}>
          <span className={s.toneIcon} style={{ color: tone.color }} aria-hidden>
            <Icon name={tone.icon} variant="filled" />
          </span>
          <Txt as="p" typography="headingSmEmphasized">
            {view.title}
          </Txt>
        </Flex>
        {view.description && (
          <Txt as="p" typography="bodyMd" color={colors.textSecondary}>
            {view.description}
          </Txt>
        )}
        {view.ticket && (
          <Flex direction="column" gap={1}>
            <Txt typography="labelMd" color={colors.textSecondary}>
              관객 이름 — 본인이 맞는지 확인해 주세요
            </Txt>
            <Txt typography="headingXl">
              <span data-testid="ticket-no-owner">{name ?? '이름 없음'}</span>
            </Txt>
            <Txt typography="labelMd" color={colors.textSecondary}>
              {[view.ticket.ticketName, view.ticket.issuedTicketNo].filter(Boolean).join(' · ')}
            </Txt>
          </Flex>
        )}
      </div>
    );
  }
  if (state.status === 'eventNotCheckable' || state.status === 'failed') {
    const message = state.status === 'failed' ? state.failure.message : state.message;
    const canRetry = state.status === 'failed' && state.failure.canRetry;
    return (
      <div className={s.ticketNoResult} role="alert" data-testid="ticket-no-result">
        <Txt as="p" typography="bodyMd" color={colors.textDangerLabel}>
          {message}
        </Txt>
        {canRetry && (
          <Flex justify="flex-end">
            <Button variant="secondary" size="sm" onClick={onRetry}>
              다시 시도
            </Button>
          </Flex>
        )}
      </div>
    );
  }
  return null;
}
