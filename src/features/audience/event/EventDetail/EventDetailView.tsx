'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useId, useLayoutEffect, useState } from 'react';

import type { EventDetail } from '@/api/event/schema';
import { SectionViewer } from '@/features/shared/section-viewer/ui/SectionViewer';
import { Button } from '@/ui/components/Button/Button';
import { Chip } from '@/ui/components/Chip/Chip';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { Tab, TabList, TabPanel, Tabs } from '@/ui/components/Tabs/Tabs';
import { UploadedImage } from '@/ui/components/UploadedImage/UploadedImage';
import { Icon } from '@/ui/icons/Icon';
import { Container } from '@/ui/primitives/Container';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { EventSchedule } from '../model/event-schedule';
import { useEventDetail } from '../model/useEventDetail';
import { useTicketSelection } from '../model/useTicketSelection';
import { openEventContacts } from './EventContactsOverlay';
import * as s from './EventDetailView.css';
import { shareEvent } from './shareEvent';
import { TicketOptionList } from './TicketOptionList';
import { TicketSelector } from './TicketSelector';
import { TicketSheet } from './TicketSheet';
import { eventWeek } from './week-calendar';

/**
 * 공연 상세(P5b-V) — 근거는 와이어(공연상세 GUI `759:12772`는 Ready for dev 아님, gui-screens §0).
 * 모바일 `121:1216`: 포스터(+ 공유) → 제목 → 해시태그 → 호스트·장소·일시 → 티켓 옵션 카드 → 섹션 탭 → 하단 고정 [문의][티켓 구매하기].
 * PC `640:1957`: 두 열 — 왼쪽 포스터 + 정보 표 + 예매 안내 문구, 그 아래 탭·본문 / 오른쪽 고정 카드(주간 달력 · 티켓 옵션 · [공유][티켓 구매하기]).
 * 모바일 하단 바와 PC 카드는 같은 DOM에 있고 CSS가 보일 것을 정한다(patterns §1).
 *
 * 재고(GP-5)는 브라우저에서만 읽는다(`useTicketSelection` — 응답 HTML에 재고 값이 없다).
 * 티켓 고르기(P6-V): 선택 상태는 이 화면의 `useTicketSelection` 하나 — PC는 오른쪽 카드의 `TicketSelector`, 모바일은
 * 하단 [티켓 구매하기]가 여는 바텀시트(`TicketSheet`, 열 때 마운트) 안의 같은 `TicketSelector`. 모바일 "티켓 옵션" 카드는 표시만.
 */
