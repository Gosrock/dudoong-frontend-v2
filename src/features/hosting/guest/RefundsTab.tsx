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
  ExportButton,
  FilterRow,
  ListError,
  ListLoading,
  NoticeLine,
  nowrapColumns,
  SearchBar,
  Toolbar,
} from './ui/GuestParts';

/**
 * 환불 탭(GF-1 · GF-1b · GF-3) — GUI `1031:9189`(PC) · `1009:4319`(모바일) · 환불 완료 처리 `1031:9567` · 빈 상태 `1031:9948`.
 * 노란 안내 → 상태 필터(건수) · 검색 → 표(주문 번호 · 주문자 · 환불 금액 · 주문 일시 · 상태 ›) → 엑셀(매니저 이상). 행을 누르면 주문 상세
 * (`?order=`) — [환불 완료]는 상세에서. 검색 · 건수 · 엑셀 · 주문 일시는 백엔드 #929(B36 — 2.5.7)
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
    // 모바일은 주문자가 남은 폭, 환불 금액 80 · 상태 88 · 상세 20 고정(`1009:4318` — `mobileWidth`는 칸 사이 8 · 끝 8을 더한 값, I-h5)
    { id: 'buyer', header: '주문자', cell: ({ refund: r }) => text(r.buyerName) },
    {
      id: 'amount',
      header: '환불 금액',
      align: 'right',
      mobileWidth: 88,
      cell: ({ refund: r }) => formatWon(r.totalAmount),
    },
    {
      id: 'orderedAt',
      header: '주문 일시',
      display: 'desktop',
      width: 192,
      // 운영 2.5.3 응답에는 `orderedAt`이 없다(컷오버 때 올라간다) — 그때는 "—"
      cell: ({ refund: r }) => dateTimeText(r.orderedAt ?? null),
    },
    {
      id: 'refundStatus',
      header: '상태',
      width: 152,
      mobileWidth: 96,
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
      mobileWidth: 32,
      cell: () => <DetailCell />,
    },
  ]);

  const failed = list.status === 'error';
  const empty = list.status === 'success' && list.rows.length === 0;
  return (
    <div className={s.tab}>
      <NoticeBox icon="important">예매자 계좌로 직접 보낸 뒤 [환불 완료]를 눌러주세요</NoticeBox>
      <Toolbar
        filters={
          <FilterRow
            label="환불 상태"
            options={list.filters}
            onSelect={list.setStatus}
            testIdPrefix="refund-filter"
          />
        }
        search={
          <SearchBar
            label="환불 검색어"
            types={list.search.types}
            type={list.search.type}
            onTypeChange={list.search.setType}
            keyword={list.search.input}
            onKeywordChange={list.search.setInput}
            keywordMax={list.search.max}
            onSubmit={list.search.submit}
          />
        }
        hint={list.search.exactMatchHint}
      />
      {list.excel.error && (
        <NoticeLine onDismiss={list.excel.dismissError}>{list.excel.error}</NoticeLine>
      )}
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
        // 행이 있을 때만 페이지 줄(빈 · 결과 없음 · 실패에는 없다 — GUI `1029:4849` · `1029:5135` · `1031:9948`, Figma 전수조사 2026-11-07)
        alwaysShowPagination={!failed && list.rows.length > 0}
        loading={list.status === 'pending' ? <ListLoading /> : undefined}
        empty={
          failed ? (
            <ListError what="환불 목록" onRetry={list.retry} />
          ) : (
            <Empty>
              {list.search.applied ? list.search.emptyMessage : '환불할 주문이 없어요.'}
            </Empty>
          )
        }
        footerEnd={
          list.excel.can ? (
            <ExportButton
              label="환불 엑셀로 다운로드"
              exporting={list.excel.pending}
              disabled={failed || empty}
              onExport={() => void list.excel.download()}
            />
          ) : undefined
        }
      />
    </div>
  );
}
