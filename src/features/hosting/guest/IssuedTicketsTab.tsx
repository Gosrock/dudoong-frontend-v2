'use client';

import type { HostIssuedTicket } from '@/api/issued-ticket/schema';
import { Button } from '@/ui/components/Button/Button';
import { Chip } from '@/ui/components/Chip/Chip';
import { DataTable } from '@/ui/components/DataTable/DataTable';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { toast } from '@/ui/components/Toast/Toast';

import * as s from './GuestsView.css';
import { isGiftPending } from './model/guest-rules';
import { useIssuedTicketList } from './model/useIssuedTicketList';
import { DetailCell } from './ui/DetailCell';
import { NameWithGift } from './ui/GiftChip';
import { dateTimeText, entranceChipOf, text } from './ui/guest-labels';
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
import { IssuedTicketDetailOverlay } from './ui/IssuedTicketDetailOverlay';

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
  const list = useIssuedTicketList(eventId);
  const canCheckIn = list.checkIn.can && list.checkIn.blockMessage === null;

  const checkIn = async (ticket: Pick<HostIssuedTicket, 'ticketUuid' | 'ownerName'>) => {
    const uuid = ticket.ticketUuid;
    if (!uuid) return;
    // 확인 창 계약(patterns §6): 결과를 못 받으면(`false`) 열린 채, 받으면 결과 토스트와 함께 닫힌다
    await openConfirm({
      ...checkInConfirm(ticket.ownerName),
      onConfirm: async () => {
        const result = await list.checkIn.run(uuid);
        if (result?.kind !== 'result') return false;
        toast(result.tone === 'success' ? '입장 처리했어요.' : result.title);
        return true;
      },
    });
  };

  const columns = nowrapColumns<HostIssuedTicket>([
    // 모바일은 주문자 · 티켓 · 체크인(`1003:3143`), PC는 티켓 번호 · 티켓 · 주문자 · 주문 번호 · 발급 일시 · 체크인(`1030:8054`).
    { id: 'buyerMobile', header: '주문자', display: 'mobile', cell: (r) => text(r.buyerName) },
    {
      id: 'no',
      header: '티켓 번호',
      display: 'desktop',
      width: 128,
      cell: (r) => text(r.issuedTicketNo),
    },
    // 티켓 이름 옆 선물 칩은 GUI에 없다(🤖 Q110 — 모바일 · PC가 같이 쓰는 칸이라 DOM에 한 번만)
    {
      id: 'name',
      header: '티켓',
      cell: (r) => <NameWithGift name={text(r.ticketName)} giftState={r.giftState} />,
    },
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
        // 선물 대기 티켓은 서버가 입장시키지 않는다(GIFT_PENDING) — 버튼 대신 입장 전 칩, 이유는 상세에서
        if (r.entrance === 'BEFORE' && canCheckIn && r.ticketUuid && !isGiftPending(r)) {
          return (
            <StopRowClick>
              <Button
                variant="secondary"
                size="sm"
                loading={list.checkIn.pending}
                onClick={() => void checkIn(r)}
              >
                입장 처리
              </Button>
            </StopRowClick>
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

  const failed = list.status === 'error';
  const empty = list.status === 'success' && list.rows.length === 0;

  return (
    <div className={s.tab}>
      <Toolbar
        filters={
          <FilterRow
            label="입장 상태"
            options={list.entranceFilters}
            onSelect={list.setEntrance}
            testIdPrefix="entrance"
          />
        }
        search={
          <SearchBar
            label="티켓 검색어"
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
      {list.missingNotice && (
        <NoticeLine onDismiss={list.dismissMissingNotice}>{list.missingNotice}</NoticeLine>
      )}
      <DataTable
        caption="발급 티켓 목록"
        columns={columns}
        data={failed ? [] : list.rows}
        getRowId={(r, i) => r.ticketUuid ?? r.issuedTicketNo ?? String(i)}
        rowTestId="ticket-row"
        onRowClick={(r) => r.ticketUuid && list.openTicket(r.ticketUuid)}
        getRowLabel={(r) => `티켓 ${text(r.issuedTicketNo)} ${text(r.buyerName)} 상세`}
        pageIndex={list.pagination.page}
        pageCount={list.pagination.totalPages ?? 1}
        onPageChange={list.pagination.setPage}
        alwaysShowPagination
        loading={list.status === 'pending' ? <ListLoading /> : undefined}
        empty={
          failed ? (
            <ListError what="티켓" onRetry={list.retry} />
          ) : (
            <Empty>{list.search.applied ? '검색 결과가 없어요' : '발급된 티켓이 없어요'}</Empty>
          )
        }
        footerEnd={
          list.excel.can ? (
            <ExportButton
              label="티켓 엑셀로 다운로드"
              exporting={list.excel.pending}
              disabled={failed || empty}
              onExport={() => void list.excel.download()}
            />
          ) : undefined
        }
      />
      <IssuedTicketDetailOverlay list={list} onCheckIn={checkIn} />
    </div>
  );
}
