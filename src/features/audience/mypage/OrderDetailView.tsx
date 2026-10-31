'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';

import { banksQuery } from '@/api/bank/queries';
import { isNotFound, isSessionLost } from '@/api/errors';
import {
  AsyncBoundary,
  type ErrorFallbackProps,
} from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { NotFoundView } from '@/ui/components/NotFoundView/NotFoundView';

import type {
  RefundAccountFieldErrors,
  RefundAccountFormValues,
} from './model/refund-account-form';
import { useCancelOrder, useOrderDetail, useRefundAccount } from './model/useOrderDetail';
import { useOrderHostContacts } from './model/useOrderHostContacts';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/**
 * `/orders/[orderUuid]` 주문상세 — 스타일 없는 최소 마크업(P9-L). 확인 팝업·계좌 시트·문의 시트·아코디언은 P9-V에서 이 훅들에 붙인다.
 * 남의 주문·없는 주문(404)은 공용 404 안내.
 */
export function OrderDetailView({ orderUuid }: { orderUuid: string }) {
  return (
    <main>
      <AsyncBoundary holdOn={isSessionLost} rejected={Rejected}>
        <OrderDetail orderUuid={orderUuid} />
      </AsyncBoundary>
    </main>
  );
}

function OrderDetail({ orderUuid }: { orderUuid: string }) {
  const d = useOrderDetail(orderUuid);
  const { order } = d;
  return (
    <>
      <h1>주문 상세</h1>
      <p data-testid="order-status">
        {d.statusView.label}
        {d.statusView.refund && ` · ${d.statusView.refund}`}
      </p>
      {d.refuseReason && <p data-testid="refuse-reason">거절 사유: {d.refuseReason}</p>}
      {order.cancelReason && <p>취소 사유: {order.cancelReason}</p>}
      <section aria-label="공연">
        {order.event ? (
          <p>
            <Link href={`/events/${order.event.eventId}`}>{order.event.name}</Link>{' '}
            {order.event.startAt}
          </p>
        ) : (
          <p data-testid="event-removed">삭제된 공연이에요</p>
        )}
      </section>
      <dl>
        <dt>예매번호</dt>
        <dd data-testid="order-no">{order.orderNo}</dd>
        <dt>티켓</dt>
        <dd>
          {order.ticket.name} × {order.quantity}
        </dd>
        {d.amounts && (
          <>
            <dt>티켓금액</dt>
            <dd>{won(d.amounts.ticketAmount)}</dd>
            <dt>옵션금액</dt>
            <dd>{won(d.amounts.optionAmount)}</dd>
            <dt>총 결제금액</dt>
            <dd data-testid="order-amount">{won(d.amounts.totalAmount)}</dd>
          </>
        )}
      </dl>
      {d.optionMode !== 'none' && (
        <section aria-label="옵션">
          <p>{d.optionMode === 'all' ? '모든 티켓에 같은 옵션' : '티켓별 옵션'}</p>
          {order.lines.map((line, i) => (
            <ul key={i}>
              {line.optionAnswers.map((a, j) => (
                <li key={j}>
                  {a.optionName}: {a.answer}
                </li>
              ))}
            </ul>
          ))}
        </section>
      )}
      {order.issuedTickets.length > 0 && (
        <section aria-label="발급 티켓">
          <ul>
            {order.issuedTickets.map((t, i) => (
              <li key={t.ticketUuid ?? `sent-${i}`}>
                {t.issuedTicketNo} {t.entrance} {t.giftState !== 'NONE' && t.giftState}
              </li>
            ))}
          </ul>
        </section>
      )}
      <RefundAccountSection orderUuid={orderUuid} />
      <CancelSection orderUuid={orderUuid} />
      {d.contactsEventId !== null && <HostInquiry eventId={d.contactsEventId} />}
      <Link href="/orders">목록</Link>
    </>
  );
}

