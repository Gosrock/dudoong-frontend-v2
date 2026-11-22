'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';

import type { EventManage } from '@/api/event/schema';
import {
  formatKstDateTime,
  formatKstDotDateWeekday,
  formatKstMonthDay,
  formatKstTime,
} from '@/api/shared/date';
import { eventChipOf } from '@/features/hosting/shared/model/home-cards';
import { EventPanelLayout } from '@/features/hosting/shared/ui/EventScopeFrame';
import { UNNAMED_EVENT } from '@/features/shared/event-labels';
import { Button } from '@/ui/components/Button/Button';
import { Chip } from '@/ui/components/Chip/Chip';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { EntranceCard } from '@/ui/components/EntranceCard/EntranceCard';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { SalesCard } from '@/ui/components/SalesCard/SalesCard';
import { SchedulePanel, type ScheduleTimelineStep } from '@/ui/components/Schedule/Schedule';
import { Skeleton } from '@/ui/components/Skeleton/Skeleton';
import { StatCard } from '@/ui/components/StatCard/StatCard';
import { toast } from '@/ui/components/Toast/Toast';
import { UploadedImage } from '@/ui/components/UploadedImage/UploadedImage';
import { Icon } from '@/ui/icons/Icon';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './EventDashboardView.css';
import { statCardsOf } from './model/dashboard-stats';
import { useEventCancel } from './model/useEventCancel';
import { useEventDashboard } from './model/useEventDashboard';
import { CanceledEventNotice, EventCancelSection } from './ui/EventCancelSection';

type Dashboard = ReturnType<typeof useEventDashboard>;

/**
 * `/hosting/events/[eventId]/dashboard`. GUI Ready(Design Sync #321~#335, 2026-11-21):
 * - 등록 전(체크리스트 모드, P11-V) — 모바일 `727:23088`(0/3) · `745:32167`(3/3) · `1913:39649`(티켓 없는 공연) · `1913:40061`(불러오는 중) ·
 *   `1913:39956`(실패) · `1913:46515`(등록 확인) · `1913:46871`(토스트) / PC `1929:6181`(1/3) · `1929:6421`(2/3) · `1929:6663`(준비 끝) ·
 *   `1929:6909` · `1929:7153` · `1929:7393` · `1929:7633` · `1929:7691`
 * - 등록 후(P13a-V) — 모바일 `669:2787` · PC `680:672`(1133) · `669:2972`(1280) · `712:1646`(1440) · `669:2350`(1920) · `745:32726`(판매 0):
 *   통계 카드 4개 · `티켓 판매 정보_v2` · `입장 현황` · 유의사항 · `공연 취소` + PC 우측 `일정 패널_v2`. 카드 호버 `1887:1876` · `1880:33697`,
 *   통계 불러오는 중 `1887:2127` · `1901:34559`, 실패 `1887:2382` · `1913:36842`, 취소 흐름 `1912:*` · `1913:37*`
 */
export function EventDashboardView({ eventId }: { eventId: string }) {
  const dashboard = useEventDashboard(eventId);
  // 등록 후만 우측 일정 패널(P4s-V 슬롯 · 본문 GUI `일정 패널_v2`)
  return dashboard.mode === 'registered' ? (
    <EventPanelLayout
      panel={dashboard.stats ? <DashboardSchedule timeline={dashboard.stats.timeline} /> : null}
    >
      <RegisteredDashboard d={dashboard} eventId={eventId} />
    </EventPanelLayout>
  ) : (
    <DashboardPage
      d={dashboard}
      head={
        <div className={s.headBlock}>
          <EventHead event={dashboard.event} />
        </div>
      }
    >
      <ChecklistSection d={dashboard} />
    </DashboardPage>
  );
}

function DashboardPage({
  d,
  head,
  children,
}: {
  d: Dashboard;
  head: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="dashboard-title" className={s.page}>
      <VisuallyHidden asChild>
        <h1 id="dashboard-title">대시보드</h1>
      </VisuallyHidden>
      <DashboardNotices d={d} />
      {head}
      {children}
    </section>
  );
}

