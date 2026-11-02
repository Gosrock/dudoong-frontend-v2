'use client';

import { HostingBoundary } from '@/features/hosting/access/HostingBoundary';
import { Tab, TabList, TabPanel, Tabs } from '@/ui/components/Tabs/Tabs';
import { Txt } from '@/ui/primitives/Txt';

import * as s from './GuestsView.css';
import { IssuedTicketsTab } from './IssuedTicketsTab';
import { GUEST_TABS, type GuestTab } from './model/guest-rules';
import { useGuestsUrlState } from './model/useGuestsUrlState';
import { useOrderDetail } from './model/useOrderDetail';
import { OrdersTab } from './OrdersTab';
import { RefundsTab } from './RefundsTab';
import { NoticeLine } from './ui/GuestParts';
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
  const detail = useOrderDetail(eventId, url.orderUuid, { onMissing: url.closeOrder });
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
        {detail.missingNotice && (
          <div className={s.panelNotice}>
            <NoticeLine onDismiss={detail.dismissMissingNotice}>{detail.missingNotice}</NoticeLine>
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
      {detail.open && (
        <OrderDetailOverlay key={url.orderUuid} state={detail} onClose={url.closeOrder} />
      )}
    </section>
  );
}
