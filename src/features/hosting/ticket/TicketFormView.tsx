'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';

import { HostingNotFound } from '@/features/hosting/access/HostingAccessRejected';
import { HostingBoundary } from '@/features/hosting/access/HostingBoundary';
import { useLeaveGuard } from '@/features/hosting/shared/ui/EditorParts';
import {
  EVENT_SCOPE_ATTR,
  HIDE_EVENT_HEADER_ATTR,
} from '@/features/hosting/shared/ui/event-scope-attrs';
import { NoticeBox } from '@/features/hosting/shared/ui/NoticeBox';
import { Button } from '@/ui/components/Button/Button';
import { Header } from '@/ui/components/Header/Header';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { TicketFormField } from './model/ticket-form';
import { parseTicketItemIdParam } from './model/ticket-rules';
import { useTicketForm } from './model/useTicketForm';
import * as s from './TicketFormView.css';
import { REFUND_OBLIGATION_ERROR, RefundObligationField } from './ui/RefundObligationField';
import {
  AccountSection,
  NameSections,
  PayTypeSection,
  PriceSupplySection,
} from './ui/TicketFormFields';
import { TicketFormToggles } from './ui/TicketFormToggles';

/**
 * `/hosting/events/[eventId]/tickets/new` 새 티켓 만들기 — GUI 두둥 `767:46560`(토글 off) · `767:46664`(토글 on) · 무료 `821:23712`,
 * PC `821:25116` · `821:25649`, 관리자 승인이란 `971:21949`(#47). `…/tickets/[ticketItemId]` 티켓 수정은 GUI가 없어 같은 폼(와이어 수준 —
 * 잠긴 칸은 서버 기준 L `locks`, 제목 "티켓 수정" · [저장하기]).
 * 프론트가 GUI와 다르게 하는 것(plan P12 V): 은행명은 서버 목록에서 고른다(DS Dropdown), 무제한이면 재고 공개 끔·비활성,
 * 두둥이면 관리자 승인 잠금. 환불 의무 동의 칸(legal-copy C-1 — 두둥 만들기 · 무료 → 두둥 수정)은 디자인 Q42 답 전이라 DS로만
 * 폼 맨 아래(저장 버튼 바로 위)에 둔다(백엔드 #905 1-1 출시 전 필수 — 디자인이 오면 옮긴다). 체크 전 저장 버튼은 비활성.
 */
export function TicketFormView({
  eventId,
  ticketItemId,
}: {
  eventId: string;
  /** 주소의 티켓 id(수정). 만들기면 undefined */
  ticketItemId?: string;
}) {
  // Cache Components는 떠난 페이지를 `<Activity>`로 숨겨 state를 남긴다 — 그대로면 '새 티켓 만들기'에 다시 들어올 때 직전 입력이
  // 채워져 있다(#92-7). push·replace로 들어올 때마다 바뀌는 `bfcacheId`를 key로 새로 그리고, 뒤로·앞으로 가기만 복원한다
  // (node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md). 수정 폼도 저장 뒤 다시 들어오면 최신 값에서 시작한다
  const { bfcacheId } = useRouter();
  const id = ticketItemId === undefined ? null : parseTicketItemIdParam(ticketItemId);
  if (ticketItemId !== undefined && id === null) return <HostingNotFound />;
  return (
    <HostingBoundary resetKeys={[eventId, id]}>
      <TicketForm key={bfcacheId} eventId={eventId} ticketItemId={id} />
    </HostingBoundary>
  );
}

const FORM_ID = 'ticket-form';

/** 폼이 보이는 동안 공연 스코프 틀에 "공연 헤더 숨김"을 건다(숨겨진 Activity면 effect가 정리돼 풀린다) */
function useHideEventHeader() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const scope = ref.current?.closest(`[${EVENT_SCOPE_ATTR}]`);
    if (!scope) return;
    scope.setAttribute(HIDE_EVENT_HEADER_ATTR, '');
    return () => scope.removeAttribute(HIDE_EVENT_HEADER_ATTR);
  }, []);
  return ref;
}

function TicketForm({ eventId, ticketItemId }: { eventId: string; ticketItemId: number | null }) {
  const form = useTicketForm(eventId, ticketItemId);
  const pageRef = useHideEventHeader();
  const { access, status, feedback, agreement } = form;
  // 처음 값에서 손댔는지(만들기는 `formState.isDirty` — 빈 폼에서 나갈 때 묻지 않고, 버튼은 GUI처럼 비활성)
  useLeaveGuard(access.canEdit && status.touched);
  if (form.missing) return <HostingNotFound />;
  const readOnly = !access.canEdit;
  const err = (field: TicketFormField) =>
    feedback.server[field] ?? (status.attempted ? feedback.errors[field] : undefined);
  const title = form.mode === 'create' ? '새 티켓 만들기' : '티켓 수정';
  const agreementMissing = agreement.field && agreement.required && !agreement.agreed;
  const section = { form, readOnly, err };

  return (
    <section ref={pageRef} aria-labelledby="ticket-form-title" className={s.page}>
      <Header
        className={s.mobileHeaderBar}
        title={title}
        titleAs="p"
        backHref={form.listHref}
        backLabel="티켓 관리로"
        linkAs={Link}
      />
      <div className={s.body}>
        <div className={s.desktopHead}>
          <Link href={form.listHref} className={s.crumb}>
            <Icon name="chevron-left" size={16} />
            <Txt typography="labelMd">티켓 관리</Txt>
          </Link>
        </div>
        <h1 id="ticket-form-title" className={s.title}>
          <Txt typography="headingLgEmphasized">{title}</Txt>
        </h1>

        <div className={s.notices}>
          {(access.readOnlyReason === 'noTicketEvent' ||
            access.readOnlyReason === 'priceTicket') && (
            <p data-testid="ticket-form-read-only">
              <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
                {access.readOnlyMessage}
              </Txt>
            </p>
          )}
          {form.locks.locked && (
            <span data-testid="ticket-locked">
              <NoticeBox icon="important">
                판매되었거나 승인 대기 주문이 있어 설명·판매 기간·재고 공개·매수 제한·수량 늘리기만
                할 수 있어요
              </NoticeBox>
            </span>
          )}
          {feedback.form && (
            <p role="alert">
              <Txt typography="bodyMd" color={colors.textDangerLabel}>
                {feedback.form}
              </Txt>
            </p>
          )}
        </div>

        <form
          id={FORM_ID}
          noValidate
          className={s.columns}
          onSubmit={(e) => {
            e.preventDefault();
            void form.save();
          }}
        >
          <div className={s.left}>
            <PayTypeSection {...section} />
            <NameSections {...section} />
            <PriceSupplySection {...section} />
            {form.values.payType === 'DUDOONG' && <AccountSection {...section} bank={form.bank} />}
          </div>
          <div className={s.right}>
            <TicketFormToggles {...section} />
          </div>
          {agreement.field && agreement.required && (
            <RefundObligationField
              agreed={agreement.agreed}
              onAgreedChange={agreement.setAgreed}
              disabled={readOnly || status.saving}
              error={status.attempted && !agreement.agreed ? REFUND_OBLIGATION_ERROR : undefined}
            />
          )}
        </form>
      </div>
      {access.canEdit && (
        <div className={s.bottomBar}>
          <Button
            type="submit"
            form={FORM_ID}
            size="lg"
            fullWidth
            className={s.saveButton}
            disabled={!status.touched || agreementMissing}
            loading={status.saving}
          >
            {form.mode === 'create' ? '티켓 만들기' : '저장하기'}
          </Button>
        </div>
      )}
    </section>
  );
}