/** 만든 직후·등록 직후 토스트(만든 직후 문구는 GUI `298:2617`, 등록 직후는 GUI `1929:7691`). 띄우고 상태를 끈다 */
function DashboardNotices({ d }: { d: Dashboard }) {
  const { createdNotice, dismissCreatedNotice, justRegistered, acknowledgeRegistered } = d;
  useEffect(() => {
    if (!createdNotice) return;
    toast('새로운 공연이 추가되었습니다!', { id: 'event-created' });
    dismissCreatedNotice();
  }, [createdNotice, dismissCreatedNotice]);
  useEffect(() => {
    if (!justRegistered) return;
    // GUI `1929:7691` · `1913:46871`(Design Sync #333 · #334)
    toast('공연을 등록했어요.', { id: 'event-registered' });
    acknowledgeRegistered();
  }, [justRegistered, acknowledgeRegistered]);
  return null;
}

/**
 * 머리 — 포스터(+ 상태 칩) · 호스트 · 공연명, PC는 일자·시간·장소·태그 4줄(정보 글자 80%). GUI 모바일 `669:2787` · PC `712:1646`
 * (2026-11-21 — 오른쪽 위 연필은 화면에서 빠졌다). 값이 없는 줄은 뺀다(준비중 공연은 대부분 비어 있다)
 */
