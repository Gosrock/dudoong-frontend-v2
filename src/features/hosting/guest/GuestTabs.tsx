'use client';

import type { HostIssuedTicket } from '@/api/issued-ticket/schema';
import type { RefundElement } from '@/api/order/schema';
import { NoticeBox } from '@/features/hosting/ticket/ui/TicketParts';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { Chip } from '@/ui/components/Chip/Chip';
import { DataTable } from '@/ui/components/DataTable/DataTable';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { toast } from '@/ui/components/Toast/Toast';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';
import { formatWon } from '@/utils/money';

import * as s from './GuestsView.css';
import { refundRowStateOf } from './model/guest-rules';
import { useIssuedTicketList } from './model/useIssuedTicketList';
import { useRefundList } from './model/useRefundList';
import { DetailCell } from './ui/DetailCell';
import {
  dateTimeText,
  entranceChipOf,
  PAY_TYPE_CHIP_LABEL,
  REFUND_STATE_CHIP,
  text,
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
  Toolbar,
} from './ui/GuestParts';
import * as p from './ui/GuestParts.css';
import { Line, OptionAnswers, Section } from './ui/OrderDetailOverlay';
import * as o from './ui/OrderDetailOverlay.css';

/** [수동 입장 처리] 확인(#106 §5 — 입장 처리는 되돌릴 API가 없다, B37). GUI는 확인 없이 토스트(`1030:8448`) — 🤖 확인 유지 */
const checkInConfirm = (ownerName: string | null) => ({
  title: `${text(ownerName)}님 티켓을 입장 처리할까요?`,
  description: 'QR을 읽을 수 없을 때 써 주세요. 입장 처리는 되돌릴 수 없어요.',
  confirmLabel: '입장 처리',
});

/**
 * 발급된 티켓 탭(GI-1 · GI-2 · GI-3 · 수동 입장 PQ-2) — GUI `1030:8054`(PC) · `1003:3143`(모바일) · 입장 처리 완료 `1030:8448` ·
 * 검색 기준 열림 `1030:8703` · 티켓 상세 입장 전 `1030:8955` · 입장 완료 `1030:9136`.
 * 입장 취소(`1030:9318`)는 API가 없어 그리지 않는다(backend-questions B37). 검색 기준 "주문 번호 · 입금자명 · 티켓 번호"도 API가 없다(B36)
 */