export function EventDetailView({ eventId }: { eventId: string }) {
  const { event, title, schedule, hashtags, tabs } = useEventDetail(eventId);
  const tickets = useTicketSelection(eventId, event.displayStatus);
  const [tab, setTab] = useState(tabs[0]?.key ?? '');
  const ids = useId();
  const mobileTicketsId = `${ids}-tickets-m`;
  const desktopTicketsId = `${ids}-tickets-d`;
  const hasContacts = event.contacts.length > 0;
  const openContacts = () => openEventContacts(eventId, event.host);
  const share = () => void shareEvent(event);
  const router = useRouter();
  // 살 수 있는 티켓이 있을 때만 모바일 [티켓 구매하기]가 시트를 연다
  const canBuy = tickets.listState === 'AVAILABLE';
  const [sheet, setSheet] = useState<'closed' | 'open' | 'closing'>('closed');
  const setSheetOpen = useCallback(
    (open: boolean) => setSheet((cur) => (open ? 'open' : cur === 'closed' ? 'closed' : 'closing')),
    [],
  );
  // 이 화면이 숨겨지면(다른 화면으로 이동 — Next가 이전 화면을 Activity로 숨겨 DOM에 남긴다, patterns §10-4) 시트를 바로 뗀다.
  // 시트를 닫으며 이동하면 닫힘 타이머(`useOnExited`)가 숨김과 함께 정리돼 'closing'에 멈추고, 숨은 화면 안에
  // role=dialog가 남는다(이슈 #92-9). 숨김·언마운트 때만 도는 정리라 처음 그릴 때(닫힌 상태)는 바뀌는 것이 없다
  useLayoutEffect(() => () => setSheet('closed'), []);
  const { checkoutHref } = tickets;
  const buyFromCard = () => checkoutHref && router.push(checkoutHref);
  // 시트에서 살 때는 시트를 닫아 그 기록 항목을 먼저 소비하고(BottomSheet가 history.back) 그 뒤에 push한다 — 기록이
  // [상세, 체크아웃]이 된다. 시트를 연 채 replace하면 Next가 화면 상태를 보존해 뒤로가기로 돌아왔을 때 시트가 열린 채
  // 남고, 그 시트에는 닫을 기록 항목이 없다(patterns §6 "오버레이 안 이동은 replace"와 같은 결과를 이 순서로 낸다)
  const buyFromSheet = () => {
    if (!checkoutHref) return;
    const href = checkoutHref;
    const overlayOnTop = Boolean(
      (window.history.state as { ddOverlay?: unknown } | null)?.ddOverlay,
    );
    setSheetOpen(false);
    if (!overlayOnTop) {
      router.push(href);
      return;
    }
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.removeEventListener('popstate', go);
      router.push(href);
    };
    window.addEventListener('popstate', go);
    setTimeout(go, 1000); // popstate가 오지 않아도 멈추지 않게
  };

  return (
    <Container as="main" className={s.page}>
      <div className={s.grid}>
        <article className={s.mainCol}>
          <section className={s.summary} aria-label="공연 정보">
            <div className={s.posterWrap}>
              <EventPoster src={event.posterImageUrl} alt={`${title} 포스터`} />
              <Button
                className={s.posterShare}
                variant="tonal"
                size="sm"
                icon={<Icon name="link" />}
                aria-label="공유하기"
                onClick={share}
              />
            </div>

            <div className={s.info}>
              <Txt as="h1" typography="headingXl">
                {title}
              </Txt>

              {/* 모바일 — 해시태그 칩 + 아이콘 행(와이어 121:1216) */}
              <div className={`${s.infoRows} ${s.mobileOnly}`}>
                {hashtags.length > 0 && (
                  <Flex as="ul" wrap gap={2} className={s.chips}>
                    {hashtags.map((tag) => (
                      <li key={tag.tagId}>
                        <Chip size="lg">{tag.label}</Chip>
                      </li>
                    ))}
                  </Flex>
                )}
                <Link href={`/hosts/${event.host.hostId}`} className={s.iconRow}>
                  <span className={s.iconRowIcon}>
                    <Icon name="music" />
                  </span>
                  <Txt typography="headingSm" lines={1}>
                    {event.host.name ?? '호스트'}
                  </Txt>
                  <Icon name="chevron-right" size={20} />
                </Link>
                {event.place?.name && (
                  <div className={s.iconRow}>
                    <span className={s.iconRowIcon}>
                      <Icon name="location" />
                    </span>
                    <Flex direction="column" gap={1}>
                      <Txt typography="headingSm">{event.place.name}</Txt>
                      <PlaceAddress place={event.place} />
                    </Flex>
                  </div>
                )}
                {schedule && (
                  <div className={s.iconRow}>
                    <span className={s.iconRowIcon}>
                      <Icon name="clock" />
                    </span>
                    <Txt typography="headingSm">{schedule.label}</Txt>
                  </div>
                )}
              </div>

              {/* PC — 정보 표(와이어 640:1957 일자·시간·장소·호스트·태그) */}
              <div className={s.desktopTable}>
                {schedule && <InfoRow label="일자" value={schedule.date} />}
                {schedule && <InfoRow label="시간" value={timeRange(schedule)} />}
                {event.place?.name && (
                  <InfoRow
                    label="장소"
                    value={
                      <Flex direction="column" gap={1}>
                        <Txt typography="bodyLg">{event.place.name}</Txt>
                        <PlaceAddress place={event.place} />
                      </Flex>
                    }
                  />
                )}
                <InfoRow
                  label="호스트"
                  value={
                    <span className={s.hostValue}>
                      <Link href={`/hosts/${event.host.hostId}`} className={s.textLink}>
                        <Txt typography="bodyLg">{event.host.name ?? '호스트'}</Txt>
                      </Link>
                      {/* PC 문의 입구는 와이어에 없다(PC 연락처 모달 666:14989만) — 호스트 옆에 둔다(디자인 없음 코멘트 2026-11-01) */}
                      {hasContacts && (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Icon name="chat" />}
                          onClick={openContacts}
                        >
                          문의하기
                        </Button>
                      )}
                    </span>
                  }
                />
                {hashtags.length > 0 && (
                  <InfoRow label="태그" value={hashtags.map((t) => t.label).join(' ')} />
                )}
              </div>

              <IntermediaryNotice />
            </div>
          </section>

          {event.hasTicket && (
            <section className={`${s.card} ${s.mobileOnly}`} aria-labelledby={mobileTicketsId}>
              <Txt as="h2" typography="headingSmEmphasized">
                <span id={mobileTicketsId}>티켓 옵션</span>
              </Txt>
              <TicketOptionList selection={tickets} headingId={mobileTicketsId} />
            </section>
          )}

          {tabs.length > 0 && (
            <Tabs value={tab} onValueChange={setTab}>
              <TabList aria-label="공연 안내" size="responsive" className={s.tabList}>
                {tabs.map((t) => (
                  <Tab key={t.key} value={t.key}>
                    {t.title}
                  </Tab>
                ))}
              </TabList>
              {tabs.map((t) => (
                <TabPanel key={t.key} value={t.key} className={s.tabPanel}>
                  <SectionViewer html={t.html} />
                </TabPanel>
              ))}
            </Tabs>
          )}
        </article>

        {/* PC 오른쪽 고정 카드(와이어 640:1957) */}
        <aside className={s.aside} aria-label="예매">
          <WeekCalendar startAt={event.startAt} />
          {event.hasTicket && (
            <>
              <Txt as="h2" typography="headingMdEmphasized">
                <span id={desktopTicketsId}>티켓 옵션</span>
              </Txt>
              <TicketSelector selection={tickets} headingId={desktopTicketsId} />
            </>
          )}
          <Flex gap={2}>
            <Button
              variant="tonal"
              size="lg"
              icon={<Icon name="link" />}
              aria-label="공유하기"
              onClick={share}
            />
            {event.hasTicket && (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={!checkoutHref}
                onClick={buyFromCard}
              >
                티켓 구매하기
              </Button>
            )}
          </Flex>
        </aside>
      </div>

      {/* 모바일 하단 고정 바 — PC에서는 CSS로 숨긴다 */}
      {(hasContacts || event.hasTicket) && (
        <>
          <div className={s.bottomSpacer} aria-hidden />
          <div className={s.bottomBar}>
            {hasContacts && (
              <Button
                variant="tonal"
                size="lg"
                icon={<Icon name="chat" />}
                aria-label="문의하기"
                onClick={openContacts}
              />
            )}
            {event.hasTicket && (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={!canBuy}
                aria-haspopup="dialog"
                onClick={() => setSheetOpen(true)}
              >
                티켓 구매하기
              </Button>
            )}
          </div>
        </>
      )}

      {sheet !== 'closed' && (
        <TicketSheet
          open={sheet === 'open'}
          onOpenChange={setSheetOpen}
          onExited={() => setSheet('closed')}
          selection={tickets}
          onBuy={buyFromSheet}
        />
      )}
    </Container>
  );
}

