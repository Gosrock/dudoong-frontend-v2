'use client';

import { isSessionLost } from '@/api/errors';
import type { HostOrderElement } from '@/api/order/schema';
import { HostingAccessRejected } from '@/features/hosting/access/HostingAccessRejected';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { Chip } from '@/ui/components/Chip/Chip';
import { DataTable } from '@/ui/components/DataTable/DataTable';
import { Tab, TabList, TabPanel, Tabs } from '@/ui/components/Tabs/Tabs';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './GuestsView.css';
import { IssuedTicketsTab, RefundsTab } from './GuestTabs';
import { GUEST_TABS, type GuestTab } from './model/guest-rules';
import { useGuestsUrlState } from './model/useGuestsUrlState';
import { useOrderDetail } from './model/useOrderDetail';
import { useOrderList } from './model/useOrderList';
import { DetailCell } from './ui/DetailCell';
import { dateTimeText, orderStatusChipOf, REFUND_STATUS_LABEL, text, won } from './ui/guest-labels';
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
import { OrderDetailOverlay } from './ui/OrderDetailOverlay';

/**
 * `/hosting/events/[eventId]/guests` 예매자 관리(P13a-V — **와이어 근거**, GUI 페이지 `724:5256` 비어 있음).
 * 와이어 `424:11710`(주문) · `424:12014`(발급된 티켓): 탭 → 상태 칩 → 검색 줄 → 표(가로 스크롤) → 페이지 · [엑셀로 다운로드].
 * 탭은 와이어 두 개 + 환불 탭(계획 — Q32, 사용자 결정 2026-10-31). 주문 상세는 `?order=`를 보고 페이지가 선언적으로 그린다(patterns §6).
 */
export function GuestsView({ eventId }: { eventId: string }) {
  return (
    <AsyncBoundary holdOn={isSessionLost} rejected={HostingAccessRejected} resetKeys={[eventId]}>
      <Guests eventId={eventId} />
    </AsyncBoundary>
  );
}

function Guests({ eventId }: { eventId: string }) {
  const url = useGuestsUrlState();
  return (
    <section aria-labelledby="guests-title" className={s.page}>
      <h1 id="guests-title" className={s.desktopTitle}>
        <Txt typography="headingLgEmphasized">예매자 관리</Txt>
      </h1>
      {/* 와이어는 회색 바탕 세그먼트(주문 | 발급된 티켓) — DS에 세그먼트가 없어 DS Tabs(밑줄형)로 */}
      <Tabs value={url.tab} onValueChange={(v) => url.setTab(v as GuestTab)}>
        <TabList aria-label="예매자 관리 탭" size="responsive">
          {GUEST_TABS.map((t) => (
            <Tab key={t.key} value={t.key}>
              {t.label}
            </Tab>
          ))}
        </TabList>
        <TabPanel value="orders" className={s.panel}>
          <OrdersTab
            eventId={eventId}
            orderUuid={url.orderUuid}
            onOpen={url.openOrder}
            onClose={url.closeOrder}
          />
        </TabPanel>
        <TabPanel value="tickets" className={s.panel}>
          <IssuedTicketsTab eventId={eventId} />
        </TabPanel>
        <TabPanel value="refunds" className={s.panel}>
          <RefundsTab eventId={eventId} />
        </TabPanel>
      </Tabs>
    </section>
  );
}

const ORDER_COLUMNS = nowrapColumns<HostOrderElement>([
  { id: 'orderNo', header: '주문 번호', cell: (o) => text(o.orderNo) },
  { id: 'buyer', header: '주문자', cell: (o) => text(o.buyerName) },
  {
    id: 'phone',
    header: '연락처',
    cell: (o) => <span data-testid="order-phone">{text(o.buyerPhone)}</span>,
  },
  {
    id: 'depositor',
    header: '입금자명',
    cell: (o) => <span data-testid="order-depositor">{text(o.depositorName)}</span>,
  },
  { id: 'ticket', header: '티켓', cell: (o) => text(o.ticketName) },
  { id: 'quantity', header: '티켓 수', align: 'right', cell: (o) => o.quantity },
  { id: 'amount', header: '총 결제금액', align: 'right', cell: (o) => won(o.totalAmount) },
  { id: 'orderedAt', header: '주문 일시', cell: (o) => dateTimeText(o.orderedAt) },
  {
    id: 'status',
    header: '상태',
    cell: (o) => {
      const chip = orderStatusChipOf(o.status);
      return (
        <Chip color={chip.color} theme={chip.theme}>
          <span data-testid="order-status">{chip.label}</span>
        </Chip>
      );
    },
  },
  {
    id: 'refund',
    header: '환불 여부',
    cell: (o) => (
      <Txt typography="labelMd" color={colors.textDangerLabel}>
        {REFUND_STATUS_LABEL[o.refundStatus]}
      </Txt>
    ),
  },
  { id: 'detail', header: <span className={s.srOnly}>상세</span>, cell: () => <DetailCell /> },
]);

function OrdersTab({
  eventId,
  orderUuid,
  onOpen,
  onClose,
}: {
  eventId: string;
  orderUuid: string | null;
  onOpen: (uuid: string) => void;
  onClose: () => void;
}) {
  const l = useOrderList(eventId);
  const d = useOrderDetail(eventId, orderUuid, { onMissing: onClose });
  return (
    <div className={s.tab}>
      <FilterRow
        label="주문 상태"
        options={l.statusTabs}
        onSelect={l.setStatus}
        testIdPrefix="status"
      />
      <SearchBar
        label="주문 검색어"
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
      {d.missingNotice && (
        <NoticeLine onDismiss={d.dismissMissingNotice}>{d.missingNotice}</NoticeLine>
      )}
      {l.status === 'error' ? (
        <ListError what="주문" onRetry={l.retry} />
      ) : (
        <DataTable
          caption="주문 목록"
          columns={ORDER_COLUMNS}
          data={l.rows}
          getRowId={(o) => o.orderUuid}
          rowTestId="order-row"
          onRowClick={(o) => onOpen(o.orderUuid)}
          getRowLabel={(o) => `${text(o.orderNo)} ${text(o.buyerName)} 주문 상세`}
          pageIndex={l.page}
          pageCount={l.totalPages ?? 1}
          onPageChange={l.setPage}
          loading={l.status === 'pending' ? <ListLoading /> : undefined}
          empty={<Empty>{l.appliedKeyword ? '검색 결과가 없어요' : '주문이 없어요'}</Empty>}
        />
      )}
      {l.canExport && (
        <TableFooter>
          <ExportButton
            label="주문 엑셀로 다운로드"
            exporting={l.exporting}
            onExport={() => void l.exportExcel()}
          />
        </TableFooter>
      )}
      {d.open && <OrderDetailOverlay key={orderUuid} d={d} onClose={onClose} />}
    </div>
  );
}
