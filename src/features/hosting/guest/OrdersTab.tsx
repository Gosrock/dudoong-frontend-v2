'use client';

import { useState } from 'react';

import type { HostOrderElement } from '@/api/order/schema';
import { NoticeBox } from '@/features/hosting/shared/ui/NoticeBox';
import { Button } from '@/ui/components/Button/Button';
import { Checkbox } from '@/ui/components/Checkbox/Checkbox';
import { Chip } from '@/ui/components/Chip/Chip';
import { DataTable } from '@/ui/components/DataTable/DataTable';
import { toast } from '@/ui/components/Toast/Toast';
import { formatWon } from '@/utils/money';

import * as s from './GuestsView.css';
import { isDudoongOrder } from './model/guest-rules';
import {
  bulkFailureNotice,
  bulkResultMessage,
  useBulkOrderActions,
} from './model/useBulkOrderActions';
import { useOrderList } from './model/useOrderList';
import { DetailCell } from './ui/DetailCell';
import { dateTimeText, orderStatusChipOf, text } from './ui/guest-labels';
import {
  Empty,
  ExportButton,
  FilterRow,
  ListError,
  ListLoading,
  NoticeLine,
  nowrapColumns,
  SearchBar,
  StopRowClick,
  Toolbar,
} from './ui/GuestParts';
import { RefuseOverlay, SelectionBar } from './ui/OrderBulk';

