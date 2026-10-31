'use client';

import Link from 'next/link';
import { useState } from 'react';

import { isSessionLost } from '@/api/errors';
import { TICKET_DESCRIPTION_MAX, TICKET_NAME_MAX } from '@/api/ticket-item/schema';
import {
  HostingAccessRejected,
  HostingNotFound,
} from '@/features/hosting/access/HostingAccessRejected';
import { FieldError, FormSection, useLeaveGuard } from '@/features/hosting/event/ui/EditorParts';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { Button } from '@/ui/components/Button/Button';
import { Checkbox } from '@/ui/components/Checkbox/Checkbox';
import { DatePicker } from '@/ui/components/DatePicker/DatePicker';
import { Dropdown } from '@/ui/components/Dropdown/Dropdown';
import { Header } from '@/ui/components/Header/Header';
import { Input } from '@/ui/components/Input/Input';
import { Radio, RadioGroup } from '@/ui/components/Radio/Radio';
import { TimePicker } from '@/ui/components/TimePicker/TimePicker';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { parseTicketItemIdParam, PAY_TYPE_LABEL } from './model/ticket-rules';
import { useTicketForm } from './model/useTicketForm';
import * as s from './TicketFormView.css';
import { openApprovalGuide } from './ui/TicketGuides';
import { NoticeBox, ToggleSection } from './ui/TicketParts';

