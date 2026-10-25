'use client';

import Link from 'next/link';

import { useEventDashboard } from './model/useEventDashboard';

/**
 * `/hosting/events/[eventId]/dashboard` — 스타일 없는 최소 마크업(P11-L). "등록 준비 완료" 모달(`424:11318`)·등록 확인 팝업(`424:9837`)·
 * 토스트(`424:11427`, `298:2617`)는 P11-V — 여기서는 상태를 글자로만 보인다. 등록 후 통계(GD-1)는 P13a.
 */
export function EventDashboardView({ eventId }: { eventId: string }) {
  const d = useEventDashboard(eventId);
  return (
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
        <p data-testid="dashboard-registered">등록된 공연이에요. 판매 현황은 준비 중이에요.</p>
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
}