function EventHead({ event }: { event: EventManage }) {
  const chip = eventChipOf(event);
  const facts: [string, string][] = [];
  if (event.startAt) facts.push(['일자', formatKstDotDateWeekday(event.startAt)]);
  if (event.startAt && event.endAt) {
    const run = event.runTime !== null ? ` (${event.runTime}분)` : '';
    facts.push(['시간', `${formatKstTime(event.startAt)} ~ ${formatKstTime(event.endAt)}${run}`]);
  }
  const place = event.place?.name ?? event.place?.address;
  if (place) facts.push(['장소', place]);
  if (event.tags.length > 0) facts.push(['태그', event.tags.map((t) => `#${t.name}`).join(' ')]);
  return (
    <div className={s.head}>
      <div className={s.posterBox}>
        {event.posterImageUrl ? (
          // 업로드 포스터(업로드 출처면 `/_next/image` 최적화 — P15). 폭 180 · PC 176
          <UploadedImage
            className={s.poster}
            fallback={<Illustration name="poster-placeholder" width={180} className={s.poster} />}
            src={event.posterImageUrl}
            alt="공연 포스터"
            width={180}
            height={254}
            decoding="async"
          />
        ) : (
          <Illustration name="poster-placeholder" width={180} className={s.poster} />
        )}
        {chip && (
          <Chip color={chip.color} theme={chip.theme} className={s.posterChip}>
            {chip.label}
          </Chip>
        )}
      </div>
      <div className={s.info}>
        {event.hostName && (
          <Txt typography="labelLg" className={s.hostName}>
            {event.hostName}
          </Txt>
        )}
        <Txt as="p" typography="title">
          {event.name ?? UNNAMED_EVENT}
        </Txt>
        {facts.length > 0 && (
          <dl className={s.facts}>
            {facts.map(([k, v]) => (
              <Flex key={k} style={{ display: 'contents' }}>
                <Txt as="dt" typography="headingSmEmphasized">
                  {k}
                </Txt>
                <Txt as="dd" typography="headingSm" className={s.factValue}>
                  {v}
                </Txt>
              </Flex>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

/**
 * `필수 체크리스트`(DS `627:1799`) + 유의사항 — GUI 등록 흐름(Design Sync #333 · #334): 불러오는 중은 행 자리 스켈레톤 3줄
 * (`1929:7153` — 160×20 · 모서리 6), 실패는 행 자리 가운데 문구 + [다시 시도](`1929:7393`), 티켓 없는 공연은 ③ 행이 없다(`1929:6909`).
 * 다 채운 뒤 팝업은 등록 흐름에 없어 그리지 않는다(전에는 디자인 없이 "등록 준비 완료" 팝업 — 🤖 2026-11-22). 등록 확인은 `1929:7633`
 */
function ChecklistSection({ d }: { d: Dashboard }) {
  const confirmRegister = () =>
    void openConfirm({
      title: '공연을 등록할까요?',
      description:
        '등록하면 모든 사용자에게 공개되고 삭제할 수 없어요. 공연 시작 전에는 대시보드에서 공연을 취소할 수 있어요.',
      cancelLabel: '돌아가기',
      confirmLabel: '등록하기',
      // 확인 창 계약(patterns §6): 실패(`false`)면 열린 채
      onConfirm: () => d.register(),
    });
  return (
    <>
      <div className={s.checklistWrap} data-testid="dashboard-checklist">
        <div className={s.checklist}>
          <Txt as="h2" typography="headingMd2Emphasized">
            필수 체크리스트
          </Txt>
          <Txt as="p" typography="bodyMd">
            아래 항목을 모두 완료해야 공연 등록이 가능해요.
          </Txt>
          {d.checklistStatus === 'pending' && (
            <div className={s.checkRows} aria-busy="true" aria-label="체크리스트 불러오는 중">
              {[0, 1, 2].map((i) => (
                <span key={i} className={s.checkSkeleton}>
                  <Skeleton width={160} height={20} />
                </span>
              ))}
            </div>
          )}
          {d.checklistStatus === 'error' && (
            <InlineError
              className={s.checkError}
              message="체크리스트를 불러오지 못했어요."
              onRetry={d.retryChecklist}
            />
          )}
          {d.checklistItems && (
            <ul className={s.checkRows}>
              {d.checklistItems.map((item) => (
                <li key={item.key} data-testid={`checklist-${item.key}`} data-done={item.done}>
                  <Link href={item.href} className={s.checkRow}>
                    <span className={s.checkMark} data-done={item.done} aria-hidden>
                      {item.done && <Icon name="check" size={12} />}
                    </span>
                    <span className={s.checkLabel}>
                      <Txt typography="labelMd">{item.label}</Txt>
                      <VisuallyHidden>{item.done ? ' — 완료' : ' — 미완료'}</VisuallyHidden>
                    </span>
                    <Icon name="chevron-right" size={20} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {d.progress && (
            <VisuallyHidden data-testid="checklist-progress">
              {d.progress.done}/{d.progress.total}
            </VisuallyHidden>
          )}
          {d.showRegister && (
            <Button size="lg" fullWidth disabled={!d.canRegister} onClick={confirmRegister}>
              공연 등록하기
            </Button>
          )}
          {d.registerError && (
            <p role="alert">
              <Txt typography="bodySm" color={colors.textDangerLabel}>
                {d.registerError}
              </Txt>
            </p>
          )}
        </div>
      </div>
      <div className={s.notice}>
        <span className={s.noticeIcon}>
          <Icon name="circle-request" />
        </span>
        <Flex direction="column" gap={1}>
          <Txt as="h2" typography="labelMdEmphasized">
            유의사항
          </Txt>
          <Txt as="p" typography="bodySm">
            기본 예매 마감, 환불 마감 시간은 공연 시작 시간 이전입니다.
          </Txt>
        </Flex>
      </div>
    </>
  );
}

const STAT_ICON = {
  pendingApprove: 'dashboard-pending',
  approved: 'dashboard-approved',
  refused: 'dashboard-rejected',
  refundRequested: 'dashboard-refund',
} as const;

/** 통계를 불러오기 전 카드 4개의 이름 · 링크(수치는 스켈레톤 — GUI `1887:2127` · `1901:34559`) */
const NO_ORDERS = { orders: { pendingApprove: 0, approved: 0, refused: 0, refundRequested: 0 } };

/**
 * 등록 후 — 머리 묶음(머리 + 취소된 공연 안내) → 본문(통계 · 판매 · 입장 · 유의사항) → 맨 아래 `공연 취소`(마스터).
 * 취소는 등록된(OPEN) 공연만이라 등록 후 모드에만 둔다
 */
function RegisteredDashboard({ d, eventId }: { d: Dashboard; eventId: string }) {
  const cancel = useEventCancel(eventId);
  const canceledNotice = <CanceledEventNotice cancel={cancel} />;
  return (
    <DashboardPage
      d={d}
      head={
        <div className={s.headBlock}>
          <EventHead event={d.event} />
          {(cancel.canceled || cancel.canRetry) && (
            <div className={s.canceledSlot}>{canceledNotice}</div>
          )}
        </div>
      }
    >
      <div data-testid="dashboard-registered" className={s.registered}>
        <RegisteredStats d={d} eventId={eventId} />
        <RegisteredNotice />
        <EventCancelSection cancel={cancel} orders={d.stats?.dashboard.orders ?? null} />
      </div>
    </DashboardPage>
  );
}

/** 통계 카드 4개 → 판매 · 입장 두 칸(GUI `712:1646`). 불러오는 중은 카드 수치만 스켈레톤, 실패는 카드 자리에 문구 + [다시 시도] */
function RegisteredStats({ d, eventId }: { d: Dashboard; eventId: string }) {
  if (d.statsStatus === 'error') {
    return (
      <div className={s.statsState}>
        <InlineError message="통계를 불러오지 못했어요." onRetry={d.retryStats} />
      </div>
    );
  }
  const loading = !d.stats;
  const cards = d.stats?.cards ?? statCardsOf(NO_ORDERS, eventId);
  return (
    <>
      <section aria-label="티켓 승인 정보" aria-busy={loading || undefined}>
        <ul className={s.stats}>
          {cards.map((c) => (
            <li key={c.key}>
              <StatCard
                href={c.href}
                linkAs={Link}
                icon={<Illustration name={STAT_ICON[c.key]} width={36} />}
                label={c.label}
                count={c.count}
                loading={loading}
                data-testid={`stat-${c.key}`}
              />
            </li>
          ))}
        </ul>
      </section>
      {d.stats && (
        <div className={s.salesRow}>
          <SalesCard
            data-testid="sales"
            items={d.stats.sales.legend}
            soldCount={d.stats.sales.totalSoldCount}
            amount={d.stats.sales.salesAmount}
          />
          <EntranceCard
            data-testid="entrance"
            entered={d.stats.entrance.entered}
            total={d.stats.entrance.issued}
            action={{ href: d.stats.qrHref, label: 'QR 체크인 열기' }}
            linkAs={Link}
          />
        </div>
      )}
    </>
  );
}

/** 유의사항(등록 후) — GUI `748:33140`·`741:31934` 문구 그대로. 가운데 줄(*…)은 빨간 글자 */
function RegisteredNotice() {
  return (
    <div className={`${s.noticeRow} ${s.registeredNotice}`}>
      <span className={s.noticeIcon}>
        <Icon name="circle-request" />
      </span>
      <Flex direction="column" gap={1}>
        <Txt as="h2" typography="labelMdEmphasized">
          유의사항
        </Txt>
        <Txt as="p" typography="bodySm">
          예매 마감, 환불 마감 시간은 공연 시작 시간 이전입니다.
          <br />
          공연이 등록된 이후에 이미 판매가 된 티켓은 티켓 수정, 삭제가 불가합니다.
          <br />
          <Txt typography="bodySm" color={colors.textDangerLabel}>
            *이미 판매가 된 티켓 이란 사용자들에게 판매가 되어 재고의 감소가 일어난 티켓을
            의미합니다.
          </Txt>
          <br />
          공연이 등록된 이후에도 티켓 추가가 가능합니다.
        </Txt>
      </Flex>
    </div>
  );
}

type Timeline = NonNullable<Dashboard['stats']>['timeline'];

const STEP_STATE = {
  done: 'past',
  current: 'current',
  upcoming: 'upcoming',
  canceled: 'canceled',
} as const;

/** "1월 15일 18:00" */
const monthDayTime = (v: string) => `${formatKstMonthDay(v)} ${formatKstTime(v)}`;

/**
 * 단계의 날짜 줄(GUI `일정 패널_v2`) — 등록 "1월 2일" · 홍보·판매 "1월 2일 ~ 1월 15일" · 당일 · 완료 · 취소 "1월 15일 18:00".
 * 등록일이 없으면 홍보·판매는 "~ 1월 15일"(Q43 기본안)
 */
function stepDate(step: Timeline[number]): string | null {
  if (step.key === 'registered') return step.from ? formatKstMonthDay(step.from) : null;
  if (step.key === 'promotion') {
    const from = step.from ? formatKstMonthDay(step.from) : null;
    const to = step.to ? formatKstMonthDay(step.to) : null;
    if (!from) return to ? `~ ${to}` : null;
    return to ? `${from} ~ ${to}` : `${from} ~`;
  }
  return step.from ? monthDayTime(step.from) : null;
}

/** 우측 일정 패널 — GUI `일정 패널_v2`(`1868:2240`). PC에만 보인다(셸 슬롯) */
function DashboardSchedule({ timeline }: { timeline: Timeline }) {
  // 오늘은 마운트 때 한 번 정한다(렌더 중 시각을 읽지 않는다). 패널은 GD-1이 온 뒤(브라우저)에만 그려진다
  const [today] = useState(() => formatKstMonthDay(formatKstDateTime(new Date())));
  const steps: ScheduleTimelineStep[] = timeline.map((step) => ({
    key: step.key,
    title: step.label,
    date: stepDate(step),
    state: STEP_STATE[step.state],
  }));
  return <SchedulePanel today={today} steps={steps} />;
}
