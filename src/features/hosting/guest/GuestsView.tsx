'use client';

import { isSessionLost } from '@/api/errors';
import { HostingAccessRejected } from '@/features/hosting/access/HostingAccessRejected';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';

import { IssuedTicketsTab, Pager, RefundsTab } from './GuestTabs';
import { GUEST_TABS, REFUSE_REASON_OPTIONS } from './model/guest-rules';
import { useGuestsUrlState } from './model/useGuestsUrlState';
import { useOrderDetail } from './model/useOrderDetail';
import { useOrderList } from './model/useOrderList';

/**
 * `/hosting/events/[eventId]/guests` 예매자 관리 — 스타일 없는 최소 마크업(P13a-L). 탭·표(DataTable)·거절 사유 시트·확인 팝업·
 * 주문/티켓 상세 모달·엑셀 버튼 모양은 P13a-V. 주문 상세는 `?order=`를 보고 페이지가 선언적으로 그린다(patterns §6).
 */
export function GuestsView({ eventId }: { eventId: string }) {
  return (
    <AsyncBoundary holdOn={isSessionLost} rejected={HostingAccessRejected} resetKeys={[eventId]}>
      <Guests eventId={eventId} />
    </AsyncBoundary>
  );
}

function Guests({ eventId }: { eventId: string }) {
  const url = useGuestsUrlState();
  return (
    <section aria-labelledby="guests-title">
      <h1 id="guests-title">예매자 관리</h1>
      <div role="tablist" aria-label="예매자 관리 탭">
        {GUEST_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={url.tab === t.key}
            onClick={() => url.setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {url.tab === 'orders' && (
        <OrdersTab
          eventId={eventId}
          orderUuid={url.orderUuid}
          onOpen={url.openOrder}
          onClose={url.closeOrder}
        />
      )}
      {url.tab === 'tickets' && <IssuedTicketsTab eventId={eventId} />}
      {url.tab === 'refunds' && <RefundsTab eventId={eventId} />}
    </section>
  );
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

function OrdersTab({
  eventId,
  orderUuid,
  onOpen,
  onClose,
}: {
  eventId: string;
  orderUuid: string | null;
  onOpen: (uuid: string) => void;
  onClose: () => void;
}) {
  const l = useOrderList(eventId);
  const d = useOrderDetail(eventId, orderUuid, { onMissing: onClose });
  return (
    <div role="tabpanel" aria-label="주문">
      <div role="group" aria-label="주문 상태">
        {l.statusTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={t.selected}
            data-testid={`status-${t.key}`}
            onClick={() => l.setStatus(t.key)}
          >
            {t.label} {t.count ?? ''}
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
          검색 기준
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
          주문 검색어
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
          주문 엑셀 받기
        </button>
      )}
      {l.exportError && <p role="alert">{l.exportError}</p>}
      {d.missingNotice && <p role="alert">{d.missingNotice}</p>}
      {l.status === 'error' && (
        <p role="alert">
          주문을 불러오지 못했어요{' '}
          <button type="button" onClick={l.retry}>
            다시 시도
          </button>
        </p>
      )}
      {l.empty && <p data-testid="orders-empty">주문이 없어요</p>}
      <table aria-label="주문 목록">
        <tbody>
          {l.rows.map((o) => (
            <tr key={o.orderUuid} data-testid="order-row">
              <td>{o.orderNo}</td>
              <td>{o.buyerName}</td>
              <td data-testid="order-phone">{o.buyerPhone}</td>
              <td data-testid="order-depositor">{o.depositorName}</td>
              <td>{o.ticketName}</td>
              <td>{o.quantity}매</td>
              <td>{won(o.totalAmount)}</td>
              <td data-testid="order-status">{o.status}</td>
              <td>
                <button type="button" onClick={() => onOpen(o.orderUuid)}>
                  상세
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={l.page} totalPages={l.totalPages} onPage={l.setPage} />
      {d.open && <OrderDetail d={d} onClose={onClose} />}
    </div>
  );
}

function OrderDetail({
  d,
  onClose,
}: {
  d: ReturnType<typeof useOrderDetail>;
  onClose: () => void;
}) {
  const o = d.detail;
  return (
    <section aria-label="주문 상세" data-testid="order-detail">
      <button type="button" onClick={onClose}>
        닫기
      </button>
      {d.status === 'pending' && <p>불러오는 중</p>}
      {d.status === 'error' && (
        <p role="alert">
          불러오지 못했어요{' '}
          <button type="button" onClick={d.retry}>
            다시 시도
          </button>
        </p>
      )}
      {o && (
        <>
          <h2 data-testid="detail-order-no">{o.order.orderNo}</h2>
          <p data-testid="detail-status">{o.order.status}</p>
          <p data-testid="detail-refund-status">{o.order.refundStatus}</p>
          <p>
            {o.order.buyerName} · <span data-testid="detail-phone">{o.order.buyerPhone}</span> ·{' '}
            <span data-testid="detail-email">{o.buyerEmail}</span>
          </p>
          {o.order.depositorName && <p>입금자명 {o.order.depositorName}</p>}
          <p>{won(o.order.totalAmount)}</p>
          <ul aria-label="주문 라인">
            {o.lines.map((line, i) => (
              <li key={i}>
                {line.ticketName} × {line.quantity}{' '}
                {line.optionAnswers.map((a) => `${a.optionName}: ${a.answer}`).join(', ')}
              </li>
            ))}
          </ul>
          {o.issuedTickets.length > 0 && (
            <ul aria-label="발급 티켓">
              {o.issuedTickets.map((t) => (
                <li key={t.ticketUuid ?? t.issuedTicketNo}>
                  {t.issuedTicketNo} {t.entrance}
                </li>
              ))}
            </ul>
          )}
          {d.canSeeRefundAccount && o.refundAccount && (
            <p data-testid="refund-account">
              {o.refundAccount.bankName} {o.refundAccount.accountNumber}{' '}
              {o.refundAccount.accountHolder} ({o.refundAccount.updatedAt})
            </p>
          )}
          {d.blockedMessage && <p data-testid="blocked">{d.blockedMessage}</p>}
          {d.actionError && <p role="alert">{d.actionError}</p>}
          <OrderActions d={d} />
        </>
      )}
    </section>
  );
}

function OrderActions({ d }: { d: ReturnType<typeof useOrderDetail> }) {
  const has = (key: string) => d.actions.find((a) => a.key === key);
  const approve = has('approve');
  const refuse = has('refuse');
  const cancel = has('cancel');
  const refund = has('completeRefund');
  return (
    <div role="group" aria-label="주문 처리">
      {approve && (
        <button
          type="button"
          disabled={!approve.enabled || d.pending !== null}
          onClick={() => void d.approve()}
        >
          승인
        </button>
      )}
      {refuse && (
        <fieldset disabled={!refuse.enabled || d.pending !== null}>
          <legend>거절 사유</legend>
          {REFUSE_REASON_OPTIONS.map((r) => (
            <label key={r.key}>
              <input
                type="radio"
                name="refuse-reason"
                checked={d.refuseForm.reasonType === r.key}
                onChange={() => d.refuseForm.setReasonType(r.key)}
              />
              {r.label}
            </label>
          ))}
          {d.refuseForm.reasonType === 'ETC' && (
            <label>
              기타 사유
              <input
                value={d.refuseForm.reasonText}
                onChange={(e) => d.refuseForm.setReasonText(e.target.value)}
              />
            </label>
          )}
          {d.refuseForm.errors.reasonType && <p role="alert">{d.refuseForm.errors.reasonType}</p>}
          {d.refuseForm.errors.reasonText && <p role="alert">{d.refuseForm.errors.reasonText}</p>}
          <p>{d.refuseConfirm.body}</p>
          {d.refuseConfirm.dudoongNotice && (
            <p data-testid="refuse-dudoong-notice">{d.refuseConfirm.dudoongNotice}</p>
          )}
          <button type="button" onClick={() => void d.refuse()}>
            주문 거절
          </button>
        </fieldset>
      )}
      {cancel && (
        <fieldset disabled={!cancel.enabled || d.pending !== null}>
          <legend>승인 후 취소</legend>
          <label>
            취소 사유
            <input value={d.cancelReason} onChange={(e) => d.setCancelReason(e.target.value)} />
          </label>
          {d.cancelReasonError && <p role="alert">{d.cancelReasonError}</p>}
          <p>{d.cancelConfirm.body}</p>
          {d.cancelConfirm.dudoongNotice && (
            <p data-testid="cancel-dudoong-notice">{d.cancelConfirm.dudoongNotice}</p>
          )}
          <button type="button" onClick={() => void d.cancel()}>
            주문 취소
          </button>
        </fieldset>
      )}
      {refund && (
        <button type="button" disabled={d.pending !== null} onClick={() => void d.completeRefund()}>
          환불 완료
        </button>
      )}
    </div>
  );
}
