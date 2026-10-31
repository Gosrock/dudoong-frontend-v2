'use client';

import { useQuery } from '@tanstack/react-query';
import { overlay } from 'overlay-kit';
import { type FormEvent, type ReactNode, useEffect, useId, useState } from 'react';

import { banksQuery } from '@/api/bank/queries';
import { ContactList } from '@/features/shared/contact/ui/ContactList';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { Dropdown } from '@/ui/components/Dropdown/Dropdown';
import { Input } from '@/ui/components/Input/Input';
import { Popup } from '@/ui/components/Popup/Popup';
import { toast } from '@/ui/components/Toast/Toast';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type {
  RefundAccountFieldErrors,
  RefundAccountFormValues,
} from '../model/refund-account-form';
import { useCancelOrder, useRefundAccount } from '../model/useOrderDetail';
import { useOrderHostContacts } from '../model/useOrderHostContacts';
import * as s from './mypage.css';

/** 환불 계좌 칸 길이(plan P9 — 예금주 20자 · 계좌번호 30자, 서버 P11/O-5와 같다) */
const ACCOUNT_HOLDER_MAX = 20;
const ACCOUNT_NUMBER_MAX = 30;

/** 취소 확인 문구 — legal-copy A-9(두둥) · A-10(무료) 원문. 빼거나 바꾸지 않는다 */
export const CANCEL_COPY = {
  paidTitle: '취소 후 직접 환불을 요청해야 해요',
  paidBody:
    '두둥티켓은 호스트 계좌로 입금한 티켓이라 자동으로 환불되지 않아요. 예매를 취소한 뒤 호스트에게 연락해 환불받을 계좌를 알려주세요. 호스트가 공연 상세에 별도 환불 기준을 안내했다면, 직접 취소할 때는 그 기준에 따라 환불이 제한될 수 있어요.',
  paidContacts: '호스트 연락처 확인하기',
  paidConfirm: '확인했어요, 취소할게요',
  freeTitle: '예매를 취소할까요?',
  freeBody: '언제든 다시 예매할 수 있어요.',
  freeConfirm: '취소할래요',
  no: '아니요',
} as const;

/** 취소 성공 토스트 — legal-copy A-11 원문 */
export const CANCEL_TOAST = {
  refundRequested: '예매가 취소되었어요. 호스트에게 연락해 환불을 요청해주세요.',
  canceled: '티켓이 정상적으로 취소되었습니다.',
} as const;

// ─── 환불 계좌 폼 ───

/**
 * 환불 계좌 칸 세 개 — 은행(서버 목록 `GET /api/v2/banks`에서 고름, `bankCode`) · 예금주 · 계좌번호. GUI·와이어에 환불 계좌 화면이 없어
 * DS `Dropdown`·`Input`만으로 만들었다(Figma 코멘트 — 디자인 없음). 제출 버튼은 시트 footer에 두고 `form` 속성으로 묶는다.
 */
function RefundAccountFields({
  formId,
  defaults,
  errors,
  onSubmit,
}: {
  formId: string;
  defaults: RefundAccountFormValues;
  errors: RefundAccountFieldErrors;
  onSubmit: (values: RefundAccountFormValues) => void;
}) {
  const banks = useQuery(banksQuery());
  const [values, setValues] = useState(defaults);
  const set = (k: keyof RefundAccountFormValues) => (v: string) =>
    setValues((prev) => ({ ...prev, [k]: v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };
  return (
    <form id={formId} onSubmit={submit} aria-label="환불 계좌" noValidate>
      <Flex direction="column" gap={4}>
        <Dropdown
          label="은행"
          required
          placeholder={banks.isPending ? '은행 목록을 불러오는 중' : '은행 선택'}
          options={(banks.data ?? []).map((b) => ({ value: b.code, label: b.name }))}
          value={values.bankCode}
          onValueChange={set('bankCode')}
          error={errors.bankCode ?? (banks.isError ? '은행 목록을 불러오지 못했어요' : undefined)}
        />
        <Input
          label="예금주"
          required
          autoComplete="off"
          value={values.accountHolder}
          maxLength={ACCOUNT_HOLDER_MAX}
          onChange={(e) => set('accountHolder')(e.target.value)}
          error={errors.accountHolder}
        />
        <Input
          label="계좌번호"
          required
          autoComplete="off"
          inputMode="numeric"
          placeholder="숫자와 - 만 입력"
          value={values.accountNumber}
          maxLength={ACCOUNT_NUMBER_MAX}
          onChange={(e) => set('accountNumber')(e.target.value)}
          error={errors.accountNumber}
        />
      </Flex>
    </form>
  );
}

const EMPTY_ACCOUNT: RefundAccountFormValues = {
  bankCode: '',
  accountHolder: '',
  accountNumber: '',
};

function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <div role="alert">
      <Txt typography="labelMd" color={colors.textDangerLabel}>
        {children}
      </Txt>
    </div>
  );
}

