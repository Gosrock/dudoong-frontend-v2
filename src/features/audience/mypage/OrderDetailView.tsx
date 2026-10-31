'use client';

import Link from 'next/link';

import { isNotFound, isSessionLost } from '@/api/errors';
import type { MyOrderDetail } from '@/api/order/schema';
import { Accordion } from '@/ui/components/Accordion/Accordion';
import {
  AsyncBoundary,
  type ErrorFallbackProps,
} from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { Button } from '@/ui/components/Button/Button';
import { button } from '@/ui/components/Button/Button.css';
import { Chip, type ChipColor, formatOptionAmount } from '@/ui/components/Chip/Chip';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { NotFoundView } from '@/ui/components/NotFoundView/NotFoundView';
import { toast } from '@/ui/components/Toast/Toast';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import {
  issuedTicketStateLabel,
  orderPosterBadge,
  PAYMENT_CHANNEL_LABEL,
  REFUSE_REASON_DESCRIPTION,
  wonLabel,
} from './model/order-card';
import { useOrderDetail } from './model/useOrderDetail';
import * as s from './ui/mypage.css';
import { openCancelOrder, openHostInquiry, openRefundAccountSheet } from './ui/OrderOverlays';
import { OrderPoster, OrderStatusChips } from './ui/OrderParts';

type Detail = ReturnType<typeof useOrderDetail>;

const TICKET_TONE_COLOR: Record<ReturnType<typeof issuedTicketStateLabel>['tone'], ChipColor> = {
  positive: 'green',
  waiting: 'cyan',
  negative: 'red',
  gift: 'purple',
  muted: 'grey',
};

/**
 * `/orders/[orderUuid]` 주문상세(P9-V, 와이어 근거 — 모바일 승인대기 `128:2263` · 승인완료/선물 `498:703` · 거절 3종
 * `128:2583`·`128:2646`·`128:2709`, PC `668:5805`). GUI `331:11010` 등은 Ready가 아니라 모양을 가져오지 않는다.
 * 순서: 주문 일시 + [주문취소] / 주문 요약 / 거절 사유 / 환불 계좌 / 옵션적용 / 예매정보(아코디언 — 기본 모두 펼침, 와이어 코멘트) /
 * 결제정보 / 결제금액 / 예매취소 안내 / [호스트 문의] [목록].
 * - [주문취소]는 `canCancel`, 환불 계좌 입구는 `canEditRefundAccount`로만 연다(GUI·와이어에 입구가 없다 — Q11, 디자인 없음 코멘트)
 * - 승인 대기 주문은 발급 티켓이 없어 옵션 답(`lines`)만 그리고 티켓번호 · 티켓상태 줄이 없다(서버와 일치, Q15)
 * - 금액은 티켓금액 · 옵션금액 · 총액(v2에 할인 없음 — Q12). 결제방식은 `paymentChannel` 하나
 * 남의 주문·없는 주문(404)은 공용 404 안내.
 */
export function OrderDetailView({ orderUuid }: { orderUuid: string }) {
  return (
    <main className={s.narrowPage}>
      <Txt as="h1" typography="headingMdEmphasized" className={s.title}>
        주문상세
      </Txt>
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
      <TopLine d={d} orderUuid={orderUuid} />
      <Summary d={d} />
      {d.cancel.kind === 'giftNotice' && (
        <div className={s.warningNotice} role="status" data-testid="gift-blocks-cancel">
          <Txt typography="labelMd">{d.cancel.message}</Txt>
        </div>
      )}
      {d.refuseReason && <RefuseReason d={d} />}
      {order.cancelReason && (
        <div className={s.notice}>
          <Txt typography="labelMd">취소 사유</Txt>
          <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
            {order.cancelReason}
          </Txt>
        </div>
      )}
      <RefundAccount d={d} orderUuid={orderUuid} />
      <div className={s.sectionGap} />
      {d.optionMode !== 'none' && (
        <section aria-label="옵션 적용">
          <InfoRow hierarchy="first" label="옵션적용" />
          <InfoRow
            hierarchy="second"
            label={
              d.optionMode === 'all' ? '모든 티켓에 동일 옵션 적용' : '티켓별로 다른 옵션 적용'
            }
            value={
              d.optionMode === 'all' ? (
                <Icon name="circle-check" variant="filled" title="적용" />
              ) : undefined
            }
          />
          <div className={s.sectionGap} />
        </section>
      )}
      <Tickets d={d} />
      {order.payment && (
        <>
          <div className={s.sectionGap} />
          <PaymentInfo order={order} />
          <div className={s.sectionGap} />
          <AmountInfo d={d} />
        </>
      )}
      {d.cancel.kind !== 'none' && d.cancelNotice && <CancelNotice d={d} />}
      <Flex direction="column" gap={2} className={s.bottomAction}>
        {d.contactsEventId !== null && (
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            icon={<Icon name="chat" />}
            onClick={() => openHostInquiry(d.contactsEventId!)}
          >
            호스트 문의
          </Button>
        )}
        <Link href="/orders" className={button({ variant: 'dark', size: 'lg', fullWidth: true })}>
          목록
        </Link>
      </Flex>
    </>
  );
}