/**
 * `/hosting/events/[eventId]/tickets/new` 새 티켓 만들기 — GUI 두둥 `767:46560`(토글 off) · `767:46664`(토글 on) · 무료 `821:23712`,
 * PC `821:25116` · `821:25649`, 관리자 승인이란 `971:21949`(#47). `…/tickets/[ticketItemId]` 티켓 수정은 GUI가 없어 같은 폼(와이어 수준 —
 * 잠긴 칸은 서버 기준 L `locks`, 제목 "티켓 수정" · [저장하기]).
 * 프론트가 GUI와 다르게 하는 것(plan P12 V): 은행명은 서버 목록에서 고른다(DS Dropdown), 무제한이면 재고 공개 끔·비활성,
 * 두둥이면 관리자 승인 잠금. 환불 의무 동의 칸은 그리지 않는다(Q42 — `agreement.field` false).
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
      holdOn={isSessionLost}
      rejected={HostingAccessRejected}
      resetKeys={[eventId, id]}
    >
      <TicketForm eventId={eventId} ticketItemId={id} />
    </AsyncBoundary>
  );
}

const FORM_ID = 'ticket-form';

function TicketForm({ eventId, ticketItemId }: { eventId: string; ticketItemId: number | null }) {
  const f = useTicketForm(eventId, ticketItemId);
  // 처음 그린 값과 다르면 손댄 것(만들기는 L `dirty`가 늘 true — 빈 폼에서 나갈 때 묻지 않고, 버튼은 GUI처럼 비활성)
  const [initial] = useState(() => JSON.stringify(f.values));
  const touched = f.dirty && JSON.stringify(f.values) !== initial;
  useLeaveGuard(f.canEdit && touched);
  if (f.missing) return <HostingNotFound />;
  const v = f.values;
  const readOnly = !f.canEdit;
  const locked = f.locks.locked;
  const err = (field: keyof typeof f.errors) =>
    f.serverErrors[field] ?? (f.attempted ? f.errors[field] : undefined);
  const title = f.mode === 'create' ? '새 티켓 만들기' : '티켓 수정';
  const dudoong = v.payType === 'DUDOONG';

  const toggles = (
    <>
      <ToggleSection
        title="관리자 승인 여부"
        description="관리자가 승인해야 티켓이 발급돼요."
        checked={v.approvalRequired}
        disabled={readOnly || f.locks.approval}
        onCheckedChange={f.setApprovalRequired}
        onInfo={() => void openApprovalGuide()}
        infoLabel="관리자 승인이란?"
      />
      <ToggleSection
        title="재고 정보 공개"
        description="남은 티켓의 수량을 공개해요."
        checked={v.isQuantityPublic}
        disabled={readOnly || f.locks.quantityPublic}
        onCheckedChange={f.setQuantityPublic}
      />
      <ToggleSection
        title="구매 가능 매수 제한"
        description="한 명이 구매 가능한 티켓 매수를 제한해요."
        checked={v.limitPurchase}
        disabled={readOnly}
        onCheckedChange={f.setLimitPurchase}
      >
        {v.limitPurchase && (
          <Input
            aria-label="1인 최대 매수"
            className={s.narrow}
            inputMode="numeric"
            placeholder="0"
            trailing="장"
            value={v.purchaseLimit}
            readOnly={readOnly}
            onChange={(e) => f.setPurchaseLimit(e.target.value)}
            error={err('purchaseLimit')}
          />
        )}
      </ToggleSection>
      <ToggleSection
        title="판매 기간 설정"
        description={'티켓을 구매할 수 있는 기간을 설정해요.\n판매는 공연 시작 전까지만 가능해요.'}
        checked={v.salePeriod}
        disabled={readOnly}
        onCheckedChange={f.setSalePeriod}
      >
        {v.salePeriod && (
          // FIGMA-CUSTOM: 판매 기간 상자(gui 767:46768 "Frame 1707480415") 커스텀 → 커스텀 TicketFormView.css.ts. DS 후보(design-system §3)
          <div className={s.period} data-testid="sale-period">
            <div className={s.periodRow}>
              <div className={s.periodHead}>
                <Txt typography="labelLgEmphasized">판매 시작</Txt>
                <Checkbox
                  label={<Txt typography="labelMd">공연 등록 즉시 판매 시작</Txt>}
                  checked={v.saleStartNow}
                  disabled={readOnly}
                  onCheckedChange={f.setSaleStartNow}
                />
              </div>
              {!v.saleStartNow && (
                <div className={s.dateTime}>
                  <DatePicker
                    aria-label="판매 시작 날짜"
                    placeholder="날짜 선택"
                    value={v.saleStartDate}
                    readOnly={readOnly}
                    onChange={(e) => f.setSaleStart(e.target.value, v.saleStartTime)}
                  />
                  <TimePicker
                    aria-label="판매 시작 시각"
                    placeholder="시간 선택"
                    value={v.saleStartTime}
                    readOnly={readOnly}
                    onChange={(e) => f.setSaleStart(v.saleStartDate, e.target.value)}
                  />
                </div>
              )}
              <FieldError>{err('saleStart')}</FieldError>
            </div>
            <div className={s.periodRow}>
              <div className={s.periodHead}>
                <Txt typography="labelLgEmphasized">판매 종료</Txt>
              </div>
              <div className={s.dateTime}>
                <DatePicker
                  aria-label="판매 종료 날짜"
                  placeholder="날짜 선택"
                  value={v.saleEndDate}
                  readOnly={readOnly}
                  onChange={(e) => f.setSaleEnd(e.target.value, v.saleEndTime)}
                />
                <TimePicker
                  aria-label="판매 종료 시각"
                  placeholder="시간 선택"
                  value={v.saleEndTime}
                  readOnly={readOnly}
                  onChange={(e) => f.setSaleEnd(v.saleEndDate, e.target.value)}
                />
              </div>
              <FieldError>{err('saleEnd')}</FieldError>
            </div>
          </div>
        )}
      </ToggleSection>
    </>
  );

  return (
    <section aria-labelledby="ticket-form-title" className={s.page} {...{ [s.SUBPAGE_ATTR]: '' }}>
      <Header
        className={s.mobileOnly}
        title={title}
        titleAs="p"
        backHref={f.listHref}
        backLabel="티켓 관리로"
        linkAs={Link}
      />
      <div className={s.body}>
        <div className={s.desktopHead}>
          <Link href={f.listHref} className={s.crumb}>
            <Icon name="chevron-left" size={16} />
            <Txt typography="labelMd">티켓 관리</Txt>
          </Link>
        </div>
        <h1 id="ticket-form-title" className={`${s.title} ${s.desktopHead}`}>
          <Txt typography="headingLgEmphasized">{title}</Txt>
        </h1>

        <div className={s.notices}>
          {(f.readOnlyReason === 'noTicketEvent' || f.readOnlyReason === 'priceTicket') && (
            <p data-testid="ticket-form-read-only">
              <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
                {f.readOnlyMessage}
              </Txt>
            </p>
          )}
          {locked && (
            <span data-testid="ticket-locked">
              <NoticeBox icon="important">
                판매되었거나 승인 대기 주문이 있어 설명·판매 기간·재고 공개·매수 제한·수량 늘리기만
                할 수 있어요
              </NoticeBox>
            </span>
          )}
          {f.formError && (
            <p role="alert">
              <Txt typography="bodyMd" color={colors.textDangerLabel}>
                {f.formError}
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
            void f.save();
          }}
        >
          <div className={s.left}>
            <FormSection
              title="티켓 종류"
              description="계좌 송금 옵션을 통해 수수료 없이 티켓값을 받을 수 있어요."
            >
              <RadioGroup
                aria-label="티켓 종류"
                className={s.radios}
                value={v.payType}
                disabled={readOnly || locked}
                onValueChange={(p) => f.setPayType(p as typeof v.payType)}
              >
                <Radio value="DUDOONG" label={PAY_TYPE_LABEL.DUDOONG} />
                <Radio value="FREE" label={PAY_TYPE_LABEL.FREE} />
              </RadioGroup>
              <FieldError>{err('payType')}</FieldError>
            </FormSection>

            <FormSection
              title="티켓 이름"
              required
              description="티켓의 성격이 잘 드러나는 이름을 써주세요."
            >
              <Input
                aria-label="티켓 이름"
                placeholder="예) 후원티켓"
                maxLength={TICKET_NAME_MAX}
                value={v.name}
                readOnly={readOnly || locked}
                onChange={(e) => f.setName(e.target.value)}
                error={err('name')}
              />
            </FormSection>

            <FormSection
              title="티켓 설명"
              description="티켓에 대한 추가 정보가 필요한 경우 작성해 주세요."
            >
              <Input
                aria-label="티켓 설명"
                placeholder="예) 해당 티켓은 후원 티켓으로 입장이 불가합니다."
                maxLength={TICKET_DESCRIPTION_MAX}
                value={v.description}
                readOnly={readOnly}
                onChange={(e) => f.setDescription(e.target.value)}
                error={err('description')}
              />
            </FormSection>

            <div className={s.priceSupply}>
              {dudoong && (
                <FormSection title="티켓 가격" required>
                  <Input
                    aria-label="가격"
                    className={s.narrow}
                    inputMode="numeric"
                    placeholder="0"
                    trailing="원"
                    value={v.price}
                    readOnly={readOnly || locked}
                    onChange={(e) => f.setPrice(e.target.value)}
                    error={err('price')}
                  />
                </FormSection>
              )}
              <FormSection title="판매 수량" required>
                <RadioGroup
                  aria-label="판매 수량 방식"
                  className={s.supplyRow}
                  value={v.unlimited ? 'unlimited' : 'limited'}
                  disabled={readOnly || (v.unlimited && f.locks.limitedSupply)}
                  onValueChange={(next) => f.setUnlimited(next === 'unlimited')}
                >
                  <Radio value="unlimited" label="무제한" />
                  <span className={s.supplyCount}>
                    <Radio value="limited" label="수량 지정" />
                    <Input
                      aria-label="판매 수량"
                      className={s.count}
                      inputMode="numeric"
                      placeholder="0"
                      trailing="장"
                      value={v.unlimited ? '' : v.supplyCount}
                      disabled={v.unlimited}
                      readOnly={readOnly}
                      onChange={(e) => f.setSupplyCount(e.target.value)}
                    />
                  </span>
                </RadioGroup>
                <FieldError>{err('supplyCount')}</FieldError>
              </FormSection>
            </div>

            {dudoong && (
              <FormSection
                title="계좌번호 입력"
                required
                description="입금 받을 계좌 정보를 적어 주세요."
              >
                <div className={s.account}>
                  <div className={s.accountRow}>
                    {/* GUI는 은행명 자유 입력 — 서버 은행 목록 선택(사용자 결정 2026-10-31, 디자이너에게 전달됨) */}
                    <Dropdown
                      aria-label="은행"
                      placeholder={
                        f.bank.status === 'error' ? '은행 목록을 못 불러왔어요' : '은행명'
                      }
                      options={f.bank.banks.map((b) => ({ value: b.code, label: b.name }))}
                      value={f.bank.selected?.code ?? ''}
                      disabled={readOnly || locked || f.bank.status !== 'success'}
                      onValueChange={f.bank.select}
                      error={err('bankCode')}
                    />
                    <Input
                      aria-label="예금주"
                      placeholder="예금주"
                      value={v.accountHolder}
                      readOnly={readOnly || locked}
                      onChange={(e) => f.setAccountHolder(e.target.value)}
                      error={err('accountHolder')}
                    />
                  </div>
                  <Input
                    aria-label="계좌번호"
                    placeholder="계좌번호"
                    inputMode="numeric"
                    value={v.accountNumber}
                    readOnly={readOnly || locked}
                    onChange={(e) => f.setAccountNumber(e.target.value)}
                    error={err('accountNumber')}
                  />
                  {f.bank.status === 'error' && (
                    <Button variant="secondary" size="sm" onClick={f.bank.retry}>
                      은행 목록 다시 불러오기
                    </Button>
                  )}
                </div>
              </FormSection>
            )}
          </div>
          <div className={s.right}>{toggles}</div>
        </form>
      </div>
      {f.canEdit && (
        <div className={s.bottomBar}>
          <Button
            type="submit"
            form={FORM_ID}
            size="lg"
            fullWidth
            className={s.saveButton}
            disabled={!touched}
            loading={f.saving}
          >
            {f.mode === 'create' ? '티켓 만들기' : '저장하기'}
          </Button>
        </div>
      )}
    </section>
  );
}