// ─── 환불 계좌 입력 · 수정 시트 ───

/** [계좌 입력]·[계좌 수정] → P11/O-5. 입구는 화면이 `canEditRefundAccount`로만 연다. 저장하면 닫고 토스트 */
export function openRefundAccountSheet(orderUuid: string, mode: 'input' | 'edit') {
  overlay.open(({ isOpen, close, unmount }) => (
    <RefundAccountSheet
      orderUuid={orderUuid}
      mode={mode}
      open={isOpen}
      onClose={close}
      onExited={unmount}
    />
  ));
}

function RefundAccountSheet({
  orderUuid,
  mode,
  open,
  onClose,
  onExited,
}: {
  orderUuid: string;
  mode: 'input' | 'edit';
  open: boolean;
  onClose: () => void;
  onExited: () => void;
}) {
  const r = useRefundAccount(orderUuid);
  const formId = useId();
  useEffect(() => {
    if (!r.saved) return;
    toast('환불 계좌를 저장했어요', { id: 'order:refund-account' });
    onClose();
  }, [r.saved, onClose]);
  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(o) => !o && !r.pending && onClose()}
      onExited={onExited}
      dismissible={!r.pending}
      title={mode === 'input' ? '환불 계좌 입력' : '환불 계좌 수정'}
      description={
        mode === 'edit'
          ? '보안을 위해 계좌번호는 다시 입력해 주세요.'
          : '환불받을 계좌를 입력해 주세요. 호스트가 이 계좌로 환불해요.'
      }
      footer={
        <Button type="submit" form={formId} size="lg" fullWidth loading={r.pending}>
          저장
        </Button>
      }
    >
      <Flex direction="column" gap={4}>
        <RefundAccountFields
          formId={formId}
          defaults={r.defaults}
          errors={r.fieldErrors}
          onSubmit={(values) => void r.submit(values)}
        />
        {r.error && <ErrorLine>{r.error}</ErrorLine>}
      </Flex>
    </ResponsiveOverlay>
  );
}

// ─── 주문 취소 ───

/**
 * [주문취소] → 유료(두둥)는 A-9 안내 + 환불 계좌 칸이 같이 있는 시트(유료 취소는 계좌가 있어야 요청된다 — `Order_400_25`),
 * 무료는 A-10 확인 팝업. 성공하면 닫고 A-11 토스트. 실패 안내는 시트 · 팝업 안에 남는다.
 * 노출은 화면이 `canCancel`(`useOrderDetail().cancel.kind === 'cancel'`)로만 정한다.
 */
export function openCancelOrder(orderUuid: string, eventId: number, paid: boolean) {
  overlay.open(({ isOpen, close, unmount }) =>
    paid ? (
      <PaidCancelSheet
        orderUuid={orderUuid}
        eventId={eventId}
        open={isOpen}
        onClose={close}
        onExited={unmount}
      />
    ) : (
      <FreeCancelPopup orderUuid={orderUuid} open={isOpen} onClose={close} onExited={unmount} />
    ),
  );
}

type CancelProps = { orderUuid: string; open: boolean; onClose: () => void; onExited: () => void };

function useCloseOnResult(
  result: ReturnType<typeof useCancelOrder>['result'],
  onClose: () => void,
) {
  useEffect(() => {
    if (!result) return;
    toast(result === 'refundRequested' ? CANCEL_TOAST.refundRequested : CANCEL_TOAST.canceled, {
      id: 'order:cancel',
    });
    onClose();
  }, [result, onClose]);
}