export function IssuedTicketsTab({ eventId }: { eventId: string }) {
  const l = useIssuedTicketList(eventId);
  const t = l.detail;
  const canCheckIn = l.canManualCheckIn && l.checkInBlockMessage === null;

  const checkIn = async (ticket: Pick<HostIssuedTicket, 'ticketUuid' | 'ownerName'>) => {
    const uuid = ticket.ticketUuid;
    if (!uuid) return;
    // 확인 창 계약(patterns §6): 결과를 못 받으면(`false`) 열린 채, 받으면 결과 토스트와 함께 닫힌다
    await openConfirm({
      ...checkInConfirm(ticket.ownerName),
      onConfirm: async () => {
        const result = await l.manualCheckIn(uuid);
        if (result?.kind !== 'result') return false;
        toast(result.tone === 'success' ? '입장 처리했어요.' : result.title);
        return true;
      },
    });
  };

  const columns = nowrapColumns<HostIssuedTicket>([
    // 모바일은 주문자 · 티켓 · 체크인(`1003:3143`), PC는 티켓 번호 · 티켓 · 주문자 · 주문 번호 · 발급 일시 · 체크인(`1030:8054`)
    { id: 'buyerMobile', header: '주문자', display: 'mobile', cell: (r) => text(r.buyerName) },
    {
      id: 'no',
      header: '티켓 번호',
      display: 'desktop',
      width: 128,
      cell: (r) => text(r.issuedTicketNo),
    },
    { id: 'name', header: '티켓', cell: (r) => text(r.ticketName) },
    {
      id: 'buyer',
      header: '주문자',
      display: 'desktop',
      width: 156,
      cell: (r) => text(r.buyerName),
    },
    {
      id: 'orderNo',
      header: '주문 번호',
      display: 'desktop',
      width: 136,
      cell: (r) => text(r.orderNo),
    },
    {
      id: 'issuedAt',
      header: '발급 일시',
      display: 'desktop',
      width: 192,
      cell: (r) => dateTimeText(r.issuedAt),
    },
    {
      id: 'entrance',
      header: '체크인',
      width: 152,
      cell: (r) => {
        if (r.entrance === 'BEFORE' && canCheckIn && r.ticketUuid) {
          return (
            <span
              className={p.rowActions}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Button
                variant="secondary"
                size="sm"
                loading={l.checkingIn}
                onClick={() => void checkIn(r)}
              >
                입장 처리
              </Button>
            </span>
          );
        }
        const chip = entranceChipOf(r.entrance, 'weak');
        return (
          <Chip shape="round" color={chip.color} theme={chip.theme}>
            <span data-testid="ticket-entrance">{chip.label}</span>
          </Chip>
        );
      },
    },
    {
      id: 'detail',
      header: <span className={s.srOnly}>상세</span>,
      width: 40,
      cell: () => <DetailCell />,
    },
  ]);

  const failed = l.status === 'error';
  const empty = l.status === 'success' && l.rows.length === 0;
  const entranceChip = t ? entranceChipOf(t.ticket.entrance, 'border') : null;
  const payType = t ? PAY_TYPE_CHIP_LABEL[t.ticket.payType ?? 'UNKNOWN'] : null;

  return (
    <div className={s.tab}>
      <Toolbar
        filters={
          <FilterRow
            label="입장 상태"
            options={l.entranceFilters}
            onSelect={l.setEntrance}
            testIdPrefix="entrance"
          />
        }
        search={
          <SearchBar
            label="티켓 검색어"
            types={l.searchTypes}
            type={l.searchType}
            onTypeChange={l.setSearchType}
            keyword={l.keywordInput}
            onKeywordChange={l.setKeywordInput}
            keywordMax={l.keywordMax}
            onSubmit={l.submitSearch}
          />
        }
        hint={l.exactMatchHint}
      />
      {l.exportError && <NoticeLine onDismiss={l.dismissExportError}>{l.exportError}</NoticeLine>}
      {l.missingNotice && (
        <NoticeLine onDismiss={l.dismissMissingNotice}>{l.missingNotice}</NoticeLine>
      )}
      <DataTable
        caption="발급 티켓 목록"
        columns={columns}
        data={failed ? [] : l.rows}
        getRowId={(r, i) => r.ticketUuid ?? r.issuedTicketNo ?? String(i)}
        rowTestId="ticket-row"
        onRowClick={(r) => r.ticketUuid && l.openTicket(r.ticketUuid)}
        getRowLabel={(r) => `티켓 ${text(r.issuedTicketNo)} ${text(r.buyerName)} 상세`}
        pageIndex={l.page}
        pageCount={l.totalPages ?? 1}
        onPageChange={l.setPage}
        alwaysShowPagination
        loading={l.status === 'pending' ? <ListLoading /> : undefined}
        empty={
          failed ? (
            <ListError what="티켓" onRetry={l.retry} />
          ) : (
            <Empty>{l.appliedKeyword ? '검색 결과가 없어요' : '발급된 티켓이 없어요'}</Empty>
          )
        }
        footerEnd={
          l.canExport ? (
            <ExportButton
              label="티켓 엑셀로 다운로드"
              exporting={l.exporting}
              disabled={failed || empty}
              onExport={() => void l.exportExcel()}
            />
          ) : undefined
        }
      />
      <ResponsiveOverlay
        open={l.selectedTicketUuid !== null}
        onOpenChange={(open) => !open && l.closeTicket()}
        title={
          t && entranceChip ? (
            <span className={o.titleRow}>
              <span>{text(t.ticket.issuedTicketNo)}</span>
              <Chip shape="round" color={entranceChip.color} theme={entranceChip.theme}>
                <span data-testid="ticket-detail-entrance">{entranceChip.label}</span>
              </Chip>
              {payType && (
                <Chip shape="round" color="violet" theme="weak">
                  {payType}
                </Chip>
              )}
            </span>
          ) : (
            '티켓 상세'
          )
        }
        description={t ? text(t.ticket.ticketName) : undefined}
        footer={
          t && t.ticket.entrance === 'BEFORE' && t.ticket.ticketUuid && l.canManualCheckIn ? (
            l.checkInBlockMessage ? (
              <Txt
                as="p"
                typography="bodyMd"
                color={colors.textPrimaryLabel}
                className={o.centerNote}
              >
                {l.checkInBlockMessage}
              </Txt>
            ) : (
              <Button
                size="lg"
                fullWidth
                loading={l.checkingIn}
                onClick={() => void checkIn(t.ticket)}
              >
                입장 처리
              </Button>
            )
          ) : undefined
        }
      >
        <div data-testid="ticket-detail" className={o.body}>
          {l.detailStatus === 'pending' && <ListLoading />}
          {t && (
            <>
              <Section title="티켓 정보">
                <dl className={o.lines}>
                  <Line label="주문자">{text(t.ticket.buyerName)}</Line>
                  <Line label="주문 번호">{text(t.ticket.orderNo)}</Line>
                  <Line label="발급 일시">{dateTimeText(t.ticket.issuedAt)}</Line>
                  {t.ticket.entrance === 'DONE' && (
                    <Line label="입장 일시">{dateTimeText(t.ticket.enteredAt)}</Line>
                  )}
                </dl>
              </Section>
              {t.optionAnswers.length > 0 && (
                <Section title="옵션 응답">
                  <div className={o.card}>
                    <OptionAnswers answers={t.optionAnswers} />
                  </div>
                </Section>
              )}
            </>
          )}
        </div>
      </ResponsiveOverlay>
    </div>
  );
}

