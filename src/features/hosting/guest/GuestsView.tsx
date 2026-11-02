'use client';

import { type ReactNode, useState } from 'react';

import type { HostOrderElement } from '@/api/order/schema';
import { HostingBoundary } from '@/features/hosting/access/HostingBoundary';
import { Button } from '@/ui/components/Button/Button';
import { Checkbox } from '@/ui/components/Checkbox/Checkbox';
import { Chip } from '@/ui/components/Chip/Chip';
import { DataTable } from '@/ui/components/DataTable/DataTable';
import { Tab, TabList, TabPanel, Tabs } from '@/ui/components/Tabs/Tabs';
import { toast } from '@/ui/components/Toast/Toast';
import { Txt } from '@/ui/primitives/Txt';
import { formatWon } from '@/utils/money';

import * as s from './GuestsView.css';
import { IssuedTicketsTab, RefundsTab } from './GuestTabs';
import { GUEST_TABS, type GuestTab, isDudoongOrder } from './model/guest-rules';
import { bulkResultMessage, useBulkOrderActions } from './model/useBulkOrderActions';
import { useGuestsUrlState } from './model/useGuestsUrlState';
import { useOrderDetail } from './model/useOrderDetail';
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
  Toolbar,
} from './ui/GuestParts';
import * as p from './ui/GuestParts.css';
import { RefuseOverlay, SelectionBar } from './ui/OrderBulk';
import { OrderDetailOverlay } from './ui/OrderDetailOverlay';

/**
 * `/hosting/events/[eventId]/guests` 예매자 관리(P13a-V — **GUI 근거**, 2026-11-01 Ready: 데스크탑 `980:24267` · 모바일 `980:24474` 외,
 * `gui-screens.md` §0). 제목 → 탭(주문 · 발급된 티켓 · 환불) → 상태 필터 + 검색 → 표 → 페이지 · [엑셀로 다운로드].
 * 주문 상세는 `?order=`를 보고 페이지가 선언적으로 그린다(patterns §6) — 환불 탭 행도 같은 상세를 연다.
 */
export function GuestsView({ eventId }: { eventId: string }) {
  return (
    <HostingBoundary resetKeys={[eventId]}>
      <Guests eventId={eventId} />
    </HostingBoundary>
  );
}

function Guests({ eventId }: { eventId: string }) {
  const url = useGuestsUrlState();
  const d = useOrderDetail(eventId, url.orderUuid, { onMissing: url.closeOrder });
  return (
    <section aria-labelledby="guests-title" className={s.page}>
      <h1 id="guests-title" className={s.desktopTitle}>
        <Txt typography="headingLgEmphasized">예매자 관리</Txt>
      </h1>
      <Tabs value={url.tab} onValueChange={(v) => url.setTab(v as GuestTab)}>
        {/* GUI 데스크탑도 탭 44h · 16(`1026:4508` — DS tab 모바일 크기) */}
        <TabList aria-label="예매자 관리 탭" size="md">
          {GUEST_TABS.map((t) => (
            <Tab key={t.key} value={t.key}>
              {t.label}
            </Tab>
          ))}
        </TabList>
        {d.missingNotice && (
          <div className={s.panelNotice}>
            <NoticeLine onDismiss={d.dismissMissingNotice}>{d.missingNotice}</NoticeLine>
          </div>
        )}
        <TabPanel value="orders" className={s.panel}>
          <OrdersTab eventId={eventId} onOpen={url.openOrder} />
        </TabPanel>
        <TabPanel value="tickets" className={s.panel}>
          <IssuedTicketsTab eventId={eventId} />
        </TabPanel>
        <TabPanel value="refunds" className={s.panel}>
          <RefundsTab eventId={eventId} onOpen={url.openOrder} />
        </TabPanel>
      </Tabs>
      {d.open && <OrderDetailOverlay key={url.orderUuid} d={d} onClose={url.closeOrder} />}
    </section>
  );
}

/** 칸 클릭이 행 클릭(상세 열기)으로 번지지 않게 */
function StopRowClick({ children }: { children: ReactNode }) {
  return (
    <span
      className={p.rowActions}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {children}
    </span>
  );
}

function OrdersTab({ eventId, onOpen }: { eventId: string; onOpen: (uuid: string) => void }) {
  const l = useOrderList(eventId);
  const bulk = useBulkOrderActions(eventId);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  /** 행 [거절](주문 하나) · 선택 바 [거절](고른 주문) */
  const [refusing, setRefusing] = useState<readonly string[] | null>(null);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);

  const selectable = l.rows.filter((o) => bulk.isSelectable(o));
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
    const reason = result.failed.find((f) => f.message)?.message;
    setBulkNotice(result.failed.length > 0 ? (reason ?? null) : null);
    clearPicked();
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
    { id: 'quantity', header: '티켓 수', align: 'center', cell: (o) => o.quantity },
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

  const failed = l.status === 'error';
  const empty = l.status === 'success' && l.rows.length === 0;
  const refusingDudoong = (refusing ?? []).some((uuid) => {
    const row = l.rows.find((o) => o.orderUuid === uuid);
    return row ? isDudoongOrder(row) : false;
  });

  return (
    <div className={s.tab}>
      <Toolbar
        filters={
          <FilterRow
            label="주문 상태"
            options={l.statusTabs}
            onSelect={(k) => {
              clearPicked();
              l.setStatus(k);
            }}
            testIdPrefix="status"
          />
        }
        search={
          <SearchBar
            label="주문 검색어"
            types={l.searchTypes}
            type={l.searchType}
            onTypeChange={l.setSearchType}
            keyword={l.keywordInput}
            onKeywordChange={l.setKeywordInput}
            keywordMax={l.keywordMax}
            onSubmit={() => {
              clearPicked();
              l.submitSearch();
            }}
          />
        }
        hint={l.exactMatchHint}
      />
      {l.exportError && <NoticeLine onDismiss={l.dismissExportError}>{l.exportError}</NoticeLine>}
      {bulkNotice && <NoticeLine onDismiss={() => setBulkNotice(null)}>{bulkNotice}</NoticeLine>}
      <DataTable
        caption="주문 목록"
        columns={columns}
        data={failed ? [] : l.rows}
        getRowId={(o) => o.orderUuid}
        rowTestId="order-row"
        onRowClick={(o) => onOpen(o.orderUuid)}
        getRowLabel={(o) => `${text(o.orderNo)} ${text(o.buyerName)} 주문 상세`}
        isRowSelected={(o) => picked.has(o.orderUuid)}
        pageIndex={l.page}
        pageCount={l.totalPages ?? 1}
        onPageChange={(n) => {
          clearPicked();
          l.setPage(n);
        }}
        alwaysShowPagination
        loading={l.status === 'pending' ? <ListLoading /> : undefined}
        empty={
          failed ? (
            <ListError what="주문" onRetry={l.retry} />
          ) : (
            <Empty>{l.appliedKeyword ? '검색 결과가 없어요' : '주문이 없어요'}</Empty>
          )
        }
        footerEnd={
          l.canExport ? (
            <ExportButton
              label="주문 엑셀로 다운로드"
              exporting={l.exporting}
              disabled={failed || empty}
              onExport={() => void l.exportExcel()}
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
