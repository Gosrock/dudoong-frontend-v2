'use client';

import Link from 'next/link';

import { isSessionLost } from '@/api/errors';
import {
  HostingAccessRejected,
  HostingNotFound,
} from '@/features/hosting/access/HostingAccessRejected';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';

import { parseTicketItemIdParam, PAY_TYPE_LABEL } from './model/ticket-rules';
import { useTicketForm } from './model/useTicketForm';

/**
 * `/hosting/events/[eventId]/tickets/new` · `…/tickets/[ticketItemId]` 티켓 폼 — 스타일 없는 최소 마크업(P12-L).
 * 카운터·토글·DatePicker·은행 Combobox·관리자 승인 가이드 팝오버·이탈 확인은 P12-V. 은행은 검색 칸 + 목록 버튼으로 대신한다.
 * 환불 의무 동의 칸은 그리지 않는다(design-requests Q42 — `agreement.field`가 false인 동안).
 */
export function TicketFormView({
  eventId,
  ticketItemId,
}: {
  eventId: string;
  /** 주소의 티켓 id(수정). 만들기면 undefined */
  ticketItemId?: string;
}) {
  const id = ticketItemId === undefined ? null : parseTicketItemIdParam(ticketItemId);
  if (ticketItemId !== undefined && id === null) return <HostingNotFound />;
  return (
    <AsyncBoundary
      ignoreError={isSessionLost}
      rejected={HostingAccessRejected}
      resetKeys={[eventId, id]}
    >
      <TicketForm eventId={eventId} ticketItemId={id} />
    </AsyncBoundary>
  );
}