/** 주문 일시 + [주문취소](와이어 `128:2263` 맨 위 줄). 선물 때문에 막힌 주문은 버튼 대신 아래 안내 상자 */
function TopLine({ d, orderUuid }: { d: Detail; orderUuid: string }) {
  const { order } = d;
  return (
    <Flex justify="space-between" align="center" paddingX={5} paddingY={4} className={s.row}>
      <Txt typography="labelMd" color={colors.textTertiaryLabel}>
        {order.orderedAt ?? ''}
      </Txt>
      {d.cancel.kind === 'cancel' && d.contactsEventId !== null && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            openCancelOrder(
              orderUuid,
              d.contactsEventId!,
              d.cancel.kind === 'cancel' && d.cancel.refundAccount,
            )
          }
        >
          주문취소
        </Button>
      )}
    </Flex>
  );
}

function Summary({ d }: { d: Detail }) {
  const { order } = d;
  return (
    <section aria-label="공연">
      <Flex gap={4} paddingX={5} paddingY={4}>
        <OrderPoster
          src={order.event?.posterImageUrl ?? null}
          badge={orderPosterBadge(order.event, new Date())}
        />
        <Flex direction="column" gap={1} className={s.grow}>
          {order.event ? (
            <Link href={`/events/${order.event.eventId}`} className={s.plainLink}>
              <Txt typography="headingSmEmphasized" lines={2}>
                {order.event.name ?? '이름 없는 공연'}
              </Txt>
            </Link>
          ) : (
            <span data-testid="event-removed">
              <Txt typography="headingSmEmphasized" color={colors.textTertiaryLabel}>
                삭제된 공연이에요
              </Txt>
            </span>
          )}
          {order.event?.startAt && (
            <Txt typography="bodyMd" color={colors.textTertiaryLabel}>
              공연 일시 : {order.event.startAt}
            </Txt>
          )}
          <Txt typography="bodyMd" color={colors.textTertiaryLabel} lines={1}>
            티켓 : {order.ticket.name ?? '—'}
          </Txt>
          <Txt typography="bodyMd" color={colors.textTertiaryLabel}>
            수량 : {order.quantity}매
          </Txt>
          <Flex justify="space-between" align="center" wrap gap={2}>
            <Txt typography="labelLgEmphasized">{wonLabel(order.payment?.totalAmount ?? 0)}</Txt>
            <OrderStatusChips view={d.statusView} />
          </Flex>
        </Flex>
      </Flex>
    </section>
  );
}

