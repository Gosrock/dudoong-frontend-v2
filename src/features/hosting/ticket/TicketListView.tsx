'use client';

import Link from 'next/link';

import { isSessionLost } from '@/api/errors';
import { HostingAccessRejected } from '@/features/hosting/access/HostingAccessRejected';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';

import { isEditablePayType, PAY_TYPE_LABEL } from './model/ticket-rules';
import { useOptionEditor } from './model/useOptionEditor';
import { useTicketList } from './model/useTicketList';
import { useTicketOptions } from './model/useTicketOptions';

/**
 * `/hosting/events/[eventId]/tickets` 티켓 관리 — 스타일 없는 최소 마크업(P12-L). 카드·상태 칩·⋮ 메뉴·옵션 추가 모달·옵션 상세 모달·
 * "티켓 옵션이란?" 팝오버·빈 상태 그림은 P12-V. ⋮ 메뉴는 버튼 줄로, 옵션 추가·상세는 `<details>`로 대신한다.
 */
export function TicketListView({ eventId }: { eventId: string }) {
  return (
    <AsyncBoundary holdOn={isSessionLost} rejected={HostingAccessRejected} resetKeys={[eventId]}>
      <TicketList eventId={eventId} />
    </AsyncBoundary>
  );
}

function TicketList({ eventId }: { eventId: string }) {
  const l = useTicketList(eventId);
  return (
    <section aria-labelledby="tickets-title">
      <h1 id="tickets-title">티켓 관리</h1>
      {l.noTicketEvent && (
        <p data-testid="no-ticket-event">티켓 없는 공연이라 티켓을 만들 수 없어요</p>
      )}
      {l.canAdd && <Link href={l.newHref}>새 티켓 만들기</Link>}
      {l.actionError && <p role="alert">{l.actionError}</p>}
      {l.status === 'error' && (
        <p role="alert">
          티켓을 불러오지 못했어요{' '}
          <button type="button" onClick={l.retry}>
            다시 시도
          </button>
        </p>
      )}
      {l.empty && <p data-testid="tickets-empty">만든 티켓이 없어요</p>}
      <ul>
        {l.cards.map((c) => {
          const t = c.ticket;
          const name = t.name ?? '이름 없는 티켓';
          return (
            <li key={t.ticketItemId} data-testid="ticket-card" data-locked={c.locked}>
              <h2>{name}</h2>
              <span data-testid="ticket-chip">{c.chipLabel}</span>
              <p>
                {isEditablePayType(t.payType) ? PAY_TYPE_LABEL[t.payType] : '기존 티켓'} ·{' '}
                {t.price.toLocaleString('ko-KR')}원{t.approvalRequired && ' · 호스트 승인 후 확정'}
                {t.purchaseLimit !== null && ` · 인당 ${t.purchaseLimit}매 제한`}
              </p>
              {t.description && <p>{t.description}</p>}
              <p data-testid="ticket-stock">
                {t.supplyCount === null ? '무제한' : `${t.remaining ?? 0}/${t.supplyCount}매`} (
                {t.isQuantityPublic ? '공개' : '비공개'})
              </p>
              {(t.saleStartAt || t.saleEndAt) && (
                <p>
                  {t.saleStartAt ?? '등록 즉시'} ~ {t.saleEndAt ?? '공연 시작까지'}
                </p>
              )}
              {t.options.length > 0 && (
                <ul aria-label={`${name} 옵션`}>
                  {t.options.map((o) => (
                    <li key={o.optionId}>{o.name}</li>
                  ))}
                </ul>
              )}
              {c.menu.length > 0 && (
                <div role="group" aria-label={`${name} 메뉴`}>
                  {c.menu.map((m) =>
                    m.action === 'edit' ? (
                      <Link key={m.action} href={c.editHref}>
                        {m.label}
                      </Link>
                    ) : (
                      <button
                        key={m.action}
                        type="button"
                        disabled={l.pendingId !== null}
                        onClick={() =>
                          void (m.action === 'delete'
                            ? l.remove(t.ticketItemId)
                            : m.action === 'suspend'
                              ? l.suspend(t.ticketItemId)
                              : l.resume(t.ticketItemId))
                        }
                      >
                        {m.label}
                      </button>
                    ),
                  )}
                </div>
              )}
              {l.canEdit && (
                <details>
                  <summary>티켓 옵션 추가</summary>
                  <TicketOptions eventId={eventId} ticketItemId={t.ticketItemId} />
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TicketOptions({ eventId, ticketItemId }: { eventId: string; ticketItemId: number }) {
  const o = useTicketOptions(eventId, ticketItemId);
  return (
    <div data-testid="ticket-options">
      {!o.canChange && <p>판매되었거나 승인 대기 주문이 있는 티켓은 옵션을 바꿀 수 없어요</p>}
      {o.error && <p role="alert">{o.error}</p>}
      {o.partial && (
        <button type="button" onClick={() => void o.retryAttach()}>
          {o.partial.name} 다시 붙이기
        </button>
      )}
      <ul aria-label="붙은 옵션">
        {o.attached.map((a) => (
          <li key={a.optionId}>
            {a.name}
            {o.canChange && (
              <button type="button" onClick={() => void o.detach(a.optionId)}>
                {a.name} 떼기
              </button>
            )}
            <details>
              <summary>{a.name} 상세</summary>
              <OptionEditor eventId={eventId} optionId={a.optionId} />
            </details>
          </li>
        ))}
      </ul>
      {o.canChange && o.canAttachMore && (
        <>
          <ul aria-label="기존 옵션">
            {o.attachable.map((p) => (
              <li key={p.optionId}>
                <button type="button" onClick={() => void o.attach(p.optionId)}>
                  {p.name} 붙이기
                </button>
              </li>
            ))}
          </ul>
          <form
            noValidate
            aria-label="새 옵션"
            onSubmit={(e) => {
              e.preventDefault();
              void o.createAndAttach();
            }}
          >
            <label>
              옵션 이름
              <input value={o.values.name} onChange={(e) => o.setName(e.target.value)} />
            </label>
            {o.attempted && o.errors.name && <span role="alert">{o.errors.name}</span>}
            <label>
              옵션 설명
              <input
                value={o.values.description}
                onChange={(e) => o.setDescription(e.target.value)}
              />
            </label>
            {(o.serverErrors.description ?? (o.attempted && o.errors.description)) && (
              <span role="alert">{o.serverErrors.description ?? o.errors.description}</span>
            )}
            <label>
              <input
                type="radio"
                checked={o.values.type === 'SUBJECTIVE'}
                onChange={() => o.setType('SUBJECTIVE')}
              />
              주관식
            </label>
            <label>
              <input
                type="radio"
                checked={o.values.type === 'YES_NO'}
                onChange={() => o.setType('YES_NO')}
              />
              네/아니오
            </label>
            {o.values.type === 'YES_NO' && (
              <label>
                네 추가 금액
                <input
                  inputMode="numeric"
                  value={o.values.yesAdditionalPrice}
                  onChange={(e) => o.setYesAdditionalPrice(e.target.value)}
                />
              </label>
            )}
            {(o.serverErrors.yesAdditionalPrice ??
              (o.attempted && o.errors.yesAdditionalPrice)) && (
              <span role="alert">
                {o.serverErrors.yesAdditionalPrice ?? o.errors.yesAdditionalPrice}
              </span>
            )}
            <button type="submit" disabled={o.pending}>
              옵션 만들어 붙이기
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function OptionEditor({ eventId, optionId }: { eventId: string; optionId: number }) {
  const e = useOptionEditor(eventId, optionId);
  if (!e.values) return null;
  const readOnly = !e.canEdit;
  return (
    <form
      noValidate
      aria-label="옵션 상세"
      onSubmit={(ev) => {
        ev.preventDefault();
        void e.save();
      }}
    >
      {e.error && <p role="alert">{e.error}</p>}
      <p data-testid="option-type">
        응답 형식:{' '}
        {e.type === 'YES_NO' ? '네/아니오' : e.type === 'SUBJECTIVE' ? '주관식' : '객관식'}
      </p>
      <label>
        옵션 이름 수정
        <input
          value={e.values.name}
          readOnly={readOnly}
          onChange={(ev) => e.setName(ev.target.value)}
        />
      </label>
      <label>
        옵션 설명 수정
        <input
          value={e.values.description}
          readOnly={readOnly}
          onChange={(ev) => e.setDescription(ev.target.value)}
        />
      </label>
      {(e.serverErrors.description ?? (e.attempted && e.errors.description)) && (
        <span role="alert">{e.serverErrors.description ?? e.errors.description}</span>
      )}
      {e.type === 'YES_NO' && (
        <label>
          네 추가 금액 수정
          <input
            inputMode="numeric"
            value={e.values.yesAdditionalPrice}
            readOnly={readOnly || e.priceLocked}
            onChange={(ev) => e.setYesAdditionalPrice(ev.target.value)}
          />
        </label>
      )}
      {e.canEdit && (
        <button type="submit" disabled={!e.canSave}>
          옵션 저장
        </button>
      )}
      {e.canDelete && (
        <button type="button" disabled={e.busy} onClick={() => void e.remove()}>
          옵션 삭제
        </button>
      )}
    </form>
  );
}
