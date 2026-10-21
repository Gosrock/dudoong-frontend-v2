'use client';

import Link from 'next/link';

import { useSelfCheckIn } from './model/useSelfCheckIn';

/**
 * 셀프 체크인(`/check-in?token=…`) — 스타일 없는 최소 마크업(P8c-L). 후보 선택·결과 화면은 P8c-V.
 */
export function SelfCheckInView({ token }: { token: string | null }) {
  const { state, select, retry, submitting } = useSelfCheckIn(token);
  return (
    <main>
      {state.status === 'checking' && <p aria-busy="true">체크인하는 중</p>}
      {state.status === 'select' && (
        <section aria-label="티켓 고르기">
          <h1>입장할 티켓을 골라 주세요</h1>
          {state.error && <p role="alert">{state.error.title}</p>}
          <ul>
            {state.candidates.map((c) => (
              <li key={c.ticketUuid ?? c.issuedTicketNo}>
                <button
                  type="button"
                  disabled={submitting || !c.ticketUuid}
                  onClick={() => c.ticketUuid && select(c.ticketUuid)}
                >
                  {c.ticketName} {c.issuedTicketNo}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {state.status === 'result' && (
        <section aria-label="체크인 결과" data-result={state.view.result}>
          <h1>{state.view.title}</h1>
          {state.view.description && <p>{state.view.description}</p>}
          {state.view.ticket && (
            <p>
              {state.view.ticket.ownerName} · {state.view.ticket.ticketName}
            </p>
          )}
          <Link href="/tickets">티켓탭으로</Link>
        </section>
      )}
      {state.status === 'error' && (
        <section aria-label="체크인 실패" data-error={state.error.kind}>
          <h1>{state.error.title}</h1>
          <p>{state.error.description}</p>
          {state.error.canRetry && (
            <button type="button" onClick={retry}>
              다시 시도
            </button>
          )}
        </section>
      )}
    </main>
  );
}