/** 거절 사유 박스(와이어 `128:2583` — "승인거절사유 <사유>" + 설명 + 말풍선 버튼 = 호스트 문의) */
function RefuseReason({ d }: { d: Detail }) {
  const type = d.order.refuseReasonType ?? '';
  const description = REFUSE_REASON_DESCRIPTION[type];
  return (
    <>
      <div className={s.sectionGap} />
      <section aria-label="승인거절 사유">
        <Flex gap={3} align="center" paddingX={5} paddingY={4}>
          <Flex direction="column" gap={2} className={s.grow}>
            <Flex gap={2} align="center" wrap>
              <Txt typography="headingSmEmphasized">승인거절사유</Txt>
              <span data-testid="refuse-reason">
                <Txt typography="headingSmEmphasized" color={colors.textDangerLabel}>
                  {d.refuseReason}
                </Txt>
              </span>
            </Flex>
            {description && (
              <Txt
                as="p"
                typography="bodySm"
                color={colors.textSecondaryLabel}
                className={s.preLine}
              >
                {description}
              </Txt>
            )}
          </Flex>
          {d.contactsEventId !== null && (
            <Button
              variant="dark"
              size="md"
              icon={<Icon name="chat" />}
              aria-label="호스트에게 문의"
              onClick={() => openHostInquiry(d.contactsEventId!)}
            />
          )}
        </Flex>
      </section>
    </>
  );
}

/**
 * 환불 계좌(P11/O-5) — 입력·수정 입구는 `canEditRefundAccount`, 입력 유도 문구는 `refundAccountRequired`(입금 미확인 거절은 유도 없음).
 * GUI·와이어에 화면이 없어 DS로만(Figma 코멘트 — 디자인 없음). 계좌번호는 서버가 가린 값만 온다.
 */
function RefundAccount({ d, orderUuid }: { d: Detail; orderUuid: string }) {
  const current = d.order.refundAccount;
  const entry = d.refundAccount;
  if (!current && entry.kind === 'none') return null;
  return (
    <>
      <div className={s.sectionGap} />
      <section aria-label="환불 계좌">
        <InfoRow
          hierarchy="first"
          label="환불 계좌"
          value={
            entry.kind === 'open' ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openRefundAccountSheet(orderUuid, entry.mode)}
              >
                {entry.mode === 'input' ? '계좌 입력' : '계좌 수정'}
              </Button>
            ) : undefined
          }
        />
        {entry.kind === 'open' && entry.prompt && (
          <div className={s.warningNotice} role="status">
            <Txt typography="labelMd">환불받을 계좌를 입력해 주세요</Txt>
            <Txt typography="bodySm" color={colors.textSecondaryLabel}>
              호스트가 입력한 계좌로 환불해요.
            </Txt>
          </div>
        )}
        {current && (
          <span data-testid="refund-account">
            <InfoRow label="은행" value={current.bankName} />
            <InfoRow label="계좌번호" value={current.maskedAccountNumber} />
            <InfoRow label="예금주" value={current.accountHolder} />
          </span>
        )}
      </section>
    </>
  );
}

/** 예매정보 — 발급 티켓이 있으면 티켓마다, 없으면(승인 대기 · 거절) 주문 줄마다 아코디언 하나. 기본 모두 펼침(와이어 `128:2262` 코멘트) */
function Tickets({ d }: { d: Detail }) {
  const { order } = d;
  const approval = order.approvalRequired ? '호스트 승인 후 확정' : '신청 즉시 확정';
  const ticketName = order.ticket.name ?? '티켓';
  const common = (
    <>
      <InfoRow label="예매자명" value={order.depositorName ?? '—'} />
      <InfoRow
        label="예매번호"
        value={<span data-testid="order-no">{order.orderNo ?? '—'}</span>}
      />
    </>
  );
  const issued = order.issuedTickets;
  return (
    <section aria-label="예매정보">
      <InfoRow hierarchy="first" label="예매정보" />
      {issued.length > 0
        ? issued.map((t, i) => {
            const state = issuedTicketStateLabel(t, d.statusView.label);
            return (
              <Accordion
                key={t.ticketUuid ?? `sent-${i}`}
                label={t.ticketName ?? ticketName}
                meta={`(${i + 1}/${issued.length})`}
                trailing={<OptionAmountChip answers={t.optionAnswers} />}
                defaultOpen
              >
                <OptionAnswers answers={t.optionAnswers} />
                {i === 0 ? common : <InfoRow label="예매자명" value={order.depositorName ?? '—'} />}
                <InfoRow label="티켓번호" value={t.issuedTicketNo ?? '—'} />
                <InfoRow label="승인방식" value={approval} />
                <InfoRow
                  label="티켓상태"
                  value={
                    <Chip
                      size="sm"
                      shape="square"
                      color={TICKET_TONE_COLOR[state.tone]}
                      theme="weak"
                    >
                      {state.label}
                    </Chip>
                  }
                />
              </Accordion>
            );
          })
        : order.lines.map((line, i) => (
            <Accordion
              key={i}
              label={ticketName}
              meta={
                order.lines.length > 1 ? `(${i + 1}/${order.lines.length})` : `(${line.quantity}매)`
              }
              trailing={<OptionAmountChip answers={line.optionAnswers} />}
              defaultOpen
            >
              <OptionAnswers answers={line.optionAnswers} />
              {i === 0 ? common : <InfoRow label="예매자명" value={order.depositorName ?? '—'} />}
              <InfoRow label="승인방식" value={approval} />
            </Accordion>
          ))}
    </section>
  );
}

