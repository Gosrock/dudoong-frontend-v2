'use client';

import Link from 'next/link';

import { EventPanelLayout } from '@/features/hosting/shell/EventScopeFrame';

import { useEventDashboard } from './model/useEventDashboard';

/**
 * `/hosting/events/[eventId]/dashboard` — 스타일 없는 최소 마크업(P11-L). "등록 준비 완료" 모달(`424:11318`)·등록 확인 팝업(`424:9837`)·
 * 토스트(`424:11427`, `298:2617`)는 P11-V — 여기서는 상태를 글자로만 보인다. 등록 후 통계(GD-1, P13a-L) 카드·도넛·막대·일정 패널은 P13a-V.
 */
export function EventDashboardView({ eventId }: { eventId: string }) {
  const d = useEventDashboard(eventId);
  const content = (
    <section aria-labelledby="dashboard-title">
      <h1 id="dashboard-title">대시보드</h1>
      {d.createdNotice && (
        <p role="status" data-testid="created-notice">
          새로운 공연이 추가되었습니다!{' '}
          <button type="button" onClick={d.dismissCreatedNotice}>
            닫기
          </button>
        </p>
      )}
      {d.justRegistered && (
        <p role="status" data-testid="registered-notice">
          공연이 등록되었습니다.
        </p>
      )}
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
        <div data-testid="dashboard-checklist">
          <h2>필수 체크리스트</h2>
          {d.checklistStatus === 'pending' && <p>불러오는 중</p>}
          {d.checklistStatus === 'error' && (
            <p role="alert">
              불러오지 못했어요.{' '}
              <button type="button" onClick={d.retryChecklist}>
                다시 시도
              </button>
            </p>
          )}
          {d.progress && (
            <p data-testid="checklist-progress">
              {d.progress.done}/{d.progress.total}
            </p>
          )}
          <ul>
            {d.checklistItems?.map((item) => (
              <li key={item.key} data-testid={`checklist-${item.key}`} data-done={item.done}>
                <Link href={item.href}>{item.label}</Link>{' '}
                {item.exempt ? '티켓 없는 공연이라 필요 없어요' : item.done ? '완료' : '미완료'}
              </li>
            ))}
          </ul>
          {d.justCompleted && (
            <p role="status" data-testid="ready-notice">
              등록 준비 완료{' '}
              <button type="button" onClick={d.acknowledgeCompleted}>
                확인
              </button>
            </p>
          )}
          {d.showRegister && (
            <button type="button" disabled={!d.canRegister} onClick={() => void d.register()}>
              공연 등록하기
            </button>
          )}
          {d.registerError && <p role="alert">{d.registerError}</p>}
        </div>
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
