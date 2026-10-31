'use client';

import type { HostIssuedTicket } from '@/api/issued-ticket/schema';
import type { RefundElement } from '@/api/order/schema';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { Chip } from '@/ui/components/Chip/Chip';
import { DataTable } from '@/ui/components/DataTable/DataTable';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { toast } from '@/ui/components/Toast/Toast';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './GuestsView.css';
import { useIssuedTicketList } from './model/useIssuedTicketList';
import { useRefundList } from './model/useRefundList';
import { DetailCell } from './ui/DetailCell';
import {
  dateTimeText,
  entranceTextOf,
  GIFT_STATE_LABEL,
  orderStatusChipOf,
  PAY_TYPE_LABEL,
  REFUND_STATUS_LABEL,
  text,
  won,
} from './ui/guest-labels';
import {
  Empty,
  ExportButton,
  FilterRow,
  ListError,
  ListLoading,
  NoticeLine,
  nowrapColumns,
  SearchBar,
  TableFooter,
} from './ui/GuestParts';
import { OptionAnswers } from './ui/OrderDetailOverlay';

/** 소유자 칸 — 현재 소유자(`ownerName`) + 선물 상태(`giftState`, 선물이 없으면 칩 없음) */
function Owner({ t }: { t: Pick<HostIssuedTicket, 'ownerName' | 'giftState'> }) {
  const gift = GIFT_STATE_LABEL[t.giftState];
  return (
    <Flex gap={1} align="center">
      <span data-testid="ticket-owner">{text(t.ownerName)}</span>
      {gift && (
        <Chip color="violet" theme="border">
          <span data-testid="ticket-gift">{gift}</span>
        </Chip>
      )}
    </Flex>
  );
}

const TICKET_COLUMNS = nowrapColumns<HostIssuedTicket>([
  { id: 'no', header: '티켓 번호', cell: (t) => text(t.issuedTicketNo) },
  {
    id: 'payType',
    header: '티켓 종류',
    cell: (t) => (
      <Chip color="grey" theme="border">
        {PAY_TYPE_LABEL[t.payType ?? 'UNKNOWN']}
      </Chip>
    ),
  },
  { id: 'name', header: '티켓 이름', cell: (t) => text(t.ticketName) },
  { id: 'buyer', header: '주문자', cell: (t) => text(t.buyerName) },
  { id: 'owner', header: '소유자', cell: (t) => <Owner t={t} /> },
  { id: 'orderNo', header: '주문 번호', cell: (t) => text(t.orderNo) },
  { id: 'issuedAt', header: '발급 일시', cell: (t) => dateTimeText(t.issuedAt) },
  {
    id: 'entrance',
    header: '체크인',
    cell: (t) => (
      <span data-testid="ticket-entrance">{entranceTextOf(t.entrance, t.enteredAt)}</span>
    ),
  },
  { id: 'detail', header: <span className={s.srOnly}>상세</span>, cell: () => <DetailCell /> },
]);

/** 발급된 티켓 탭(GI-1 · GI-2 · GI-3) — 와이어 `424:12014`(표) · `503:27502`(티켓 상세: 티켓 번호 + 옵션 응답) */
export function IssuedTicketsTab({ eventId }: { eventId: string }) {
  const l = useIssuedTicketList(eventId);
  const t = l.detail;
  return (
    <div className={s.tab}>
      <FilterRow
        label="입장 상태"
        options={l.entranceFilters}
        onSelect={l.setEntrance}
        testIdPrefix="entrance"
      />
      <SearchBar
        label="티켓 검색어"
        types={l.searchTypes}
        type={l.searchType}
        onTypeChange={l.setSearchType}
        keyword={l.keywordInput}
        onKeywordChange={l.setKeywordInput}
        keywordMax={l.keywordMax}
        onSubmit={l.submitSearch}
        hint={l.exactMatchHint}
      />
      {l.exportError && <NoticeLine onDismiss={l.dismissExportError}>{l.exportError}</NoticeLine>}
      {l.missingNotice && (
        <NoticeLine onDismiss={l.dismissMissingNotice}>{l.missingNotice}</NoticeLine>
      )}
      {l.status === 'error' ? (
        <ListError what="티켓" onRetry={l.retry} />
      ) : (
        <DataTable
          caption="발급 티켓 목록"
          columns={TICKET_COLUMNS}
          data={l.rows}
          getRowId={(r, i) => r.ticketUuid ?? r.issuedTicketNo ?? String(i)}
          rowTestId="ticket-row"
          onRowClick={(r) => r.ticketUuid && l.openTicket(r.ticketUuid)}
          getRowLabel={(r) => `티켓 ${text(r.issuedTicketNo)} ${text(r.ownerName)} 상세`}
          pageIndex={l.page}
          pageCount={l.totalPages ?? 1}
          onPageChange={l.setPage}
          loading={l.status === 'pending' ? <ListLoading /> : undefined}
          empty={<Empty>{l.appliedKeyword ? '검색 결과가 없어요' : '발급된 티켓이 없어요'}</Empty>}
        />
      )}
      {l.canExport && (
        <TableFooter>
          <ExportButton
            label="티켓 엑셀로 다운로드"
            exporting={l.exporting}
            onExport={() => void l.exportExcel()}
          />
        </TableFooter>
      )}
      <ResponsiveOverlay
        open={l.selectedTicketUuid !== null}
        onOpenChange={(open) => !open && l.closeTicket()}
        title={t ? `티켓 번호 - ${text(t.ticket.issuedTicketNo)}` : '티켓 상세'}
      >
        <div data-testid="ticket-detail" className={s.tab}>
          {l.detailStatus === 'pending' && <ListLoading />}
          {t && (
            <>
              <section aria-label="티켓 정보">
                <InfoRow label="티켓" value={text(t.ticket.ticketName)} />
                <InfoRow
                  label="체크인"
                  value={entranceTextOf(t.ticket.entrance, t.ticket.enteredAt)}
                />
                <InfoRow label="발급 일시" value={dateTimeText(t.ticket.issuedAt)} />
                <InfoRow label="주문 번호" value={text(t.ticket.orderNo)} />
              </section>
              <Divider />
              <section aria-label="주문자 · 소유자">
                <InfoRow label="주문자" value={text(t.ticket.buyerName)} />
                <InfoRow label="주문자 연락처" value={text(t.buyerPhone)} />
                <InfoRow label="소유자" value={<Owner t={t.ticket} />} />
                <InfoRow
                  label="소유자 연락처"
                  value={<span data-testid="ticket-detail-phones">{text(t.ownerPhone)}</span>}
                />
              </section>
              {t.optionAnswers.length > 0 && (
                <>
                  <Divider />
                  <OptionAnswers answers={t.optionAnswers} />
                </>
              )}
            </>
          )}
        </div>
      </ResponsiveOverlay>
    </div>
  );
}