type Answer = MyOrderDetail['lines'][number]['optionAnswers'][number];

function OptionAmountChip({ answers }: { answers: readonly Answer[] }) {
  const sum = answers.reduce((acc, a) => acc + a.additionalPrice, 0);
  if (sum <= 0) return null;
  return (
    <Chip size="sm" shape="square" color="violet" theme="fill">
      {formatOptionAmount(sum)}
    </Chip>
  );
}

/** 옵션 답 — 읽기 전용(와이어 `498:703` Tomato 10-24 "수정 불가능한 느낌"). 질문 · 설명 · 답 */
function OptionAnswers({ answers }: { answers: readonly Answer[] }) {
  if (answers.length === 0) return null;
  return (
    <div className={s.optionBox}>
      {answers.map((a, i) => (
        <Flex key={i} direction="column" gap={1}>
          <Txt typography="labelMd">
            {a.optionName ?? '옵션'}
            {a.additionalPrice > 0 && (
              <Txt as="span" typography="labelMd" color={colors.textBrandLabel}>
                {' '}
                ({formatOptionAmount(a.additionalPrice)})
              </Txt>
            )}
          </Txt>
          {a.description && (
            <Txt typography="bodySm" color={colors.textTertiaryLabel}>
              {a.description}
            </Txt>
          )}
          <Txt typography="bodyMd">{a.answer ?? '—'}</Txt>
        </Flex>
      ))}
    </div>
  );
}

const copyToast = {
  onCopied: () => toast('계좌번호를 복사했어요', { id: 'order:copy' }),
  onCopyError: () =>
    toast('복사하지 못했어요. 계좌번호를 직접 입력해 주세요', { id: 'order:copy' }),
};

/** 결제정보(와이어 `128:2263` — 결제방식 · 입금자명 · 결제계좌[복사] · 예금주). 입금 계좌는 두둥티켓만 온다 */
function PaymentInfo({ order }: { order: MyOrderDetail }) {
  const account = order.payment?.account ?? null;
  return (
    <section aria-label="결제정보">
      <InfoRow
        hierarchy="first"
        label="결제정보"
        value={
          order.status === 'PENDING_APPROVE' ? (
            <Txt typography="labelSm" color={colors.textDangerLabel}>
              입금자명은 닉네임과 동일하게 입력해주세요
            </Txt>
          ) : undefined
        }
      />
      <InfoRow
        label="결제방식"
        value={order.paymentChannel ? (PAYMENT_CHANNEL_LABEL[order.paymentChannel] ?? '—') : '—'}
      />
      <InfoRow label="입금자명" value={order.depositorName ?? '—'} />
      {account && (
        <>
          <InfoRow label="입금은행" value={account.bankName ?? '—'} />
          {account.accountNumber ? (
            <InfoRow label="결제계좌" account={{ number: account.accountNumber, ...copyToast }} />
          ) : (
            <InfoRow label="결제계좌" value="—" />
          )}
          <InfoRow label="예금주" value={account.accountHolder ?? '—'} />
        </>
      )}
    </section>
  );
}

