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
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
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
  const { state, start, select, retry, submitting } = useSelfCheckIn(token);

  if (state.status === 'checking' && state.candidates === null) {
    return <ScreenLoader label="체크인하는 중" fullScreen />;
  }

  return (
    <main className={s.page}>
      <div className={s.content}>
        {state.status === 'ready' && <Ready onStart={start} />}
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
  // 고른 티켓을 한 번 더 확인한다 — 입장 처리는 되돌릴 수 없다(이슈 #106 §6, 디자인 없음 → DS EasyOverlay confirm)
  const confirmPick = async () => {
    const ticket = candidates.find((c) => c.ticketUuid === picked);
    if (!picked || !ticket) return;
    const name = [ticket.ticketName ?? '티켓', ticket.issuedTicketNo].filter(Boolean).join(' · ');
    const ok = await openConfirm({
      title: '이 티켓으로 입장할까요?',
      description: (
        <>
          {name}
          <br />
          입장 처리는 되돌릴 수 없어요.
        </>
      ),
      confirmLabel: '입장하기',
    });
    if (ok) onSelect(picked);
  };
  return (
    <section aria-label="티켓 고르기">
      <Flex direction="column" gap={2}>
        <Txt as="h1" typography="headingMdEmphasized">
          입장할 티켓을 골라 주세요
        </Txt>
        <Txt as="p" typography="bodyMd" color={colors.textSecondary}>
          이 공연에 입장할 수 있는 내 티켓이 {candidates.length}장 있어요. 회차·좌석이 다른 티켓이
          있다면 티켓 이름을 확인하고 골라 주세요.
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
        onClick={() => void confirmPick()}
      >
        이 티켓으로 입장
      </Button>
    </section>
  );
}

/**
 * 확인 단계(이슈 #106 §6) — QR을 스캔하고 들어오면 바로 입장 처리하지 않고 [입장하기]를 누르게 한다.
 * 디자인 없음 — DS EmptyState 배치 + 버튼. 문구는 🤖 Claude 판단(2026-11-02)
 */
function Ready({ onStart }: { onStart: () => void }) {
  return (
    <section aria-label="입장 확인">
      <EmptyState
        illustration={<Icon name="qr" className={s.toneIcon} />}
        title={
          <span role="heading" aria-level={1}>
            공연장 입구에서 입장해 주세요
          </span>
        }
        description="[입장하기]를 누르면 내 티켓이 바로 입장 처리돼요. 입장 처리는 되돌릴 수 없어요."
      />
      <Spacing size={6} />
      <Flex direction="column" gap={3} fullWidth>
        <Button variant="primary" size="lg" fullWidth onClick={onStart}>
          입장하기
        </Button>
        <Link
          href="/tickets"
          className={button({ variant: 'secondary', size: 'lg', fullWidth: true })}
        >
          티켓탭으로
        </Link>
      </Flex>
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
