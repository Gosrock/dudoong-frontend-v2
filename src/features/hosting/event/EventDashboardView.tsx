'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import Link from 'next/link';
import { useEffect } from 'react';

import type { EventManage } from '@/api/event/schema';
import { formatKstDotDateWeekday, formatKstTime } from '@/api/shared/date';
import { eventChipOf, UNNAMED_EVENT } from '@/features/hosting/home/model/home-cards';
import { EventPanelLayout } from '@/features/hosting/shell/EventScopeFrame';
import { Button } from '@/ui/components/Button/Button';
import { button } from '@/ui/components/Button/Button.css';
import { Chip } from '@/ui/components/Chip/Chip';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { Popup } from '@/ui/components/Popup/Popup';
import { toast } from '@/ui/components/Toast/Toast';
import { Icon } from '@/ui/icons/Icon';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './EventDashboardView.css';
import { eventHref } from './model/event-scope';
import { useEventDashboard } from './model/useEventDashboard';

type Dashboard = ReturnType<typeof useEventDashboard>;

/**
 * `/hosting/events/[eventId]/dashboard`. 등록 전(체크리스트 모드)은 P11-V — GUI Ready 모바일 `727:23088`(0/3)·`745:32167`(3/3) ·
 * PC `727:23210`. "등록 준비 완료" 팝업(와이어 `424:11318` 문구)·등록 확인 팝업(와이어 `424:9837`)·토스트(`424:11427`, `298:2617`)는
 * 디자인 없음 — DS `Popup`·`toast`. 등록 후 통계(GD-1, P13a-L) 카드·도넛·막대·일정 패널은 P13a-V(아래 최소 마크업 그대로).
 */
