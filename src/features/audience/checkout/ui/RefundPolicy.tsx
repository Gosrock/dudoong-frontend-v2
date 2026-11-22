'use client';

import { formatKstDotDateTimeWeekday } from '@/api/shared/date';
import { eventHref } from '@/features/shared/routes';
import { Accordion } from '@/ui/components/Accordion/Accordion';
import { Flex } from '@/ui/primitives/Flex';

import { REFUND_DEADLINE, refundPolicyItems } from '../model/refund-policy';
import type { CheckoutState } from '../model/useCheckout';
import { bodyList, bodyText, collapseTopLine, grayBox, textLink } from './checkout.css';
import * as s from './RefundPolicy.css';

// ─── 취소·환불 규정(이슈 #105) ─────────────────────────────

/** 펼침 줄 글자(GUI `1952:50155` — Design Sync #349, 2026-11-22) */
const REFUND_POLICY_TITLE = 'DUDOONG 구매 및 환불/취소 규정';

/**
 * 예매 확인 화면 중개자 문장 — legal-copy A-5 첫 줄 원문(약관 제24조① · 제3조③ "결제(예매) 확인 화면"). 바꾸거나 빼지 않는다.
 * 자리: GUI `1952:50161`(Design Sync #349)대로 규정 목록 아래 한 줄 띄고 — 2026-11-07부터 하단 바(디자인 없음 Q151)에 있던 것을 옮겼다.
 * A-5 둘째 줄 "위 내용을 확인하였으며 {결제|예매}에 동의합니다"는 하단 동의 줄이 같은 역할이라 넣지 않는다(🤖 2026-11-07)
 */
export const CHECKOUT_INTERMEDIARY_NOTICE =
  '두둥은 통신판매중개자로서 공연의 당사자가 아니며, 공연에 관한 의무와 책임은 호스트에게 있습니다.';

/**
 * 판매정보 안 취소·환불 규정(GUI `1952:50155` list second-open + `1952:50156` 회색 상자 — Design Sync #349):
 * 취소 기한 줄 → legal-copy A-7 원문(`refundPolicyItems`) → 중개자 문장(A-5) → 호스트 환불 기준(공연 상세) · 이용약관 링크.
 * GUI대로 처음부터 펼쳐 둔다(접을 수 있다). 링크는 새 탭 — 고른 옵션을 잃지 않게.
 * 취소 기한 값: GUI는 "2026.12.05 (토) 18:00 이전까지"(공연 시작 일시)인데 A-7 공통 행이 "공연 시작 전 까지"라 문구는 그대로 두고
 * 공연 시작 일시를 다음 줄에 같은 모양으로 보인다(약관 문구 — 사용자 대기, Figma 코멘트 2026-11-22)
 */
export function RefundPolicy({
  c,
  eventId,
  startAt,
}: {
  c: CheckoutState;
  eventId: number;
  startAt: string | null;
}) {
  const items = refundPolicyItems(c.ticket.payType);
  if (!items) return null;
  return (
    <Accordion label={REFUND_POLICY_TITLE} defaultOpen className={collapseTopLine}>
      <div className={grayBox}>
        <RefundPolicyBody eventId={eventId} startAt={startAt} items={items} />
      </div>
    </Accordion>
  );
}

/**
 * 규정 상자 안 — 취소 기한 줄(A-7 공통 행) · 공연 시작 · A-7 목록 · 중개자 문장(A-5) · 링크. 모바일 회색 상자와 PC 판매정보 카드가 같이 쓴다.
 * PC(GUI `1999:3043`)는 위에 "환불/취소 규정" 제목이 있고 취소 기한 줄이 없지만, 공통 행은 약관 문구라 남긴다(Figma 코멘트 2026-11-22)
 */
export function RefundPolicyBody({
  eventId,
  startAt,
  items,
}: {
  eventId: number;
  startAt: string | null;
  items: readonly string[];
}) {
  return (
    <>
      <Flex direction="column" gap={2}>
        <div className={s.deadlineRow}>
          <span>{REFUND_DEADLINE.label}</span>
          <span>{REFUND_DEADLINE.value}</span>
        </div>
        {startAt && (
          <div className={s.deadlineRow}>
            <span>공연 시작</span>
            <span>{formatKstDotDateTimeWeekday(startAt)}</span>
          </div>
        )}
      </Flex>
      <div>
        <ol className={bodyList}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className={`${bodyText} ${s.notice}`}>{CHECKOUT_INTERMEDIARY_NOTICE}</p>
      </div>
      <Flex gap={3} wrap className={bodyText}>
        <a href={eventHref(eventId)} target="_blank" rel="noopener noreferrer" className={textLink}>
          호스트 환불 기준
        </a>
        <a href="/meta/term" target="_blank" rel="noopener noreferrer" className={textLink}>
          이용약관
        </a>
      </Flex>
    </>
  );
}