/**
 * 환불 탭(GF-1) — GUI `1031:9189`(PC) · `1009:4319`(모바일) · 환불 완료 처리 `1031:9567` · 빈 상태 `1031:9948`.
 * 노란 안내 → 상태 필터 → 표(주문 번호 · 주문자 · 환불 금액 · 일시 · 상태 ›). 행을 누르면 주문 상세(`?order=`) — [환불 완료]는 상세에서.
 * GF-1에 검색 · 상태별 건수 · 엑셀 · 주문 일시가 없어 검색 줄 · 칩 숫자 · 엑셀을 그리지 않고 일시 칸은 취소 일시(backend-questions B36)
 */
export function RefundsTab({
  eventId,
  onOpen,
}: {
  eventId: string;
  onOpen: (uuid: string) => void;
}) {
  const l = useRefundList(eventId);
  const columns = nowrapColumns<{ refund: RefundElement }>([
    {
      id: 'orderNo',
      header: '주문 번호',
      display: 'desktop',
      width: 136,
      cell: ({ refund: r }) => text(r.orderNo),
    },
    { id: 'buyer', header: '주문자', cell: ({ refund: r }) => text(r.buyerName) },
    {
      id: 'amount',
      header: '환불 금액',
      align: 'right',
      cell: ({ refund: r }) => formatWon(r.totalAmount),
    },
    {
      id: 'withdrawnAt',
      header: '취소 일시',
      display: 'desktop',
      width: 192,
      cell: ({ refund: r }) => dateTimeText(r.withdrawnAt),
    },
    {
      id: 'refundStatus',
      header: '상태',
      width: 152,
      cell: ({ refund: r }) => {
        const state = refundRowStateOf(r, l.canSeeRefundAccount);
        if (!state) return '—';
        const chip = REFUND_STATE_CHIP[state];
        return (
          <Chip shape="round" color={chip.color} theme={chip.theme}>
            <span data-testid="refund-status">{chip.label}</span>
          </Chip>
        );
      },
    },
    {
      id: 'detail',
      header: <span className={s.srOnly}>상세</span>,
      width: 40,
      cell: () => <DetailCell />,
    },
  ]);

  const failed = l.status === 'error';
  return (
    <div className={s.tab}>
      <NoticeBox icon="important">예매자 계좌로 직접 보낸 뒤 [환불 완료]를 눌러주세요</NoticeBox>
      <Toolbar
        filters={
          <FilterRow
            label="환불 상태"
            options={l.filters.map((f) => ({ ...f, count: null }))}
            onSelect={l.setStatus}
            testIdPrefix="refund-filter"
          />
        }
      />
      {l.actionError && <NoticeLine onDismiss={l.dismissActionError}>{l.actionError}</NoticeLine>}
      <DataTable
        caption="환불 목록"
        columns={columns}
        data={failed ? [] : l.rows}
        getRowId={({ refund: r }, i) => r.orderUuid ?? r.orderNo ?? String(i)}
        rowTestId="refund-row"
        onRowClick={({ refund: r }) => r.orderUuid && onOpen(r.orderUuid)}
        getRowLabel={({ refund: r }) => `${text(r.orderNo)} ${text(r.buyerName)} 주문 상세`}
        pageIndex={l.page}
        pageCount={l.totalPages ?? 1}
        onPageChange={l.setPage}
        alwaysShowPagination
        loading={l.status === 'pending' ? <ListLoading /> : undefined}
        empty={
          failed ? (
            <ListError what="환불 목록" onRetry={l.retry} />
          ) : (
            <Empty>환불할 주문이 없어요.</Empty>
          )
        }
      />
    </div>
  );
}
