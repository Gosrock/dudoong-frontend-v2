'use client';

import { useState } from 'react';

import { isSessionLost } from '@/api/errors';
import { HostingAccessRejected } from '@/features/hosting/access/HostingAccessRejected';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';

import { useCheckInStats } from './model/useCheckInStats';
import { useHostScan } from './model/useHostScan';
import { useSelfCheckInQr } from './model/useSelfCheckInQr';

type Mode = 'host' | 'audience';

/**
 * `/hosting/events/[eventId]/qr` QR 체크인 — 스타일 없는 최소 마크업(P13b-L). 카메라 스캐너(`@yudiel/react-qr-scanner`)·
 * 권한 거부 화면·결과 화면·QR 그림·전체화면은 P13b-V. 스캐너 대신 글자 입력이 `submitScan`을 부르고, QR 대신 주소 글자를 보인다.
 */
export function QrCheckInView({ eventId }: { eventId: string }) {
  return (
    <AsyncBoundary holdOn={isSessionLost} rejected={HostingAccessRejected} resetKeys={[eventId]}>
      <QrCheckIn eventId={eventId} />
    </AsyncBoundary>
  );
}

function QrCheckIn({ eventId }: { eventId: string }) {
  const [mode, setMode] = useState<Mode>('host');
  return (
    <section aria-labelledby="qr-title">
      <h1 id="qr-title">QR 체크인</h1>
      <CheckInStats eventId={eventId} />
      <div role="group" aria-label="체크인 방식">
        <button type="button" aria-pressed={mode === 'host'} onClick={() => setMode('host')}>
          호스트가 스캔
        </button>
        <button
          type="button"
          aria-pressed={mode === 'audience'}
          onClick={() => setMode('audience')}
        >
          관객이 스캔
        </button>
      </div>
      {mode === 'host' ? <HostScan eventId={eventId} /> : <AudienceScan eventId={eventId} />}
    </section>
  );
}

function CheckInStats({ eventId }: { eventId: string }) {
  const s = useCheckInStats(eventId);
  return (
    <section aria-label="체크인 통계" data-testid="checkin-stats">
      {s.status === 'error' && (
        <p role="alert">
          통계를 불러오지 못했어요{' '}
          <button type="button" onClick={s.retry}>
            통계 다시 시도
          </button>
        </p>
      )}
      {s.stats && (
        <p data-testid="checkin-stats-value">
          입장 {s.stats.enteredCount}/{s.stats.issuedCount} · 미입장 {s.stats.notEnteredCount} ·{' '}
          {s.stats.entranceRate}%
        </p>
      )}
      {s.refreshFailed && <p data-testid="checkin-stats-stale">통계를 새로 고치지 못했어요</p>}
    </section>
  );
}

function HostScan({ eventId }: { eventId: string }) {
  const h = useHostScan(eventId);
  const [value, setValue] = useState('');
  const { state } = h;
  if (h.blockMessage) {
    return (
      <p role="status" data-testid="host-scan-blocked">
        {h.blockMessage}
      </p>
    );
  }
  return (
    <div data-testid="host-scan">
      <form
        aria-label="스캔 입력"
        onSubmit={(e) => {
          e.preventDefault();
          h.submitScan(value);
          setValue('');
        }}
      >
        <label>
          티켓 QR 값
          <input value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <button type="submit">스캔</button>
      </form>
      <section
        aria-label="스캔 결과"
        data-status={state.status}
        data-result={state.status === 'result' ? state.view.result : undefined}
      >
        {state.status === 'checking' && <p>확인하는 중</p>}
        {state.status === 'result' && (
          <>
            <p data-tone={state.view.tone}>{state.view.title}</p>
            {state.view.description && <p>{state.view.description}</p>}
            {state.view.ticket && (
              <p data-testid="scan-ticket">
                {state.view.ticket.ownerName ?? '이름 없음'} · {state.view.ticket.ticketName}
              </p>
            )}
          </>
        )}
        {state.status === 'invalidQr' && <p>티켓 QR이 아니에요</p>}
        {state.status === 'eventNotCheckable' && <p role="alert">{state.message}</p>}
        {state.status === 'failed' && (
          <p role="alert">
            {state.failure.message}
            {state.failure.canRetry && (
              <button type="button" onClick={h.retry}>
                다시 시도
              </button>
            )}
          </p>
        )}
        {state.status !== 'idle' && state.status !== 'checking' && (
          <button type="button" onClick={h.reset}>
            다음 스캔
          </button>
        )}
      </section>
    </div>
  );
}

function AudienceScan({ eventId }: { eventId: string }) {
  const q = useSelfCheckInQr(eventId);
  return (
    <section aria-label="셀프 체크인 QR" data-status={q.status}>
      {q.guidance && (
        <p role="status" data-testid="self-check-in-guidance">
          {q.guidance}
        </p>
      )}
      {q.hint && <p>{q.hint}</p>}
      {q.status === 'pending' && <p>불러오는 중</p>}
      {q.status === 'error' && (
        <p role="alert">
          QR을 불러오지 못했어요{' '}
          <button type="button" onClick={q.retry}>
            QR 다시 시도
          </button>
        </p>
      )}
      {q.qrUrl && <p data-testid="self-check-in-url">{q.qrUrl}</p>}
    </section>
  );
}
