'use client';

import { Button } from '@/ui/components/Button/Button';
import { Spinner } from '@/ui/components/Loader/Loader';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { hostScanCard, type ScanCard } from '../model/scan-card';
import type { HostScanState } from '../model/useHostScan';
import * as s from './QrCheckIn.css';
import { SCAN_TONE } from './scan-tone';

type Props = {
  state: HostScanState;
  onRetry: () => void;
  onNext: () => void;
  fullscreen?: boolean;
};

/**
 * [호스트가 QR 스캔] 판독 결과 카드 — 카메라 위 아래쪽에 겹친다(GUI `QR 결과 카드` `1362:1295`, 10종은 `scan-card.ts` 표).
 * 카메라는 멈추지 않는다 — 다음 티켓을 비추면 결과가 바뀐다. [다음 스캔]은 결과를 지우고, [다시 시도]는 마지막 요청을 다시 보낸다.
 * 기다림(`idle`)에는 카드가 없다(안내 알약은 `HostScan`이 그린다).
 */
export function ScanResult({ state, onRetry, onNext, fullscreen }: Props) {
  const card = hostScanCard(state);
  return (
    <section
      aria-label="스캔 결과"
      aria-live="polite"
      data-status={state.status}
      data-result={state.status === 'result' ? state.view.result : undefined}
      data-card={card?.kind}
      className={fullscreen ? `${s.resultDock} ${s.resultDockFullscreen}` : s.resultDock}
    >
      {card && <ResultCard card={card} onRetry={onRetry} onNext={onNext} />}
    </section>
  );
}

function ResultCard({
  card,
  onRetry,
  onNext,
}: {
  card: ScanCard;
  onRetry: () => void;
  onNext: () => void;
}) {
  const alert = card.tone === 'error';
  return (
    <div className={s.resultCard} data-tone={card.tone} role={alert ? 'alert' : undefined}>
      <div className={s.resultHead}>
        {card.tone === 'checking' ? (
          <span className={s.checkingSpinner}>
            <Spinner size="md" />
          </span>
        ) : (
          <span
            className={s.toneIcon}
            data-size="32"
            style={{ color: SCAN_TONE[card.tone].color }}
            aria-hidden
          >
            <Icon name={SCAN_TONE[card.tone].icon} variant="filled" />
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
        <dl className={s.ticketList} data-testid="scan-ticket">
          <TicketRow label="이름" value={card.ticket.ownerName ?? '이름 없음'} />
          {card.ticket.ticketName && <TicketRow label="티켓" value={card.ticket.ticketName} />}
          {card.ticket.issuedTicketNo && (
            <TicketRow label="티켓 번호" value={card.ticket.issuedTicketNo} />
          )}
        </dl>
      )}
      {card.action === 'retry' && (
        <Button variant="primary" size="md" fullWidth onClick={onRetry}>
          다시 시도
        </Button>
      )}
      {card.action === 'next' && (
        <Button variant="primary" size="md" fullWidth onClick={onNext}>
          다음 스캔
        </Button>
      )}
    </div>
  );
}

function TicketRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>
        <Txt typography="bodyMd">{label}</Txt>
      </dt>
      <dd>
        <Txt typography="bodyMd">{value}</Txt>
      </dd>
    </>
  );
}
