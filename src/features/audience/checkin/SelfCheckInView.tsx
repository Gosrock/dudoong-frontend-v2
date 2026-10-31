'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { CheckInTicket } from '@/api/check-in/schema';
import type {
  CheckInResultView,
  CheckInTone,
} from '@/features/shared/checkin-result/model/checkin-result';
import { Button } from '@/ui/components/Button/Button';
import { button } from '@/ui/components/Button/Button.css';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { ScreenLoader } from '@/ui/components/Loader/Loader';
import { Radio, RadioGroup } from '@/ui/components/Radio/Radio';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Spacing } from '@/ui/primitives/Spacing';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { SelfCheckInErrorView } from './model/self-check-in-errors';
import { useSelfCheckIn } from './model/useSelfCheckIn';
import * as s from './ui/SelfCheckIn.css';

/** 결과 톤 → DS 아이콘 · 상태 색(호스트 스캔 결과 `ScanResult`와 같은 짝) */
const TONE = {
  success: { icon: 'circle-check', color: colors.statusSuccess },
  warning: { icon: 'circle-request', color: colors.statusWarning },
  error: { icon: 'circle-reject', color: colors.statusError },
} as const satisfies Record<CheckInTone, { icon: string; color: string }>;

/**
 * 셀프 체크인(`/check-in?token=…`, P8c-V) — 디자인 없음(GUI·와이어에 관객 쪽 화면이 없다. 와이어 `424:11976`의
 * "QR 코드를 스캔하면 입장이 완료됩니다"가 입구). DS로만: 확인 중 `ScreenLoader`, 여러 장이면 `Radio` 목록 + [이 티켓으로 입장],
 * 결과·실패는 `EmptyState` 배치(톤 아이콘 + 제목 + 설명) + 티켓 정보 `InfoRow` + [티켓탭으로].
 */
export function SelfCheckInView({ token }: { token: string | null }) {
  const { state, select, retry, submitting } = useSelfCheckIn(token);

  if (state.status === 'checking' && state.candidates === null) {
    return <ScreenLoader label="체크인하는 중" fullScreen />;
  }

  return (
    <main className={s.page}>
      <div className={s.content}>
        {(state.status === 'select' || state.status === 'checking') && (
          <SelectTicket
            candidates={state.candidates ?? []}
            error={state.status === 'select' ? state.error : null}
            submitting={submitting || state.status === 'checking'}
            onSelect={select}
          />
        )}
        {state.status === 'result' && <Result view={state.view} />}
        {state.status === 'error' && <Failure error={state.error} onRetry={retry} />}
      </div>
    </main>
  );
}

function SelectTicket({
  candidates,
  error,
  submitting,
  onSelect,
}: {
  candidates: CheckInTicket[];
  error: SelfCheckInErrorView | null;
  submitting: boolean;
  onSelect: (ticketUuid: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <section aria-label="티켓 고르기">
      <Flex direction="column" gap={2}>
        <Txt as="h1" typography="headingMdEmphasized">
          입장할 티켓을 골라 주세요
        </Txt>
        <Txt as="p" typography="bodyMd" color={colors.textSecondary}>
          이 공연에 입장할 수 있는 내 티켓이 {candidates.length}장 있어요. 고른 티켓은 바로 입장
          처리돼요.
        </Txt>
      </Flex>
      {error && (
        <>
          <Spacing size={4} />
          <div role="alert">
            <Txt as="p" typography="bodyMd" color={colors.statusError}>
              {error.title} — {error.description}
            </Txt>
          </div>
        </>
      )}
      <Spacing size={5} />
      <RadioGroup
        orientation="vertical"
        aria-label="입장할 티켓"
        value={picked ?? ''}
        onValueChange={setPicked}
        disabled={submitting}
      >
        {candidates.map((c) => (
          <Radio
            key={c.ticketUuid ?? c.issuedTicketNo}
            value={c.ticketUuid ?? ''}
            disabled={!c.ticketUuid}
            label={
              <Flex direction="column" gap={1} className={s.candidate}>
                <Txt typography="labelLgEmphasized">{c.ticketName ?? '티켓'}</Txt>
                {c.issuedTicketNo && (
                  <Txt typography="bodySm" color={colors.textSecondary}>
                    {c.issuedTicketNo}
                  </Txt>
                )}
              </Flex>
            }
          />
        ))}
      </RadioGroup>
      <Spacing size={6} />
      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={!picked}
        loading={submitting}
        onClick={() => picked && onSelect(picked)}
      >
        이 티켓으로 입장
      </Button>
    </section>
  );
}

function ToneIcon({ tone }: { tone: CheckInTone }) {
  const t = TONE[tone];
  return <Icon name={t.icon} variant="filled" className={s.toneIcon} style={{ color: t.color }} />;
}

const toTicketTab = (
  <Link href="/tickets" className={button({ variant: 'primary', size: 'lg', fullWidth: true })}>
    티켓탭으로
  </Link>
);

function Result({ view }: { view: Extract<CheckInResultView, { kind: 'result' }> }) {
  return (
    <section aria-label="체크인 결과" data-result={view.result} aria-live="polite">
      <EmptyState
        illustration={<ToneIcon tone={view.tone} />}
        title={
          <span role="heading" aria-level={1}>
            {view.title}
          </span>
        }
        description={view.description}
      />
      {view.ticket && (
        <div className={s.ticket} data-testid="check-in-ticket">
          <InfoRow label="이름" value={view.ticket.ownerName ?? '이름 없음'} />
          {view.ticket.ticketName && <InfoRow label="티켓" value={view.ticket.ticketName} />}
          {view.ticket.issuedTicketNo && (
            <InfoRow label="티켓 번호" value={view.ticket.issuedTicketNo} />
          )}
        </div>
      )}
      <Spacing size={6} />
      {toTicketTab}
    </section>
  );
}

function Failure({ error, onRetry }: { error: SelfCheckInErrorView; onRetry: () => void }) {
  return (
    <section aria-label="체크인 실패" data-error={error.kind} aria-live="assertive">
      <EmptyState
        illustration={<ToneIcon tone="error" />}
        title={
          <span role="heading" aria-level={1}>
            {error.title}
          </span>
        }
        description={error.description}
      />
      <Spacing size={6} />
      <Flex direction="column" gap={3} fullWidth>
        {error.canRetry && (
          <Button variant="primary" size="lg" fullWidth onClick={onRetry}>
            다시 시도
          </Button>
        )}
        {error.canRetry ? (
          <Link
            href="/tickets"
            className={button({ variant: 'secondary', size: 'lg', fullWidth: true })}
          >
            티켓탭으로
          </Link>
        ) : (
          toTicketTab
        )}
      </Flex>
    </section>
  );
}
