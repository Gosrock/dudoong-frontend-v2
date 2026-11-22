'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

import { type EventDetail, isEventCanceled } from '@/api/event/schema';
import { eventWeek } from '@/features/audience/event/model/week-calendar';
import { ScrollTopButton } from '@/features/audience/home/ui/ScrollTopButton';
import { hostHref } from '@/features/shared/routes';
import { SectionViewer } from '@/features/shared/section-viewer/ui/SectionViewer';
import { Button } from '@/ui/components/Button/Button';
import { Chip } from '@/ui/components/Chip/Chip';
import { Tab, TabList, TabPanel, Tabs } from '@/ui/components/Tabs/Tabs';
import { toast } from '@/ui/components/Toast/Toast';
import { UploadedImage } from '@/ui/components/UploadedImage/UploadedImage';
import { Icon } from '@/ui/icons/Icon';
import { Container } from '@/ui/primitives/Container';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { EventSchedule } from '../model/event-schedule';
import { useEventDetail } from '../model/useEventDetail';
import { ONE_TICKET_KIND_WARNING, useTicketSelection } from '../model/useTicketSelection';
import { openEventContacts } from './EventContactsOverlay';
import * as s from './EventDetailView.css';
import { SaleInfo } from './SaleInfo';
import { shareEvent } from './shareEvent';
import { TicketOptionList } from './TicketOptionList';
import { PickedTicket, TicketSelector } from './TicketSelector';
import { BuyButtons, TicketSheet } from './TicketSheet';

/**
 * 공연 상세(P5b-V → GUI 2026-11-22). 모바일 근거는 GUI Ready `759:12772` "공연상세"(#346) · `1948:25129` "공연상세(스크롤)"(#340) ·
 * 티켓 `759:21725` · `759:21918` · `759:22015` · `759:22129`(#343~#345 · #347) · 연락처 `759:22611`(#337 · #338).
 * PC(1024~)는 GUI Ready `1989:28064` "[WEB] 공연상세"(#361) · `1989:28341` 티켓 선택(#362) · `1989:28614` 문의하기(#366, 2026-11-22):
 * 본문 1280을 12열로 나눠 왼쪽 8열(포스터 2열 + 요약 표 · 그 아래 예매 안내 문구) · 오른쪽 4열 예매 패널(주간 달력 · 티켓 옵션 · [문의][티켓 구매하기]).
 *
 * 모바일(`759:12772`): 포스터(화면 폭, 머리 아래 고정 — 디자이너 메모 "포스터는 고정") 위로 흰 판(위 모서리 20 · 위로 그림자)이 올라온다.
 * 판 안: 제목(`Title`, 가운데) → 해시태그 칩 → 일시 · 장소 › · 호스트 › → 티켓 카드(누르면 고름) → 탭(스크롤하면 머리 아래 붙음, #340) →
 * 탭 본문 → 판매정보. 아래 고정: [고른 티켓 줄(`759:22015`)] + [문의][티켓 구매하기] + 맨 위로(↑).
 * 모바일 하단 바와 PC 카드는 같은 DOM에 있고 CSS가 보일 것을 정한다(patterns §1).
 *
 * 재고(GP-5)는 브라우저에서만 읽는다(`useTicketSelection` — 응답 HTML에 재고 값이 없다).
 * 티켓 고르기: 선택 상태는 이 화면의 `useTicketSelection` 하나 — 모바일은 티켓 카드 · [티켓 구매하기] 시트(`TicketSheet`, 열 때 마운트 —
 * 줄을 누르면 바로 닫히고 하단 바 위 고른 티켓 줄 — #386), PC는 오른쪽 카드의 `TicketSelector`. 고른 뒤 하단 [티켓 구매하기]는
 * 결제로 간다(#347 — 시트가 닫힌 뒤라 기록은 [상세, 체크아웃]). 1주문 1종류 경고는 토스트(`759:22129`).
 */
