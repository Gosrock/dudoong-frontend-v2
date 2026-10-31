'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { isSessionLost } from '@/api/errors';
import type { Checkout } from '@/api/order/schema';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';

import type { CheckoutParams } from './model/checkout-params';
import type { AnswerValue } from './model/option-form';
import { PAYMENT_CHANNEL_LABEL } from './model/payment';
import { type CheckoutState, useCheckout, useCheckoutData } from './model/useCheckout';

/**
 * 체크아웃(`/events/[eventId]/checkout?ticketItemId=&quantity=`) — 스타일 없는 최소 마크업(P7-L).
 * 화면(옵션 아코디언, 계좌 복사, 입금 확인 모달 등)은 P7-V에서 이 훅들에 붙인다.
 */
export function CheckoutView({
  eventId,
  params,
}: {
  eventId: number;
  params: CheckoutParams | null;
}) {
  return (
    <main>
      <h1>결제하기</h1>
      <AsyncBoundary holdOn={isSessionLost}>
        <CheckoutContent eventId={eventId} params={params} />
      </AsyncBoundary>
    </main>
  );
}

function CheckoutContent({ eventId, params }: { eventId: number; params: CheckoutParams | null }) {
  const state = useCheckoutData(eventId, params);
  const router = useRouter();
  const backHref = state.status === 'unavailable' ? state.backHref : null;
  useEffect(() => {
    // 티켓 선택으로 돌려보낸다(patterns §16). 뒤로가기로 다시 오지 않게 replace
    if (backHref) router.replace(backHref);
  }, [backHref, router]);

  if (state.status === 'pending') return <p role="status">불러오는 중</p>;
  if (state.status === 'unavailable') {
    return (
      <p role="alert">
        지금은 이 티켓을 구매할 수 없어요. <Link href={state.backHref}>티켓 다시 고르기</Link>
      </p>
    );
  }
  return (
    <CheckoutForm
      eventId={eventId}
      checkout={state.checkout}
      depositorName={state.depositorName}
      quantity={params?.quantity ?? 1}
    />
  );
}

function CheckoutForm(props: {
  eventId: number;
  checkout: Checkout;
  depositorName: string | null;
  quantity: number;
}) {
  const c = useCheckout(props);
  const [confirming, setConfirming] = useState(false);
  const { register, formState } = c.form;
  const errors = formState.errors;

  const onCta = async () => {
    if (!c.needsDepositConfirm) return void c.submit();
    if (await c.validate()) setConfirming(true);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onCta();
      }}
      noValidate
    >
      {c.submitError && <p role="alert">{c.submitError.message}</p>}

      <section aria-label="티켓">
        <h2>{c.ticket.name}</h2>
        <p>
          수량{' '}
          <button
            type="button"
            onClick={() => c.setQuantity(c.quantity - 1)}
            disabled={c.quantity <= 1}
            aria-label="수량 줄이기"
          >
            −
          </button>
          <output aria-label="수량">{c.quantity}</output>
          <button
            type="button"
            onClick={() => c.setQuantity(c.quantity + 1)}
            disabled={c.quantity >= c.maxQuantity}
            aria-label="수량 늘리기"
          >
            +
          </button>
        </p>
      </section>

      {c.hasOptions && (
        <section aria-label="옵션">
          <h2>옵션</h2>
          {c.canChooseMode && (
            <p>
              <button
                type="button"
                aria-pressed={c.mode === 'same'}
                onClick={() => c.setMode('same', 0)}
              >
                모든 티켓 동일
              </button>
              <button
                type="button"
                aria-pressed={c.mode === 'individual'}
                onClick={() => c.setMode('individual')}
              >
                티켓별로 입력
              </button>
            </p>
          )}
          {c.mode === 'same' ? (
            <OptionFields c={c} base="options.same" errors={errors.options?.same} />
          ) : (
            Array.from({ length: c.quantity }, (_, t) => (
              <fieldset key={t}>
                <legend>
                  티켓 {t + 1}/{c.quantity}
                </legend>
                <OptionFields
                  c={c}
                  base={`options.tickets.${t}`}
                  errors={errors.options?.tickets?.[t]}
                />
              </fieldset>
            ))
          )}
        </section>
      )}

      <section aria-label="결제 정보">
        <h2>결제 정보</h2>
        <p>
          총 결제금액{' '}
          <strong data-testid="checkout-amount">{c.amount.toLocaleString('ko-KR')}원</strong>
        </p>
        {c.account && (
          <dl>
            <dt>은행</dt>
            <dd>{c.account.bankName}</dd>
            <dt>계좌번호</dt>
            <dd>{c.account.accountNumber}</dd>
            <dt>예금주</dt>
            <dd>{c.account.accountHolder}</dd>
          </dl>
        )}
        {c.kind === 'TRANSFER' && <p>입금자명 {c.depositorName}</p>}
      </section>

      {c.kind === 'TRANSFER' && (
        <fieldset>
          <legend>결제 방식</legend>
          {(['BANK_TRANSFER', 'TOSS_TRANSFER'] as const).map((channel) => (
            <label key={channel}>
              <input type="radio" value={channel} {...register('paymentChannel')} />
              {PAYMENT_CHANNEL_LABEL[channel]}
            </label>
          ))}
          {c.paymentChannel === 'TOSS_TRANSFER' && c.tossLink && (
            <a href={c.tossLink} data-testid="toss-link">
              토스 앱에서 송금하기
            </a>
          )}
        </fieldset>
      )}

      <label>
        <input type="checkbox" {...register('agreeRefundPolicy')} />
        환불 규정에 동의합니다
      </label>
      {errors.agreeRefundPolicy && <p role="alert">{errors.agreeRefundPolicy.message}</p>}

      <button type="submit" disabled={c.submitting}>
        {c.ctaLabel}
      </button>

      {confirming && (
        <section role="dialog" aria-label="주문 완료하기">
          <p>입금 하셨나요?</p>
          <button type="button" onClick={() => setConfirming(false)} disabled={c.submitting}>
            취소
          </button>
          <button type="button" onClick={() => void c.submit()} disabled={c.submitting}>
            결제완료
          </button>
        </section>
      )}
    </form>
  );
}

type AnswerErrors = ({ answer?: { message?: string } } | undefined)[] | undefined;

function OptionFields({
  c,
  base,
  errors,
}: {
  c: CheckoutState;
  base: 'options.same' | `options.tickets.${number}`;
  errors: unknown;
}) {
  const fieldErrors = errors as AnswerErrors;
  return (
    <>
      {c.ticket.options.map((option, i) => {
        const name = `${base}.${i}.answer` as `options.same.${number}.answer`;
        const error = fieldErrors?.[i]?.answer?.message;
        return (
          <fieldset key={option.optionId}>
            <legend>
              {option.name}
              {option.type === 'YES_NO' && option.yesAdditionalPrice
                ? ` (+${option.yesAdditionalPrice.toLocaleString('ko-KR')}원)`
                : ''}
            </legend>
            {option.description && <p>{option.description}</p>}
            {option.type === 'YES_NO' ? (
              (['YES', 'NO'] as const satisfies readonly NonNullable<AnswerValue['answer']>[]).map(
                (v) => (
                  <label key={v}>
                    <input type="radio" value={v} {...c.form.register(name)} />
                    {v === 'YES' ? '네' : '아니오'}
                  </label>
                ),
              )
            ) : (
              <input type="text" aria-label={option.name ?? '답변'} {...c.form.register(name)} />
            )}
            {error && <p role="alert">{error}</p>}
          </fieldset>
        );
      })}
    </>
  );
}