/** `18:00 ~ 21:00 (180분)`. 다른 날 끝나면 끝 날짜도 */
function timeRange(schedule: EventSchedule) {
  const end = schedule.endTime
    ? ` ~ ${schedule.endDate ? `${schedule.endDate} ` : ''}${schedule.endTime}`
    : '';
  return [`${schedule.startTime}${end}`, schedule.runTimeLabel].filter(Boolean).join(' ');
}

function PlaceAddress({ place }: { place: NonNullable<EventDetail['place']> }) {
  const address = [place.address, place.detailAddress].filter(Boolean).join(' ');
  if (!address) return null;
  return (
    <Txt typography="bodyMd" color={colors.textTertiary}>
      {address}
    </Txt>
  );
}

/** 포스터. 없거나 못 불러오면 빈 상자(기본 이미지 자산 없음 — design-requests Q26) */
function EventPoster({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    // 서버 이미지(업로드 출처면 `/_next/image` 최적화 — P15). 모바일은 화면 폭, PC는 282
    <UploadedImage
      // 서버 HTML의 이미지는 하이드레이션 전에 실패할 수 있어 onError를 놓친다 — 붙을 때 한 번 더 본다
      ref={(img) => {
        if (img && img.complete && img.naturalWidth === 0) setFailed(true);
      }}
      className={s.poster}
      src={src}
      alt={alt}
      width={282}
      height={400}
      sizes="(min-width: 1024px) 282px, 100vw"
      // 첫 화면의 가장 큰 그림(LCP 후보) — 지연 로드하지 않고 먼저 받게 한다(P14 성능). `preload`(옛 `priority`)는 쓰지 않는다 —
      // 설치본 image.md가 `loading="eager"`·`fetchPriority="high"`를 권한다
      loading="eager"
      fetchPriority="high"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * 중개자 고지 — legal-copy A-1 원문 그대로(약관 제3조③·제19조③). 와이어 `640:1957` 정보 표 아래 "예매 안내 문구" 자리.
 * 문구를 바꾸거나 빼지 않는다(legal-copy). 이용약관 링크는 v2 경로 `/meta/term`(새 창).
 */
function IntermediaryNotice() {
  return (
    <Txt as="p" typography="bodySm" color={colors.textTertiary}>
      두둥은 통신판매중개자로서 공연의 당사자가 아니며, 공연의 내용과 진행은 호스트가 책임집니다.
      두둥티켓(호스트 계좌 입금) 대금의 환불도 호스트가 직접 하며, 호스트가 공연 상세에 안내한 환불
      기준이 우선합니다. 취소·환불 규정은 &apos;판매정보&apos;와{' '}
      <a href="/meta/term" target="_blank" rel="noopener noreferrer" className={s.textLink}>
        이용약관
      </a>
      에서 확인할 수 있습니다.
    </Txt>
  );
}

/** 주간 달력 — 표시용(누를 수 없음, Q21 기본안) */
function WeekCalendar({ startAt }: { startAt: string | null }) {
  const week = eventWeek(startAt);
  if (!week) return null;
  return (
    <Flex direction="column" gap={3}>
      <Txt typography="headingSmEmphasized">
        {week.year}년 {week.month}월
      </Txt>
      <div className={s.week} aria-hidden>
        {week.days.map((d) => (
          <Txt key={d.weekday} typography="labelSm" color={colors.textTertiary}>
            {d.weekday}
          </Txt>
        ))}
        {week.days.map((d) => (
          <span
            key={`d-${d.weekday}`}
            className={s.weekDay}
            data-event-day={d.isEventDay || undefined}
          >
            <Txt typography="labelLgEmphasized">{d.day}</Txt>
          </span>
        ))}
      </div>
    </Flex>
  );
}
