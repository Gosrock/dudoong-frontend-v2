import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

import { Txt } from '../../primitives/Txt';
import { colors } from '../../theme/colors';
import { Chip } from '../Chip/Chip';
import * as s from './Schedule.css';

/**
 * 단계 상태 — `past` 지남(회색) · `current` 지금(보라 고리 + 회색 상자 + "진행 중") · `upcoming` 앞으로(빈 고리) ·
 * `canceled` 취소된 공연의 마지막 단계(회색 점 + 회색 상자, 배지 없음)
 */
export type ScheduleStepState = 'past' | 'current' | 'upcoming' | 'canceled';

export type ScheduleTimelineStep = {
  key: string;
  title: string;
  /** 날짜 줄(예: "1월 2일 ~ 1월 14일", "1월 15일 18:00"). 없으면 null */
  date: string | null;
  state: ScheduleStepState;
};

const STATE_LABEL: Record<ScheduleStepState, string> = {
  past: '지남',
  current: '진행 중',
  upcoming: '예정',
  canceled: '취소',
};

/**
 * 대시보드 우측 일정 패널 — GUI `일정 패널_v2`(`1868:2240`, Design Sync #335 · 2026-11-21 — 옛 DS `일정 패널` 주간 줄 + 단계 카드를
 * 대신한다). 머리 "공연 일정 / 오늘 · M월 D일" + 세로 타임라인(왼쪽 레일 20: 점 + 선, 오른쪽 글자). 단계 · 상태는 화면이 정한다.
 */
export function SchedulePanel({
  today,
  steps,
  title = '공연 일정',
}: {
  /** 오늘(예: "1월 8일") — 머리 둘째 줄 "오늘 · …" */
  today: string;
  steps: readonly ScheduleTimelineStep[];
  title?: string;
}) {
  return (
    <div className={s.panel}>
      <div className={s.head}>
        <Txt as="h2" typography="headingSmEmphasized">
          {title}
        </Txt>
        <Txt as="p" typography="bodySm" color={colors.textSecondaryLabel}>
          오늘 · {today}
        </Txt>
      </div>
      <ol className={s.timeline} aria-label={title}>
        {steps.map((step, i) => (
          <ScheduleStep key={step.key} step={step} last={i === steps.length - 1} />
        ))}
      </ol>
    </div>
  );
}

function ScheduleStep({ step, last }: { step: ScheduleTimelineStep; last: boolean }) {
  const boxed = step.state === 'current' || step.state === 'canceled';
  const titleColor =
    step.state === 'past'
      ? colors.textTertiaryLabel
      : step.state === 'upcoming'
        ? colors.textSecondaryLabel
        : colors.textPrimaryLabel;
  return (
    <li
      className={`${s.step} ${boxed ? s.stepBoxed : ''}`}
      data-state={step.state}
      data-testid={`timeline-${step.key}`}
      aria-current={step.state === 'current' ? 'step' : undefined}
    >
      <span className={s.rail} aria-hidden>
        <span className={`${s.dot} ${s.dotState[step.state]}`} />
        {!last && <span className={`${s.line} ${s.lineState[step.state]}`} />}
      </span>
      <div className={boxed ? s.box : s.content}>
        {step.state === 'current' && (
          <span>
            <Chip color="violet" theme="fill" shape="round">
              진행 중
            </Chip>
          </span>
        )}
        <span className={s.texts}>
          <Txt typography="labelMdEmphasized" color={titleColor}>
            {step.title}
            {step.state !== 'current' && (
              <VisuallyHidden> ({STATE_LABEL[step.state]})</VisuallyHidden>
            )}
          </Txt>
          {step.date && (
            <Txt
              typography={boxed ? 'labelXs' : 'labelSm'}
              color={boxed ? colors.textSecondaryLabel : colors.textTertiaryLabel}
            >
              {step.date}
            </Txt>
          )}
        </span>
      </div>
    </li>
  );
}
