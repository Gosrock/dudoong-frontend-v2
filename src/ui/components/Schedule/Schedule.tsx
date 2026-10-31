import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import type { ReactNode } from 'react';

import { Icon } from '../../icons/Icon';
import { Illustration } from '../../illustrations/Illustration';
import { Txt } from '../../primitives/Txt';
import { colors } from '../../theme/colors';
import * as s from './Schedule.css';

export type WeekDay = {
  /** "SUN"~"SAT" */
  weekday: string;
  day: number;
  state: 'past' | 'today' | 'future';
  /** 스크린리더 날짜(예: "10월 5일 수요일") */
  label: string;
};

/**
 * 주간 줄 — 디자인 시스템 `날짜`(`605:1875`). "26년 10월" + 일~토 7칸. 지난 날 회색 · 오늘 보라 원 · 앞날 검정 굵게.
 * 어느 주를 그릴지(오늘이 든 주)는 화면이 정한다(design-requests Q39 — 기본안).
 */
export function WeekStrip({ month, days }: { month: string; days: readonly WeekDay[] }) {
  return (
    <div className={s.week}>
      <Txt as="h2" typography="labelLgEmphasized">
        {month}
      </Txt>
      <ol className={s.days} aria-label="이번 주">
        {days.map((d) => (
          <li
            key={d.label}
            className={`${s.day} ${s.dayState[d.state]}`}
            aria-current={d.state === 'today' ? 'date' : undefined}
          >
            <span aria-hidden>
              <Txt typography="labelSm">{d.weekday}</Txt>
            </span>
            <Txt typography="labelMd" className={s.date}>
              <span aria-hidden>{d.day}</span>
              <VisuallyHidden>{d.label}</VisuallyHidden>
            </Txt>
          </li>
        ))}
      </ol>
    </div>
  );
}

export type ScheduleStepState = 'past' | 'current' | 'upcoming';

const STATE_LABEL: Record<ScheduleStepState, string> = {
  past: '지난 단계',
  current: '지금 단계',
  upcoming: '다음 단계',
};

/**
 * 공연 단계 한 칸 — 디자인 시스템 `일정`(`605:1848` — `지난 일정` / `현재 일정` / `미래 일정` / `미래일정_공연완료`).
 * 날짜 줄이 없으면(`dates` 비어 있음) `미래일정_공연완료` 모양이 된다. 현재 단계에는 `img_예매완료` 90이 붙는다.
 */
export function ScheduleStep({
  state,
  title,
  dates = [],
  'data-testid': testId,
}: {
  state: ScheduleStepState;
  title: string;
  /** 날짜 줄(현재 단계의 기간은 두 줄) */
  dates?: readonly ReactNode[];
  'data-testid'?: string;
}) {
  return (
    <li
      className={`${s.step} ${s.stepVariant[state]}`}
      data-state={state}
      data-testid={testId}
      aria-current={state === 'current' ? 'step' : undefined}
    >
      <span className={`${s.mark} ${s.markVariant[state]}`} aria-hidden>
        {state !== 'upcoming' && <Icon name="check" size={12} />}
      </span>
      <span className={s.stepText}>
        <Txt typography="labelLgEmphasized">
          {title}
          <VisuallyHidden> — {STATE_LABEL[state]}</VisuallyHidden>
        </Txt>
        {dates.length > 0 && (
          <span>
            {dates.map((line, i) => (
              <Txt
                key={i}
                as="span"
                typography="labelMd"
                color={state === 'current' ? undefined : colors.textSecondaryLabel}
                style={{ display: 'block' }}
              >
                {line}
              </Txt>
            ))}
          </span>
        )}
      </span>
      {state === 'current' && (
        <Illustration name="booking-complete" width={90} className={s.stepIllustration} />
      )}
    </li>
  );
}
