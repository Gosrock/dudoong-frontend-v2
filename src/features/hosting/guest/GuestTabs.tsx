'use client';

import { useIssuedTicketList } from './model/useIssuedTicketList';
import { useRefundList } from './model/useRefundList';

/** 페이지 번호(운영 표 — patterns §12). 모양은 V */
export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number | null;
  onPage: (page: number) => void;
}) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <nav aria-label="페이지">
      {Array.from({ length: totalPages }, (_, i) => (
        <button key={i} type="button" aria-current={i === page} onClick={() => onPage(i)}>
          {i + 1}
        </button>
      ))}
    </nav>
  );
}

/** 발급된 티켓 탭(GI-1 · GI-2 · GI-3) — 스타일 없는 최소 마크업(P13a-L) */
export function IssuedTicketsTab({ eventId }: { eventId: string }) {
  const l = useIssuedTicketList(eventId);
  return (
    <div role="tabpanel" aria-label="발급된 티켓">
      <div role="group" aria-label="입장 상태">
        {l.entranceFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={f.selected}
            onClick={() => l.setEntrance(f.key)}
          >
            {f.label} {f.count ?? ''}
          </button>
        ))}
      </div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          l.submitSearch();
        }}
      >
        <label>
          티켓 검색 기준
          <select
            value={l.searchType}
            onChange={(e) => l.setSearchType(e.target.value as typeof l.searchType)}
          >
            {l.searchTypes.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          티켓 검색어
          <input
            value={l.keywordInput}
            maxLength={l.keywordMax}
            onChange={(e) => l.setKeywordInput(e.target.value)}
          />
        </label>
        <button type="submit">검색</button>
        {l.exactMatchHint && <p data-testid="exact-hint">{l.exactMatchHint}</p>}
      </form>
      {l.canExport && (
        <button type="button" disabled={l.exporting} onClick={() => void l.exportExcel()}>
          티켓 엑셀 받기
        </button>
      )}
      {l.exportError && <p role="alert">{l.exportError}</p>}
      {l.missingNotice && <p role="alert">{l.missingNotice}</p>}
      {l.status === 'error' && (
        <p role="alert">
          티켓을 불러오지 못했어요{' '}
          <button type="button" onClick={l.retry}>
            다시 시도
          </button>
        </p>
      )}
      {l.empty && <p data-testid="tickets-empty">발급된 티켓이 없어요</p>}
      <table aria-label="발급 티켓 목록">
        <tbody>
          {l.rows.map((t) => (
            <tr key={t.ticketUuid ?? t.issuedTicketNo} data-testid="ticket-row">
              <td>{t.issuedTicketNo}</td>
              <td>{t.ticketName}</td>
              <td>{t.buyerName}</td>
              <td data-testid="ticket-owner">{t.ownerName}</td>
              <td>{t.giftState}</td>
              <td data-testid="ticket-entrance">{t.entrance}</td>
              <td>
                {t.ticketUuid && (
                  <button type="button" onClick={() => l.openTicket(t.ticketUuid!)}>
                    상세
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={l.page} totalPages={l.totalPages} onPage={l.setPage} />
      {l.selectedTicketUuid && (
        <section aria-label="티켓 상세" data-testid="ticket-detail">
          <button type="button" onClick={l.closeTicket}>
            닫기
          </button>
          {l.detail && (
            <>
              <h2>{l.detail.ticket.issuedTicketNo}</h2>
              <p data-testid="ticket-detail-phones">
                {l.detail.buyerPhone} / {l.detail.ownerPhone}
              </p>
            </>
          )}
        </section>
      )}
    </div>
  );
}

/** 환불 탭(GF-1 · PF-2) — Figma 없음(Q32), 스타일 없는 최소 마크업 */
export function RefundsTab({ eventId }: { eventId: string }) {
  const l = useRefundList(eventId);
  return (
    <div role="tabpanel" aria-label="환불">
      <div role="group" aria-label="환불 상태">
        {l.filters.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={f.selected}
            onClick={() => l.setStatus(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {l.actionError && <p role="alert">{l.actionError}</p>}
      {l.status === 'error' && (
        <p role="alert">
          환불 목록을 불러오지 못했어요{' '}
          <button type="button" onClick={l.retry}>
            다시 시도
          </button>
        </p>
      )}
      {l.empty && <p data-testid="refunds-empty">환불 요청이 없어요</p>}
      <table aria-label="환불 목록">
        <tbody>
          {l.rows.map(({ refund: r, canComplete }) => (
            <tr key={r.orderUuid ?? r.orderNo} data-testid="refund-row">
              <td>{r.orderNo}</td>
              <td>{r.buyerName}</td>
              <td>{r.totalAmount.toLocaleString('ko-KR')}원</td>
              <td data-testid="refund-status">{r.refundStatus}</td>
              <td data-testid="refund-account">
                {l.canSeeRefundAccount && r.refundAccount
                  ? `${r.refundAccount.bankName} ${r.refundAccount.accountNumber}`
                  : ''}
              </td>
              <td>
                {canComplete && (
                  <button
                    type="button"
                    disabled={l.pendingUuid !== null}
                    onClick={() => void l.complete(r.orderUuid!)}
                  >
                    환불 완료
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={l.page} totalPages={l.totalPages} onPage={l.setPage} />
    </div>
  );
}
