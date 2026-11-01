'use client';

import type { ReactNode } from 'react';

import { useActivityMarker } from '@/features/shared/shell/useActivityMarker';

import * as s from './EventScopeFrame.css';
import { EVENT_SCOPE_ATTR } from './HostingShell.css';

/**
 * 공연 스코프 틀(plan P4s V — 3단 슬롯만). `[data-event-scope]`를 달아 호스팅 셸이 본문 폭 제한을 푼다.
 * 공연 밖으로 이동하면 이 틀은 숨은 Activity로 남으므로 `useActivityMarker`로 판정에서 뺀다(fix-qa-1101).
 * 사이드바 본문은 P11-V, 우측 일정 패널 본문은 P13a-V.
 */
export function EventScopeFrame({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const ref = useActivityMarker<HTMLDivElement>();
  return (
    <div ref={ref} className={s.frame} {...{ [EVENT_SCOPE_ATTR]: '' }}>
      <div className={s.sidebar}>{sidebar}</div>
      <div className={s.center}>{children}</div>
    </div>
  );
}

/** 가운데 + 우측 일정 패널(등록 후 대시보드만 — 페이지가 감싼다). 패널은 1024 이상에서만 보인다 */
export function EventPanelLayout({ panel, children }: { panel: ReactNode; children: ReactNode }) {
  return (
    <div className={s.withPanel}>
      <div>{children}</div>
      <aside className={s.panel} aria-label="공연 일정">
        {panel}
      </aside>
    </div>
  );
}
