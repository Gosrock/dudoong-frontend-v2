'use client';

import type { RefundElement } from '@/api/order/schema';
import { NoticeBox } from '@/features/hosting/shared/ui/NoticeBox';
import { Chip } from '@/ui/components/Chip/Chip';
import { DataTable } from '@/ui/components/DataTable/DataTable';
import { formatWon } from '@/utils/money';

import * as s from './GuestsView.css';
import { refundRowStateOf } from './model/guest-rules';
import { useRefundList } from './model/useRefundList';
import { DetailCell } from './ui/DetailCell';
import { dateTimeText, REFUND_STATE_CHIP, text } from './ui/guest-labels';
import {
  Empty,
  FilterRow,
  ListError,
  ListLoading,
  NoticeLine,
  nowrapColumns,
  Toolbar,
} from './ui/GuestParts';

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
  const list = useRefundList(eventId);
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
        const state = refundRowStateOf(r, list.canSeeRefundAccount);
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

  const failed = list.status === 'error';
  return (
    <div className={s.tab}>
      <NoticeBox icon="important">예매자 계좌로 직접 보낸 뒤 [환불 완료]를 눌러주세요</NoticeBox>
      <Toolbar
        filters={
          <FilterRow
            label="환불 상태"
            options={list.filters.map((f) => ({ ...f, count: null }))}
            onSelect={list.setStatus}
            testIdPrefix="refund-filter"
          />
        }
      />
      {list.actionError && (
        <NoticeLine onDismiss={list.dismissActionError}>{list.actionError}</NoticeLine>
      )}
      <DataTable
        caption="환불 목록"
        columns={columns}
        data={failed ? [] : list.rows}
        getRowId={({ refund: r }, i) => r.orderUuid ?? r.orderNo ?? String(i)}
        rowTestId="refund-row"
        onRowClick={({ refund: r }) => r.orderUuid && onOpen(r.orderUuid)}
        getRowLabel={({ refund: r }) => `${text(r.orderNo)} ${text(r.buyerName)} 주문 상세`}
        pageIndex={list.pagination.page}
        pageCount={list.pagination.totalPages ?? 1}
        onPageChange={list.pagination.setPage}
        alwaysShowPagination
        loading={list.status === 'pending' ? <ListLoading /> : undefined}
        empty={
          failed ? (
            <ListError what="환불 목록" onRetry={list.retry} />
          ) : (
            <Empty>환불할 주문이 없어요.</Empty>
          )
        }
      />
    </div>
  );
}