export function EventDetailView({ eventId }: { eventId: string }) {
  const { event, title, schedule, hashtags, tabs } = useEventDetail(eventId);
  const tickets = useTicketSelection(eventId, event.displayStatus);
  const [tab, setTab] = useState(tabs[0]?.key ?? '');
  const hasContacts = event.contacts.length > 0;
  // 호스트가 취소한 공연(E-11 `canceledAt`)은 티켓 옵션 · [티켓 구매하기]를 그리지 않는다(이슈 #136 §7 — 상세는 열린다)
  const canceled = isEventCanceled(event);
  const sellsTickets = event.hasTicket && !canceled;
  const openContacts = () => openEventContacts(eventId, event.host);
  const share = () => shareEvent(event);
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

  // 1주문 1종류 경고(훅의 `warning`)를 토스트로(GUI `759:22129` — 화면 위 연한 빨강 판 두 줄, #347). 띄우고 바로 끈다 —
  // 같은 경고를 다시 누르면 다시 뜬다. 토스트 id가 같아 쌓이지 않는다
  const { warning, dismissWarning } = tickets;
  useEffect(() => {
    if (!warning) return;
    toast(ONE_TICKET_KIND_WARNING[0], {
      id: 'one-ticket-kind',
      tone: 'danger',
      description: ONE_TICKET_KIND_WARNING[1],
      position: 'top',
    });
    dismissWarning();
  }, [warning, dismissWarning]);

  const { checkoutHref } = tickets;
  const goCheckout = () => checkoutHref && router.push(checkoutHref);
  // 모바일 하단 [티켓 구매하기] — 고른 티켓이 있으면 결제로(#347), 없으면 시트를 연다(#343)
  const buyFromBar = () => (checkoutHref ? goCheckout() : setSheetOpen(true));
  const placeMapHref = event.place?.name ? kakaoMapSearchHref(event.place) : null;

  return (
    <Container as="main" className={s.page}>
      <div className={s.grid}>
        <article className={s.mainCol}>
          <section className={s.summary} aria-label="공연 정보">
            <div className={s.posterWrap}>
              <EventPoster src={event.posterImageUrl} alt={`${title} 포스터`} />
              {/* 모바일 공유 — GUI `759:12772`에 자리가 없어 와이어(`121:1216`) 자리(포스터 오른쪽 위) 그대로(디자인 없음 코멘트 2026-11-22) */}
              <Button
                className={s.posterShare}
                variant="tonal"
                size="sm"
                icon={<Icon name="link" />}
                aria-label="공유하기"
                onClick={share}
              />
            </div>

            <div className={`${s.info} ${s.sheetTop}`}>
              <Txt as="h1" typography="title" color={colors.textPrimaryLabel} className={s.title}>
                {title}
              </Txt>

              {canceled && <CanceledNotice reason={event.cancelReason ?? null} />}

              {/* 모바일 — 해시태그 칩(DS tag_v2 large · round · grey weak, 가운데) + 아이콘 행(일시 · 장소 › · 호스트 ›, GUI `759:13011`) */}
              {hashtags.length > 0 && (
                <Flex
                  as="ul"
                  wrap
                  gap={2}
                  justify="center"
                  className={`${s.chips} ${s.mobileOnly}`}
                >
                  {hashtags.map((tag) => (
                    <li key={tag.tagId}>
                      <Chip size="lg" shape="round">
                        {tag.label}
                      </Chip>
                    </li>
                  ))}
                </Flex>
              )}
              <div className={`${s.infoRows} ${s.mobileOnly}`}>
                {schedule && (
                  <div className={s.iconRow}>
                    <Icon name="clock" />
                    <Txt typography="bodyLg" color={colors.textPrimary} className={s.iconRowText}>
                      {schedule.label}
                    </Txt>
                  </div>
                )}
                {event.place?.name &&
                  (placeMapHref ? (
                    // 장소 › — 카카오맵 검색(새 탭). 목적지는 Figma에 없음(디자인 없음 코멘트 2026-11-22)
                    <a
                      href={placeMapHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={s.iconRow}
                      aria-label={`${event.place.name} 지도 보기`}
                    >
                      <Icon name="location" />
                      <Txt
                        typography="bodyLg"
                        color={colors.textPrimary}
                        className={s.iconRowText}
                        lines={1}
                      >
                        {event.place.name}
                      </Txt>
                      <Icon name="chevron-right" />
                    </a>
                  ) : null)}
                <Link href={hostHref(event.host.hostId)} className={s.iconRow}>
                  <Icon name="music" />
                  <Txt
                    typography="bodyLg"
                    color={colors.textPrimary}
                    className={s.iconRowText}
                    lines={1}
                  >
                    {event.host.name ?? '호스트'}
                  </Txt>
                  <Icon name="chevron-right" />
                </Link>
              </div>

              {/* PC — 요약 표(GUI `1989:28263` — 이름 열 `Heading/sm - emphasized` · 값 `Heading/sm`, 줄 사이 4 · 열 사이 12).
                  장소는 이름만(주소 줄 없음 — GUI대로), 호스트는 호스트 홈 링크. 문의 입구는 오른쪽 예매 패널 [문의](GUI `1989:28154`) */}
              <dl className={s.desktopTable}>
                <dt>호스트</dt>
                <dd>
                  <Link href={hostHref(event.host.hostId)} className={s.textLink}>
                    {event.host.name ?? '호스트'}
                  </Link>
                </dd>
                {schedule && (
                  <>
                    <dt>일자</dt>
                    <dd>{schedule.date}</dd>
                    <dt>시간</dt>
                    <dd>{timeRange(schedule)}</dd>
                  </>
                )}
                {event.place?.name && (
                  <>
                    <dt>장소</dt>
                    <dd>{event.place.name}</dd>
                  </>
                )}
                {hashtags.length > 0 && (
                  <>
                    <dt>태그</dt>
                    <dd>{hashtags.map((t) => t.label).join(' ')}</dd>
                  </>
                )}
              </dl>
            </div>
          </section>

          {sellsTickets && (
            <section className={`${s.sheetPart} ${s.mobileOnly}`} aria-label="티켓">
              <TicketOptionList selection={tickets} label="티켓 옵션" onPick={tickets.select} />
            </section>
          )}

          {tabs.length > 0 && (
            <Tabs value={tab} onValueChange={setTab} className={s.sheetPart}>
              <TabList aria-label="공연 안내" size="responsive" className={s.tabList}>
                {tabs.map((t) => (
                  <Tab key={t.key} value={t.key}>
                    {t.title}
                  </Tab>
                ))}
              </TabList>
              {tabs.map((t) => (
                <TabPanel key={t.key} value={t.key} className={s.tabPanel}>
                  {/* 탭 본문 머리(GUI `759:13066` "공연소개" — `Label/lg-emphasized`). PC GUI `1989:28100`에는 없어 모바일만 */}
                  <Txt
                    as="h2"
                    typography="labelLgEmphasized"
                    color={colors.textPrimary}
                    className={s.mobileOnly}
                  >
                    {t.title}
                  </Txt>
                  <SectionViewer html={t.html} />
                </TabPanel>
              ))}
            </Tabs>
          )}

          {/* 판매정보(legal-copy A-2 — 약관 제19조③ 굵은 문단 · 청약철회 제한). 탭은 호스트가 정한 섹션이라 그 아래 고정 */}
          <div className={s.sheetPart}>
            <SaleInfo />
          </div>
          {/* 중개자 고지(legal-copy A-1) — 모바일 GUI에 자리가 없어 판매정보 아래. PC는 CSS grid로 요약 표 아래 구분선 밑
              "예매 안내 문구" 자리(GUI `1989:28333`)에 놓는다(같은 DOM 하나). 문구는 Figma 견본이 아니라 legal-copy A-1 원문 */}
          <div className={`${s.sheetPart} ${s.sheetEnd} ${s.noticePart}`}>
            <IntermediaryNotice />
          </div>
        </article>

        {/* PC 오른쪽 예매 패널(GUI `1989:28118` — 테두리 · 모서리 16 · 안쪽 24 · 사이 24) */}
        <aside className={s.aside} aria-label="예매">
          <WeekCalendar startAt={event.startAt} />
          {sellsTickets && (
            <>
              <Txt as="h2" typography="headingMdEmphasized" color={colors.textPrimaryLabel}>
                티켓 옵션
              </Txt>
              <TicketSelector selection={tickets} label="티켓 옵션" showPicked framed={false} />
            </>
          )}
          {/* [문의 56][티켓 구매하기](GUI `1989:28153` — 모바일 하단 바와 같은 버튼 줄). 공유는 PC GUI에 자리가 없어 뺐다
              (🤖 2026-11-22 — 디자인 없음 코멘트. 모바일은 포스터 위 공유 그대로) */}
          {(hasContacts || sellsTickets) && (
            <BuyButtons
              onContact={hasContacts ? openContacts : undefined}
              onBuy={sellsTickets ? goCheckout : undefined}
              buyDisabled={!checkoutHref}
            />
          )}
        </aside>
      </div>

      {/* 모바일 하단 고정 — 고른 티켓 줄(`759:22112`) + [문의][티켓 구매하기](`759:14901`) + 맨 위로. PC에서는 바를 CSS로 숨기고
          맨 위로(GUI `1989:28156`)만 화면 오른쪽 아래 고정으로 남긴다 — 버튼을 하나만 두어 가려 둔 FAB가 토스트 자리(`data-fab`)를 잡지 않게 */}
      <div className={s.dock}>
        <ScrollTopButton className={s.scrollTop} />
        {sellsTickets && tickets.selected && (
          <div className={s.pickedBar} aria-label="고른 티켓" role="group">
            <PickedTicket selection={tickets} />
          </div>
        )}
        {(hasContacts || sellsTickets) && (
          <div className={s.bottomBar}>
            <BuyButtons
              onContact={hasContacts ? openContacts : undefined}
              onBuy={sellsTickets ? buyFromBar : undefined}
              buyDisabled={!canBuy}
              buyHasPopup={!checkoutHref}
            />
          </div>
        )}
      </div>

      {sheet !== 'closed' && sellsTickets && (
        <TicketSheet
          open={sheet === 'open'}
          onOpenChange={setSheetOpen}
          onExited={() => setSheet('closed')}
          selection={tickets}
        />
      )}
    </Container>
  );
}

/** 카카오맵 검색 링크(장소 ›) — 주소가 있으면 주소, 없으면 장소 이름으로 */
function kakaoMapSearchHref(place: NonNullable<EventDetail['place']>) {
  const q = place.address || place.name;
  return q ? `https://map.kakao.com/link/search/${encodeURIComponent(q)}` : null;
}

/** 취소된 공연 안내 — 디자인 없음(Q125). 사유는 호스트가 입력한 값(1~100자) */
function CanceledNotice({ reason }: { reason: string | null }) {
  return (
    <div className={s.canceledNotice} role="status" data-testid="event-canceled">
      <Txt as="p" typography="headingSmEmphasized" color={colors.textDangerLabel}>
        호스트가 취소한 공연이에요
      </Txt>
      {reason && (
        <Txt as="p" typography="bodyMd">
          취소 사유: {reason}
        </Txt>
      )}
      <Txt as="p" typography="bodyMd" color={colors.textSecondary}>
        티켓을 판매하지 않아요. 예매한 주문은 모두 거절·취소돼요.
      </Txt>
    </div>
  );
}

/** `18:00 ~ 21:00 (180분)`. 다른 날 끝나면 끝 날짜도 */
function timeRange(schedule: EventSchedule) {
  const end = schedule.endTime
    ? ` ~ ${schedule.endDate ? `${schedule.endDate} ` : ''}${schedule.endTime}`
    : '';
  return [`${schedule.startTime}${end}`, schedule.runTimeLabel].filter(Boolean).join(' ');
}

/** 포스터. 없거나 못 불러오면 빈 상자(기본 이미지 자산 없음 — design-requests Q26) */
function EventPoster({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return null;
  return (
    // 서버 이미지(업로드 출처면 `/_next/image` 최적화 — P15). 모바일은 화면 폭, PC는 282
    <UploadedImage
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
    />
  );
}

/**
 * 중개자 고지 — legal-copy A-1 그대로(약관 제3조③·제19조③). 와이어 `640:1957` 정보 표 아래 "예매 안내 문구" 자리.
 * 마지막 문장 "'판매정보'와" → "호스트가 공연 상세에 안내한 환불 기준과"는 운영 확정본(B28 · 백엔드 #928, 2026-11-04).
 * 문구를 바꾸거나 빼지 않는다(legal-copy). 이용약관 링크는 v2 경로 `/meta/term`(새 창).
 */
function IntermediaryNotice() {
  return (
    <Txt as="p" typography="bodySm" color={colors.textTertiary}>
      두둥은 통신판매중개자로서 공연의 당사자가 아니며, 공연의 내용과 진행은 호스트가 책임집니다.
      두둥티켓(호스트 계좌 입금) 대금의 환불도 호스트가 직접 하며, 호스트가 공연 상세에 안내한 환불
      기준이 우선합니다. 취소·환불 규정은 호스트가 공연 상세에 안내한 환불 기준과{' '}
      <a href="/meta/term" target="_blank" rel="noopener noreferrer" className={s.textLink}>
        이용약관
      </a>
      에서 확인할 수 있습니다.
    </Txt>
  );
}

/**
 * 주간 달력 — 표시용(누를 수 없음, Q21 기본안). GUI `1989:28119`: "2026년 1월"(20) → 요일(`Label/md` 회색) 아래 날짜(`Label/md - emphasized`),
 * 공연일은 요일 보라 · 날짜 보라 원 24 안 흰 글자 → 아래 구분선
 */
function WeekCalendar({ startAt }: { startAt: string | null }) {
  const week = eventWeek(startAt);
  if (!week) return null;
  return (
    <div className={s.weekBox}>
      {/* FIGMA-CUSTOM: 달력 머리(gui 1989:34364 "2026년 1월") 글자 스타일 없음(20 · 600) → 가장 가까운 Heading/md - emphasized. Figma 코멘트 2026-11-22 */}
      <Txt typography="headingMdEmphasized" color={colors.textPrimaryLabel}>
        {week.year}년 {week.month}월
      </Txt>
      <div className={s.week} aria-hidden>
        {week.days.map((d) => (
          <span key={d.weekday} className={s.weekCell} data-event-day={d.isEventDay || undefined}>
            <Txt
              typography={d.isEventDay ? 'labelMdEmphasized' : 'labelMd'}
              className={s.weekdayLabel}
            >
              {d.weekday}
            </Txt>
            <span className={s.weekDay}>
              <Txt typography="labelMdEmphasized">{d.day}</Txt>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
