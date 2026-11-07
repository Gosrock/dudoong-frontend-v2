'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import Link from 'next/link';

import { STATE_TONE_COLOR } from '@/features/audience/ticket/ui/state-tone';
import { DELETED_EVENT, UNNAMED_EVENT } from '@/features/shared/event-labels';
import { eventHref } from '@/features/shared/routes';
import { Chip } from '@/ui/components/Chip/Chip';
import { UploadedImage } from '@/ui/components/UploadedImage/UploadedImage';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';
import { formatPrice } from '@/utils/money';

import type { OrderStatusView } from '../model/order-status';
import * as s from './mypage.css';
import * as p from './OrderParts.css';

/**
 * 상태 칩(GUI `1047:32381` — `tag_v2` small · round · weak: 승인대기 cyan · 승인완료 green · 승인거절 red) + (거절·호스트 취소된 유료
 * 주문의) 환불 진행 보조 칩. 보조 칩은 GUI에 없다 — 지금 동작 그대로 둔다(🤖, 디자인 Q176)
 */
export function OrderStatusChips({ view }: { view: OrderStatusView }) {
  return (
    <span data-testid="order-status" data-tone={view.tone} className={p.chipRow}>
      <Chip size="sm" shape="round" color={STATE_TONE_COLOR[view.tone]} theme="weak">
        {view.label}
      </Chip>
      {view.refund && (
        <Chip size="sm" shape="round" color="grey" theme="weak">
          <VisuallyHidden> · </VisuallyHidden>
          {view.refund}
        </Chip>
      )}
    </span>
  );
}

/**
 * 포스터 상자(DS `example poster` mobile 94×133). 포스터가 없거나 못 읽으면 빈 상자(Q26 기본안).
 * GUI에는 포스터 위 D-n · 공연종료 배지가 없다(와이어에만 있던 것 — GUI가 이긴다).
 */
export function OrderPoster({ src }: { src: string | null }) {
  return (
    <span className={p.poster}>
      {src && (
        // 서버 이미지(업로드 출처면 `/_next/image` 최적화 — P15). 폭 94 · PC 120(`OrderParts.css` `poster`)
        <UploadedImage
          src={src}
          alt=""
          width={120}
          height={170}
          sizes="(min-width: 1024px) 120px, 94px"
          className={s.posterImage}
        />
      )}
    </span>
  );
}

type SummaryEvent = { eventId: number; name: string | null; posterImageUrl: string | null } | null;

/**
 * 주문 요약 카드(GUI `1047:32381` 카드 · `1175:19046` 요약 — 같은 `Card list`): 포스터 + 공연 이름 · 티켓 · 수량 / 총액 + 상태 칩.
 * 목록에서는 카드 전체가 링크라 공연 이름을 링크로 두지 않고(`linkEvent=false`), 상세에서는 공연 이름이 공연 상세 링크다.
 */
export function OrderSummaryCard({
  event,
  ticketName,
  quantity,
  amount,
  statusView,
  linkEvent,
}: {
  event: SummaryEvent;
  ticketName: string | null;
  quantity: number;
  amount: number;
  statusView: OrderStatusView;
  linkEvent: boolean;
}) {
  const title = event ? (
    <Txt typography="headingMdEmphasized" lines={2}>
      {event.name ?? UNNAMED_EVENT}
    </Txt>
  ) : (
    <span data-testid="event-removed">
      <Txt typography="headingMdEmphasized" color={colors.textTertiaryLabel} lines={2}>
        {DELETED_EVENT}
      </Txt>
    </span>
  );
  return (
    <Flex gap={4}>
      <OrderPoster src={event?.posterImageUrl ?? null} />
      <Flex direction="column" justify="space-between" gap={3} className={p.summaryText}>
        <Flex direction="column" gap={1}>
          {event && linkEvent ? (
            <Link href={eventHref(event.eventId)} className={s.plainLink}>
              {title}
            </Link>
          ) : (
            title
          )}
          <Flex direction="column">
            <Txt typography="bodyMd" color={colors.textSecondaryLabel} lines={1}>
              티켓 : {ticketName ?? '—'}
            </Txt>
            <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
              수량 : {quantity}매
            </Txt>
          </Flex>
        </Flex>
        <Flex justify="space-between" align="center" wrap gap={2}>
          <Txt typography="headingMdEmphasized">{formatPrice(amount)}</Txt>
          <OrderStatusChips view={statusView} />
        </Flex>
      </Flex>
    </Flex>
  );
}