function TicketForm({ eventId, ticketItemId }: { eventId: string; ticketItemId: number | null }) {
  const f = useTicketForm(eventId, ticketItemId);
  if (f.missing) return <HostingNotFound />;
  const v = f.values;
  const readOnly = !f.canEdit;
  const err = (field: keyof typeof f.errors) =>
    f.serverErrors[field] ?? (f.attempted ? f.errors[field] : undefined);
  const shown = (field: keyof typeof f.errors) => {
    const message = err(field);
    return message ? <span role="alert">{message}</span> : null;
  };
  return (
    <section aria-labelledby="ticket-form-title">
      <h1 id="ticket-form-title">{f.mode === 'create' ? '새 티켓 만들기' : '티켓 수정'}</h1>
      <Link href={f.listHref}>티켓 목록</Link>
      {(f.readOnlyReason === 'noTicketEvent' || f.readOnlyReason === 'priceTicket') && (
        <p data-testid="ticket-form-read-only">{f.readOnlyMessage}</p>
      )}
      {f.locks.locked && (
        <p data-testid="ticket-locked">
          판매되었거나 승인 대기 주문이 있어 설명·판매 기간·재고 공개·매수 제한·수량 늘리기만 할 수
          있어요
        </p>
      )}
      {f.formError && <p role="alert">{f.formError}</p>}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void f.save();
        }}
      >
        <fieldset disabled={readOnly || f.locks.locked}>
          <legend>티켓 종류</legend>
          {(['DUDOONG', 'FREE'] as const).map((p) => (
            <label key={p}>
              <input
                type="radio"
                name="payType"
                checked={v.payType === p}
                onChange={() => f.setPayType(p)}
              />
              {PAY_TYPE_LABEL[p]}
            </label>
          ))}
        </fieldset>
        {shown('payType')}
        <label>
          티켓 이름
          <input
            value={v.name}
            readOnly={readOnly || f.locks.locked}
            onChange={(e) => f.setName(e.target.value)}
          />
        </label>
        {shown('name')}
        <label>
          티켓 설명
          <input
            value={v.description}
            readOnly={readOnly}
            onChange={(e) => f.setDescription(e.target.value)}
          />
        </label>
        {shown('description')}
        {v.payType === 'DUDOONG' && (
          <>
            <label>
              가격
              <input
                inputMode="numeric"
                value={v.price}
                readOnly={readOnly || f.locks.locked}
                onChange={(e) => f.setPrice(e.target.value)}
              />
            </label>
            {shown('price')}
            <fieldset disabled={readOnly || f.locks.locked}>
              <legend>입금 계좌</legend>
              <p data-testid="selected-bank">{f.bank.selected?.name ?? '은행을 골라 주세요'}</p>
              <label>
                은행 검색
                <input value={f.bank.keyword} onChange={(e) => f.bank.setKeyword(e.target.value)} />
              </label>
              <ul aria-label="은행 목록">
                {f.bank.filtered.map((b) => (
                  <li key={b.code}>
                    <button type="button" onClick={() => f.bank.select(b.code)}>
                      {b.name}
                    </button>
                  </li>
                ))}
              </ul>
              {shown('bankCode')}
              <label>
                예금주
                <input
                  value={v.accountHolder}
                  onChange={(e) => f.setAccountHolder(e.target.value)}
                />
              </label>
              {shown('accountHolder')}
              <label>
                계좌번호
                <input
                  value={v.accountNumber}
                  onChange={(e) => f.setAccountNumber(e.target.value)}
                />
              </label>
              {shown('accountNumber')}
            </fieldset>
          </>
        )}
        <label>
          <input
            type="checkbox"
            checked={v.unlimited}
            disabled={readOnly || (v.unlimited && f.locks.limitedSupply)}
            onChange={(e) => f.setUnlimited(e.target.checked)}
          />
          판매 수량 무제한
        </label>
        {!v.unlimited && (
          <label>
            판매 수량
            <input
              inputMode="numeric"
              value={v.supplyCount}
              readOnly={readOnly}
              onChange={(e) => f.setSupplyCount(e.target.value)}
            />
          </label>
        )}
        {shown('supplyCount')}
        <label>
          <input
            type="checkbox"
            checked={v.isQuantityPublic}
            disabled={readOnly || f.locks.quantityPublic}
            onChange={(e) => f.setQuantityPublic(e.target.checked)}
          />
          재고 공개
        </label>
        <label>
          <input
            type="checkbox"
            checked={v.limitPurchase}
            disabled={readOnly}
            onChange={(e) => f.setLimitPurchase(e.target.checked)}
          />
          1인 매수 제한
        </label>
        {v.limitPurchase && (
          <label>
            1인 최대 매수
            <input
              inputMode="numeric"
              value={v.purchaseLimit}
              readOnly={readOnly}
              onChange={(e) => f.setPurchaseLimit(e.target.value)}
            />
          </label>
        )}
        {shown('purchaseLimit')}
        <label>
          <input
            type="checkbox"
            checked={v.approvalRequired}
            disabled={readOnly || f.locks.approval}
            onChange={(e) => f.setApprovalRequired(e.target.checked)}
          />
          관리자 승인
        </label>
        <label>
          <input
            type="checkbox"
            checked={v.salePeriod}
            disabled={readOnly}
            onChange={(e) => f.setSalePeriod(e.target.checked)}
          />
          판매 기간 설정
        </label>
        {v.salePeriod && (
          <fieldset disabled={readOnly}>
            <legend>판매 기간</legend>
            <label>
              <input
                type="checkbox"
                checked={v.saleStartNow}
                onChange={(e) => f.setSaleStartNow(e.target.checked)}
              />
              공연 등록 즉시 판매 시작
            </label>
            {!v.saleStartNow && (
              <>
                <label>
                  판매 시작 날짜
                  <input
                    type="date"
                    value={v.saleStartDate}
                    onChange={(e) => f.setSaleStart(e.target.value, v.saleStartTime)}
                  />
                </label>
                <label>
                  판매 시작 시각
                  <input
                    type="time"
                    value={v.saleStartTime}
                    onChange={(e) => f.setSaleStart(v.saleStartDate, e.target.value)}
                  />
                </label>
              </>
            )}
            {shown('saleStart')}
            <label>
              판매 종료 날짜
              <input
                type="date"
                value={v.saleEndDate}
                onChange={(e) => f.setSaleEnd(e.target.value, v.saleEndTime)}
              />
            </label>
            <label>
              판매 종료 시각
              <input
                type="time"
                value={v.saleEndTime}
                onChange={(e) => f.setSaleEnd(v.saleEndDate, e.target.value)}
              />
            </label>
            {shown('saleEnd')}
          </fieldset>
        )}
        {f.canEdit && (
          <button type="submit" disabled={f.saving}>
            {f.mode === 'create' ? '티켓 만들기' : '저장하기'}
          </button>
        )}
      </form>
    </section>
  );
}