export function OrdersTab({
  eventId,
  onOpen,
}: {
  eventId: string;
  onOpen: (uuid: string) => void;
}) {
  const list = useOrderList(eventId);
  const bulk = useBulkOrderActions(eventId);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  /** 행 [거절](주문 하나) · 선택 바 [거절](고른 주문) */
  const [refusing, setRefusing] = useState<readonly string[] | null>(null);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);

  const selectable = list.rows.filter((o) => bulk.isSelectable(o));
  const selected = selectable.filter((o) => picked.has(o.orderUuid)).map((o) => o.orderUuid);
  const allPicked = selectable.length > 0 && selected.length === selectable.length;
  const clearPicked = () => setPicked(new Set());
  const toggle = (uuid: string, on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(uuid);
      else next.delete(uuid);
      return next;
    });

  const report = (result: Awaited<ReturnType<typeof bulk.approveMany>>) => {
    if (!result) return false;
    toast(bulkResultMessage(result));
    setBulkNotice(bulkFailureNotice(result));
    // 처리한 주문은 선택에서 빼고 못 한 주문은 골라 둔다 — 바로 [거절]로 정리하게(GUI `1268:11182` · `1268:11906`, #175).
    // 그 사이 처리돼 고를 수 없게 된 주문은 `selected`가 거른다
    setPicked(new Set(result.failed.map((f) => f.orderUuid)));
    return true;
  };
  const approve = async (uuids: readonly string[]) => report(await bulk.approveMany(uuids));

  const columns = nowrapColumns<HostOrderElement>([
    {
      id: 'select',
      width: 20,
      header: (
        <Checkbox
          shape="square"
          aria-label="승인 대기 주문 모두 선택"
          checked={allPicked}
          disabled={selectable.length === 0}
          onCheckedChange={(on) =>
            setPicked(on ? new Set(selectable.map((o) => o.orderUuid)) : new Set())
          }
        />
      ),
      cell: (o) =>
        bulk.isSelectable(o) ? (
          <StopRowClick>
            <Checkbox
              shape="square"
              aria-label={`${text(o.buyerName)} 주문 선택`}
              checked={picked.has(o.orderUuid)}
              onCheckedChange={(on) => toggle(o.orderUuid, on)}
            />
          </StopRowClick>
        ) : null,
    },
    {
      id: 'orderNo',
      header: '주문 번호',
      display: 'desktop',
      width: 128,
      cell: (o) => text(o.orderNo),
    },
    { id: 'buyer', header: '주문자', cell: (o) => text(o.buyerName) },
    {
      id: 'quantity',
      header: '티켓 수',
      align: 'center',
      // GUI `1026:4550` 64 + 칸 간격 16(다른 칸과 같은 셈 — Figma 전수조사 2026-11-07)
      width: 80,
      cell: (o) => o.quantity,
    },
    {
      id: 'amount',
      header: '결제 금액',
      align: 'right',
      display: 'desktop',
      width: 120,
      cell: (o) => formatWon(o.totalAmount),
    },
    {
      id: 'orderedAt',
      header: '주문 일시',
      display: 'desktop',
      width: 192,
      cell: (o) => dateTimeText(o.orderedAt),
    },
    {
      id: 'status',
      header: '상태',
      width: 152,
      cell: (o) => {
        if (bulk.isSelectable(o)) {
          return (
            <StopRowClick>
              <Button
                variant="secondary"
                size="sm"
                disabled={bulk.pending !== null}
                onClick={() => setRefusing([o.orderUuid])}
              >
                거절
              </Button>
              <Button
                size="sm"
                disabled={bulk.pending !== null}
                onClick={() => void approve([o.orderUuid])}
              >
                승인
              </Button>
            </StopRowClick>
          );
        }
        const chip = orderStatusChipOf(o.status);
        return (
          <Chip shape="round" color={chip.color} theme={chip.theme}>
            <span data-testid="order-status">{chip.label}</span>
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
  const empty = list.status === 'success' && list.rows.length === 0;
  const refusingDudoong = (refusing ?? []).some((uuid) => {
    const row = list.rows.find((o) => o.orderUuid === uuid);
    return row ? isDudoongOrder(row) : false;
  });

  return (
    <div className={s.tab}>
      <Toolbar
        filters={
          <FilterRow
            label="주문 상태"
            options={list.statusTabs}
            onSelect={(k) => {
              clearPicked();
              list.setStatus(k);
            }}
            testIdPrefix="status"
          />
        }
        search={
          <SearchBar
            label="주문 검색어"
            types={list.search.types}
            type={list.search.type}
            onTypeChange={list.search.setType}
            keyword={list.search.input}
            onKeywordChange={list.search.setInput}
            keywordMax={list.search.max}
            onSubmit={() => {
              clearPicked();
              list.search.submit();
            }}
          />
        }
        hint={list.search.exactMatchHint}
      />
      {list.excel.error && (
        <NoticeLine onDismiss={list.excel.dismissError}>{list.excel.error}</NoticeLine>
      )}
      {bulkNotice && (
        // 일괄 처리 실패 안내 — GUI "일부 실패 안내"(`1269:27557` · PC `1269:28457`, #175)
        <NoticeBox icon="important" onDismiss={() => setBulkNotice(null)}>
          <span data-testid="bulk-failure-notice">{bulkNotice}</span>
        </NoticeBox>
      )}
      <DataTable
        caption="주문 목록"
        columns={columns}
        data={failed ? [] : list.rows}
        getRowId={(o) => o.orderUuid}
        rowTestId="order-row"
        onRowClick={(o) => onOpen(o.orderUuid)}
        getRowLabel={(o) => `${text(o.orderNo)} ${text(o.buyerName)} 주문 상세`}
        isRowSelected={(o) => picked.has(o.orderUuid)}
        pageIndex={list.pagination.page}
        pageCount={list.pagination.totalPages ?? 1}
        onPageChange={(n) => {
          clearPicked();
          list.pagination.setPage(n);
        }}
        // 행이 있을 때만 페이지 줄(빈 · 결과 없음 · 실패에는 없다 — GUI `1029:4849` · `1029:5135` · `1031:9948`, Figma 전수조사 2026-11-07)
        alwaysShowPagination={!failed && list.rows.length > 0}
        loading={list.status === 'pending' ? <ListLoading /> : undefined}
        empty={
          failed ? (
            <ListError what="주문" onRetry={list.retry} />
          ) : (
            <Empty>{list.search.applied ? list.search.emptyMessage : '주문이 없어요'}</Empty>
          )
        }
        footerEnd={
          list.excel.can ? (
            <ExportButton
              label="주문 엑셀로 다운로드"
              exporting={list.excel.pending}
              disabled={failed || empty}
              onExport={() => void list.excel.download()}
            />
          ) : undefined
        }
      />
      <SelectionBar
        count={selected.length}
        pending={bulk.pending}
        onRefuse={() => setRefusing(selected)}
        onApprove={() => void approve(selected)}
      />
      <RefuseOverlay
        open={refusing !== null}
        count={refusing?.length ?? 0}
        dudoong={refusingDudoong}
        pending={bulk.pending === 'refuse'}
        onClose={() => setRefusing(null)}
        onSubmit={async (body) => report(await bulk.refuseMany(refusing ?? [], body))}
      />
    </div>
  );
}