export function EventDashboardView({ eventId }: { eventId: string }) {
  const d = useEventDashboard(eventId);
  const content = (
    <section aria-labelledby="dashboard-title" className={s.page}>
      <VisuallyHidden asChild>
        <h1 id="dashboard-title">대시보드</h1>
      </VisuallyHidden>
      <DashboardNotices d={d} />
      <EventHead event={d.event} eventId={eventId} />
      {d.mode === 'registered' ? (
        <div data-testid="dashboard-registered">
          {d.statsStatus === 'pending' && <p>불러오는 중</p>}
          {d.statsStatus === 'error' && (
            <p role="alert">
              불러오지 못했어요{' '}
              <button type="button" onClick={d.retryStats}>
                다시 시도
              </button>
            </p>
          )}
          {d.stats && (
            <>
              {d.stats.newBadgeCount > 0 && (
                <p data-testid="new-badge">NEW {d.stats.newBadgeCount}</p>
              )}
              <ul aria-label="주문 현황">
                {d.stats.cards.map((c) => (
                  <li key={c.key} data-testid={`stat-${c.key}`}>
                    <Link href={c.href}>
                      {c.label} {c.count}
                    </Link>
                  </li>
                ))}
              </ul>
              <p data-testid="sales">
                {d.stats.sales.state === 'beforeSale'
                  ? '판매 전'
                  : `${d.stats.sales.totalSoldCount}매 · ${d.stats.sales.salesAmount.toLocaleString('ko-KR')}원`}
              </p>
              <p data-testid="entrance">입장 현황 {d.stats.entrance.label}</p>
              <Link href={d.stats.qrHref}>QR 체크인 열기 →</Link>
              <ol aria-label="공연 일정">
                {d.stats.timeline.map((s) => (
                  <li key={s.key} data-testid={`timeline-${s.key}`} data-state={s.state}>
                    {s.label} {s.from ?? ''}
                    {s.to ? ` ~ ${s.to}` : ''}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      ) : (
        <ChecklistSection d={d} />
      )}
    </section>
  );
  // 등록 후만 우측 일정 패널 자리(P4s-V 슬롯). 패널 본문(`일정 패널`)은 P13a-V
  return d.mode === 'registered' ? (
    <EventPanelLayout panel={null}>{content}</EventPanelLayout>
  ) : (
    content
  );
}

/** 만든 직후·등록 직후 토스트(디자인 없음 — 문구는 GUI `298:2617`·와이어 `424:11427`). 띄우고 상태를 끈다 */
function DashboardNotices({ d }: { d: Dashboard }) {
  const { createdNotice, dismissCreatedNotice, justRegistered, acknowledgeRegistered } = d;
  useEffect(() => {
    if (!createdNotice) return;
    toast('새로운 공연이 추가되었습니다!', { id: 'event-created' });
    dismissCreatedNotice();
  }, [createdNotice, dismissCreatedNotice]);
  useEffect(() => {
    if (!justRegistered) return;
    toast('공연이 등록되었습니다.', { id: 'event-registered' });
    acknowledgeRegistered();
  }, [justRegistered, acknowledgeRegistered]);
  return null;
}

/**
 * 머리 — 포스터(+ 상태 칩) · 호스트 · 공연명, PC는 일자·시간·장소·태그 4줄과 연필(기본 정보로).
 * GUI 모바일 `727:23098`~ · PC `727:23242`. 값이 없는 줄은 뺀다(준비중 공연은 대부분 비어 있다)
 */
function EventHead({ event, eventId }: { event: EventManage; eventId: string }) {
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
          // 업로드 포스터를 그대로 그린다(v1 #378 `/_next/image` 차단)
          // eslint-disable-next-line @next/next/no-img-element
          <img className={s.poster} src={event.posterImageUrl} alt="공연 포스터" decoding="async" />
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
        {event.hostName && <Txt typography="headingSm">{event.hostName}</Txt>}
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
                <Txt as="dd" typography="headingSm" style={{ margin: 0 }}>
                  {v}
                </Txt>
              </Flex>
            ))}
          </dl>
        )}
      </div>
      {/* FIGMA-CUSTOM: 머리 연필 버튼(gui 727:23261 "Frame 34491") 커스텀 → DS Button(dark, small, 아이콘만). Figma 코멘트 2026-11-01 */}
      <Link
        href={eventHref(eventId, 'info')}
        aria-label="기본 정보 수정"
        className={`${button({ variant: 'dark', size: 'sm', iconOnly: true })} ${s.edit}`}
      >
        <Icon name="edit" size={24} />
      </Link>
    </div>
  );
}

/** `필수 체크리스트`(DS `627:1799` unchecked / checked) + 유의사항(GUI `748:35527`) + 등록 확인 · 준비 완료 팝업 */
function ChecklistSection({ d }: { d: Dashboard }) {
  const confirmRegister = () =>
    void openConfirm({
      title: '공연을 등록할까요?',
      description:
        '공연을 등록하면 모든 사용자에게 공개되며 삭제할 수 없어요. 등록 후에도 공연 정보는 수정할 수 있어요.',
      confirmLabel: '등록',
      onConfirm: async () => {
        const ok = await d.register();
        if (!ok) throw new Error('register failed');
      },
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
            <Txt typography="bodyMd" color={colors.textSecondary}>
              불러오는 중
            </Txt>
          )}
          {d.checklistStatus === 'error' && (
            <div role="alert">
              <Flex align="center" gap={2} wrap>
                <Txt typography="bodyMd">체크리스트를 불러오지 못했어요.</Txt>
                <Button variant="secondary" size="sm" onClick={d.retryChecklist}>
                  다시 시도
                </Button>
              </Flex>
            </div>
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
                      {item.exempt && (
                        <Txt typography="labelSm" color={colors.textSecondaryLabel}>
                          {' '}
                          (티켓 없는 공연이라 필요 없어요)
                        </Txt>
                      )}
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
      <Popup
        open={d.justCompleted}
        onOpenChange={(o) => !o && d.acknowledgeCompleted()}
        title="공연 등록 준비가 완료되었어요!"
        description="이제 공연을 등록할 수 있어요."
        cancelLabel={null}
        onConfirm={d.acknowledgeCompleted}
      />
    </>
  );
}