/** 환불 탭(GF-1 · PF-2) — Figma·와이어 없음(탭 구성은 사용자 결정 2026-10-31, Q32). 표 + [환불 완료](요청 + 매니저만) */
export function RefundsTab({ eventId }: { eventId: string }) {
  const l = useRefundList(eventId);
  const columns = nowrapColumns<{ refund: RefundElement; canComplete: boolean }>([
    { id: 'orderNo', header: '주문 번호', cell: ({ refund: r }) => text(r.orderNo) },
    { id: 'buyer', header: '주문자', cell: ({ refund: r }) => text(r.buyerName) },
    { id: 'ticket', header: '티켓', cell: ({ refund: r }) => text(r.ticketName) },
    {
      id: 'amount',
      header: '환불 금액',
      align: 'right',
      cell: ({ refund: r }) => won(r.totalAmount),
    },
    {
      id: 'order',
      header: '주문 상태',
      cell: ({ refund: r }) => {
        const chip = orderStatusChipOf(r.status);
        return (
          <Chip color={chip.color} theme={chip.theme}>
            {chip.label}
          </Chip>
        );
      },
    },
    {
      id: 'refundStatus',
      header: '환불 상태',
      cell: ({ refund: r }) => (
        <span data-testid="refund-status">
          <Txt
            typography="labelMd"
            color={r.refundStatus === 'REQUESTED' ? colors.textDangerLabel : undefined}
          >
            {REFUND_STATUS_LABEL[r.refundStatus] || '—'}
          </Txt>
        </span>
      ),
    },
    { id: 'reason', header: '사유', cell: ({ refund: r }) => text(r.reason) },
    {
      id: 'requestedAt',
      header: '취소 일시',
      cell: ({ refund: r }) => dateTimeText(r.withdrawnAt),
    },
    ...(l.canSeeRefundAccount
      ? [
          {
            id: 'account',
            header: '환불 계좌',
            cell: ({ refund: r }: { refund: RefundElement }) =>
              r.refundAccount ? (
                <span data-testid="refund-account">
                  <Txt typography="labelMd" style={{ display: 'block' }}>
                    {r.refundAccount.bankName} {r.refundAccount.accountNumber}{' '}
                    {r.refundAccount.accountHolder}
                  </Txt>
                  <Txt typography="labelSm" color={colors.textSecondaryLabel}>
                    <span data-testid="refund-account-updated">
                      계좌 수정 {dateTimeText(r.refundAccount.updatedAt)}
                    </span>
                  </Txt>
                </span>
              ) : (
                '—'
              ),
          },
        ]
      : []),
    {
      id: 'action',
      header: <span className={s.srOnly}>처리</span>,
      cell: ({ refund: r, canComplete }) =>
        canComplete && r.orderUuid ? (
          <Button
            variant="secondary"
            size="sm"
            loading={l.pendingUuid === r.orderUuid}
            disabled={l.pendingUuid !== null}
            onClick={async () => {
              if (await l.complete(r.orderUuid!)) toast('환불 완료로 바꿨어요');
            }}
          >
            환불 완료
          </Button>
        ) : null,
    },
  ]);

  return (
    <div className={s.tab}>
      <FilterRow
        label="환불 상태"
        options={l.filters.map((f) => ({ ...f, count: null }))}
        onSelect={l.setStatus}
        testIdPrefix="refund-filter"
      />
      {l.actionError && <NoticeLine onDismiss={l.dismissActionError}>{l.actionError}</NoticeLine>}
      {l.status === 'error' ? (
        <ListError what="환불 목록" onRetry={l.retry} />
      ) : (
        <DataTable
          caption="환불 목록"
          columns={columns}
          data={l.rows}
          getRowId={({ refund: r }, i) => r.orderUuid ?? r.orderNo ?? String(i)}
          rowTestId="refund-row"
          pageIndex={l.page}
          pageCount={l.totalPages ?? 1}
          onPageChange={l.setPage}
          loading={l.status === 'pending' ? <ListLoading /> : undefined}
          empty={<Empty>환불 요청이 없어요</Empty>}
        />
      )}
    </div>
  );
}