function AmountInfo({ d }: { d: Detail }) {
  if (!d.amounts) return null;
  return (
    <section aria-label="결제금액">
      <InfoRow hierarchy="first" label="결제금액" />
      <InfoRow label="티켓금액" value={wonLabel(d.amounts.ticketAmount)} />
      <InfoRow label="옵션금액" value={`${d.amounts.optionAmount.toLocaleString('ko-KR')}원`} />
      <div className={s.divider} />
      <InfoRow
        label={
          <Txt typography="labelLgEmphasized" color={colors.textPrimaryLabel}>
            총 결제금액
          </Txt>
        }
        value={
          <Txt typography="headingSmEmphasized" color={colors.textBrandLabel}>
            <span data-testid="order-amount">{wonLabel(d.amounts.totalAmount)}</span>
          </Txt>
        }
      />
    </section>
  );
}

/**
 * 예매취소 안내 — legal-copy A-8 원문(두둥 / 무료). 두둥 ⑤-b(승인 대기)는 v1 문구를 쓰지 않고 "B18 잠정안"을 쓴다 —
 * TODO(B18): 확정 문구가 오면 바꾼다. ④는 v2 흐름(앱에서 환불 계좌를 받는다)과 순서가 다르지만 약관 근거 문구라 원문 그대로 둔다(🤖).
 */
function CancelNotice({ d }: { d: Detail }) {
  const notice = d.cancelNotice!;
  const eventId = d.contactsEventId;
  const items =
    notice.kind === 'DUDOONG'
      ? [
          '취소기한 이전까지 수수료 없이 취소 가능합니다.',
          '공연 입장확인이 된 티켓이 있을경우 취소가 불가합니다.',
          '두둥티켓은 호스트 계좌로 입금한 티켓이라, 예매를 취소해도 자동으로 환불되지 않습니다.',
          <>
            환불 방법 : 예매취소 후 호스트에게 연락해 환불받을 계좌를 알려주세요. 호스트는 지체 없이
            환불해야 하며, 연락처는{' '}
            {eventId !== null ? (
              <Link href={`/events/${eventId}`}>공연 상세 페이지</Link>
            ) : (
              '공연 상세 페이지'
            )}
            에서 확인할 수 있습니다.
          </>,
          '호스트가 공연 상세에 별도의 환불 기준(예: 공연 당일 환불 불가)을 안내했다면, 직접 취소할 때의 환불은 그 기준을 따르므로 환불이 제한될 수 있습니다. 호스트가 주문을 거절·취소하거나 공연이 취소된 경우에는 전액 환불됩니다.',
          ...(notice.pendingApproval
            ? [
                '아직 승인 전이라도 지금 취소할 수 있어요. 두둥은 입금 여부를 확인하지 않으니, 이미 입금했다면 호스트가 입금한 금액을 직접 환불해 드려요.',
              ]
            : []),
          '호스트와 연락이 되지 않거나 환불이 늦어지면 두둥 카카오톡 채널로 알려주세요.',
        ]
      : [
          '취소기한 이전까지 취소할 수 있습니다.',
          '공연 입장확인이 된 티켓이 있을경우 취소가 불가합니다.',
          '취소 방법 : 티켓 예매 상세내역 > 예매취소',
        ];
  return (
    <>
      <div className={s.sectionGap} />
      <section aria-label="예매취소 안내">
        <InfoRow hierarchy="first" label="예매취소 안내" />
        <Flex paddingX={5} paddingY={3}>
          <ul className={s.noticeList}>
            {items.map((item, i) => (
              <li key={i}>
                <Txt typography="bodySm" color={colors.textSecondaryLabel}>
                  {item}
                </Txt>
              </li>
            ))}
          </ul>
        </Flex>
      </section>
    </>
  );
}

function Rejected({ error, reset }: ErrorFallbackProps) {
  if (isNotFound(error)) {
    return <NotFoundView title="주문을 찾을 수 없어요" href="/orders" actionLabel="주문내역" />;
  }
  return (
    <div role="alert" className={s.stateBox}>
      <Flex direction="column" align="center" gap={3}>
        <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
          불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </Txt>
        <Button variant="secondary" size="sm" onClick={reset}>
          다시 시도
        </Button>
      </Flex>
    </div>
  );
}
