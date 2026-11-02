'use client';

import Link from 'next/link';

import { eventHref } from '@/features/shared/routes';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { OrderDetailState } from '../model/useOrderDetail';
import * as s from './mypage.css';

/**
 * 예매취소 안내 — legal-copy A-8 원문(두둥 / 무료). 두둥 ⑤-b(승인 대기)는 v1 문구를 쓰지 않고 백엔드 #897 확정 문구를
 * 쓴다 — 개정 약관 시행(2026-11-07 KST) 뒤에만(`cancelNotice`). ④는 v2 흐름(앱에서 환불 계좌를 받는다)과 순서가 다르지만 약관 근거 문구라 원문 그대로 둔다(🤖).
 */
export function OrderCancelNotice({ detail }: { detail: OrderDetailState }) {
  const notice = detail.cancelNotice;
  if (!notice) return null;
  const eventId = detail.contactsEventId;
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
              <Link href={eventHref(eventId)}>공연 상세 페이지</Link>
            ) : (
              '공연 상세 페이지'
            )}
            에서 확인할 수 있습니다.
          </>,
          '호스트가 공연 상세에 별도의 환불 기준(예: 공연 당일 환불 불가)을 안내했다면, 직접 취소할 때의 환불은 그 기준을 따르므로 환불이 제한될 수 있습니다. 호스트가 주문을 거절·취소하거나 공연이 취소된 경우에는 전액 환불됩니다.',
          ...(notice.pendingApproval
            ? [
                '아직 호스트가 승인하기 전이에요. 지금 취소할 수 있으며, 이미 입금했다면 취소할 때 입력한 환불 계좌로 호스트가 환불합니다.',
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
      <Divider variant="section" />
      <section aria-label="예매취소 안내">
        <InfoRow hierarchy="first" label="예매취소 안내" />
        {/* legal-copy A-7 공통 행 "취소 기한 / 공연 시작 전 까지" + 그 날짜(이슈 #105 — '취소기한'이 언제인지) */}
        <InfoRow label="취소 기한" value="공연 시작 전 까지" />
        {detail.order.event?.startAt && (
          <InfoRow label="공연 시작" value={detail.order.event.startAt} />
        )}
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