function CancelSection({ orderUuid }: { orderUuid: string }) {
  const { cancel: entry } = useOrderDetail(orderUuid);
  const c = useCancelOrder(orderUuid);
  const [confirming, setConfirming] = useState(false);

  if (c.result) {
    return (
      <p role="status">
        {c.result === 'refundRequested' ? '환불을 요청했어요' : '주문을 취소했어요'}
      </p>
    );
  }
  if (entry.kind === 'giftNotice') {
    return (
      <p role="status" data-testid="gift-blocks-cancel">
        {entry.message}
      </p>
    );
  }
  if (entry.kind === 'none') return c.error ? <p role="alert">{c.error}</p> : null;
  return (
    <section aria-label="주문 취소">
      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)}>
          주문취소
        </button>
      ) : c.requiresRefundAccount ? (
        <RefundAccountForm
          submitLabel="환불 요청하기"
          pending={c.pending}
          errors={c.fieldErrors}
          onSubmit={(values) => void c.cancel(values)}
        />
      ) : (
        <button type="button" onClick={() => void c.cancel()} disabled={c.pending}>
          취소할래요
        </button>
      )}
      {c.error && <p role="alert">{c.error}</p>}
    </section>
  );
}

function RefundAccountSection({ orderUuid }: { orderUuid: string }) {
  const r = useRefundAccount(orderUuid);
  const [editing, setEditing] = useState(false);
  return (
    <section aria-label="환불 계좌">
      {r.current && (
        <p data-testid="refund-account">
          {r.current.bankName} {r.current.maskedAccountNumber} ({r.current.accountHolder})
        </p>
      )}
      {r.entry.kind === 'open' && (
        <>
          {r.entry.prompt && <p role="status">환불받을 계좌를 입력해 주세요</p>}
          {!editing ? (
            <button type="button" onClick={() => setEditing(true)}>
              {r.entry.mode === 'input' ? '계좌 입력' : '계좌 수정'}
            </button>
          ) : (
            <RefundAccountForm
              defaults={r.defaults}
              submitLabel="저장"
              pending={r.pending}
              errors={r.fieldErrors}
              onSubmit={(values) => void r.submit(values)}
            />
          )}
        </>
      )}
      {r.saved && <p role="status">환불 계좌를 저장했어요</p>}
      {r.error && <p role="alert">{r.error}</p>}
    </section>
  );
}

function RefundAccountForm({
  defaults = { bankCode: '', accountHolder: '', accountNumber: '' },
  submitLabel,
  pending,
  errors,
  onSubmit,
}: {
  defaults?: RefundAccountFormValues;
  submitLabel: string;
  pending: boolean;
  errors: RefundAccountFieldErrors;
  onSubmit: (values: RefundAccountFormValues) => void;
}) {
  const banks = useQuery(banksQuery());
  const [values, setValues] = useState(defaults);
  const set = (k: keyof RefundAccountFormValues) => (v: string) =>
    setValues((s) => ({ ...s, [k]: v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };
  return (
    <form onSubmit={submit} aria-label="환불 계좌">
      <label>
        은행
        <select value={values.bankCode} onChange={(e) => set('bankCode')(e.target.value)}>
          <option value="">은행 선택</option>
          {(banks.data ?? []).map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      {errors.bankCode && <p role="alert">{errors.bankCode}</p>}
      <label>
        예금주
        <input
          value={values.accountHolder}
          onChange={(e) => set('accountHolder')(e.target.value)}
        />
      </label>
      {errors.accountHolder && <p role="alert">{errors.accountHolder}</p>}
      <label>
        계좌번호
        <input
          inputMode="numeric"
          value={values.accountNumber}
          onChange={(e) => set('accountNumber')(e.target.value)}
        />
      </label>
      {errors.accountNumber && <p role="alert">{errors.accountNumber}</p>}
      <button type="submit" disabled={pending}>
        {submitLabel}
      </button>
    </form>
  );
}

function HostInquiry({ eventId }: { eventId: number }) {
  const [open, setOpen] = useState(false);
  const contacts = useOrderHostContacts(eventId, { open });
  return (
    <section aria-label="호스트 문의">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        호스트 문의
      </button>
      {open && contacts.status === 'pending' && <p>불러오는 중</p>}
      {open && contacts.status === 'error' && (
        <button type="button" onClick={contacts.retry}>
          다시 시도
        </button>
      )}
      {open && contacts.status === 'ready' && (
        <ul>
          {contacts.items.map((c, i) => (
            <li key={i}>{c.href ? <a href={c.href}>{c.value}</a> : c.value}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Rejected({ error, reset }: ErrorFallbackProps) {
  if (isNotFound(error)) {
    return <NotFoundView title="주문을 찾을 수 없어요" href="/orders" actionLabel="주문내역" />;
  }
  return (
    <div role="alert">
      <p>불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
      <button type="button" onClick={reset}>
        다시 시도
      </button>
    </div>
  );
}