function FreeCancelPopup({ orderUuid, open, onClose, onExited }: CancelProps) {
  const c = useCancelOrder(orderUuid);
  useCloseOnResult(c.result, onClose);
  return (
    <Popup
      open={open}
      onOpenChange={(o) => !o && !c.pending && onClose()}
      onExited={onExited}
      title={CANCEL_COPY.freeTitle}
      description={CANCEL_COPY.freeBody}
      confirmLabel={CANCEL_COPY.freeConfirm}
      cancelLabel={CANCEL_COPY.no}
      loading={c.pending}
      onConfirm={() => void c.cancel()}
    >
      {c.error && <ErrorLine>{c.error}</ErrorLine>}
    </Popup>
  );
}

function PaidCancelSheet({
  orderUuid,
  eventId,
  open,
  onClose,
  onExited,
}: CancelProps & { eventId: number }) {
  const c = useCancelOrder(orderUuid);
  const formId = useId();
  const [showContacts, setShowContacts] = useState(false);
  const contacts = useOrderHostContacts(eventId, { open: showContacts });
  useCloseOnResult(c.result, onClose);
  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(o) => !o && !c.pending && onClose()}
      onExited={onExited}
      dismissible={!c.pending}
      title={CANCEL_COPY.paidTitle}
      description={CANCEL_COPY.paidBody}
      footer={
        <Flex gap={2} fullWidth>
          <Button variant="secondary" size="lg" fullWidth disabled={c.pending} onClick={onClose}>
            {CANCEL_COPY.no}
          </Button>
          <Button type="submit" form={formId} size="lg" fullWidth loading={c.pending}>
            {CANCEL_COPY.paidConfirm}
          </Button>
        </Flex>
      }
    >
      <Flex direction="column" gap={5}>
        {/* A-9 [호스트 연락처 확인하기] — v1은 공연 상세로 이동했다. 오버레이 안 이동을 피하려고 같은 시트 안에 연락처를 펼친다(🤖) */}
        <Flex direction="column" gap={3}>
          <span>
            <Button
              variant="secondary"
              size="sm"
              aria-expanded={showContacts}
              onClick={() => setShowContacts((v) => !v)}
            >
              {CANCEL_COPY.paidContacts}
            </Button>
          </span>
          {showContacts && <ContactList state={contacts} onRetry={contacts.retry} />}
        </Flex>
        <div className={s.sheetNotice}>
          <Txt typography="labelMd">환불받을 계좌</Txt>
          <Txt typography="bodySm" color={colors.textSecondaryLabel}>
            취소하려면 환불받을 계좌가 필요해요. 호스트가 이 계좌로 환불해요.
          </Txt>
        </div>
        <RefundAccountFields
          formId={formId}
          defaults={EMPTY_ACCOUNT}
          errors={c.fieldErrors}
          onSubmit={(values) => void c.cancel(values)}
        />
        {c.error && <ErrorLine>{c.error}</ErrorLine>}
      </Flex>
    </ResponsiveOverlay>
  );
}

// ─── 호스트 문의 ───

/**
 * 주문상세 [호스트 문의] — 공연 상세 [문의하기]·호스트 홈 연락처와 같은 `ContactList`. GP-3을 쿠키와 함께 시트를 열 때 한 번 읽는다
 * (`useOrderHostContacts` — 공개 GP-3은 부르지 않는다, patterns §20). 와이어 거절 사유 박스의 말풍선 버튼(`128:2583`)도 이 시트를 연다.
 */
export function openHostInquiry(eventId: number) {
  overlay.open(({ isOpen, close, unmount }) => (
    <ResponsiveOverlay
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      onExited={unmount}
      title="호스트 문의"
    >
      <HostInquiryBody eventId={eventId} />
    </ResponsiveOverlay>
  ));
}

function HostInquiryBody({ eventId }: { eventId: number }) {
  const contacts = useOrderHostContacts(eventId, { open: true });
  return <ContactList state={contacts} onRetry={contacts.retry} />;
}
