'use client';

import type { ReactNode } from 'react';

import type { HostOrderDetail } from '@/api/order/schema';
import { Chip } from '@/ui/components/Chip/Chip';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';
import { formatSignedWon } from '@/utils/money';

import { text } from './guest-labels';
import * as s from './OrderDetailOverlay.css';

/** 주문 상세 · 발급 티켓 상세가 같이 쓰는 조각(정보 줄 · 섹션 · 티켓 카드 · 옵션 응답) */

// FIGMA-CUSTOM: 정보 줄(gui 1029:6899 "정보 줄" 로컬 컴포넌트 — 라벨 80 + 값) 커스텀 → 커스텀 OrderDetailOverlay.css.ts. DS 후보(design-system §3)
/** 라벨 + 값 한 줄(GUI 로컬 `정보 줄` — 형태=가로, 간격 12, `Body/md`) */
export function Line({
  label,
  children,
  end,
}: {
  label: string;
  children: ReactNode;
  end?: ReactNode;
}) {
  return (
    <div className={s.line}>
      <dt className={s.lineLabel}>
        <Txt typography="bodyMd" color={colors.textPrimaryLabel}>
          {label}
        </Txt>
      </dt>
      <dd className={s.lineValue}>
        <Txt typography="bodyMd" color={colors.textPrimaryLabel}>
          {children}
        </Txt>
        {end}
      </dd>
    </div>
  );
}

/** 섹션(제목 `Heading/sm - emphasized` + 줄들, 간격 8) */
export function Section({
  title,
  children,
  testId,
}: {
  title: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <Flex as="section" direction="column" gap={2} aria-label={title} data-testid={testId}>
      <Txt as="h3" typography="headingSmEmphasized" className={s.sectionTitle}>
        {title}
      </Txt>
      {children}
    </Flex>
  );
}

type Answers = HostOrderDetail['lines'][number]['optionAnswers'];

// FIGMA-CUSTOM: 티켓 카드(gui 1029:6909 "티켓 1" — 테두리 상자 · 모서리 8 · 안쪽 12) 커스텀 → 커스텀 OrderDetailOverlay.css.ts. DS 후보(design-system §3)
/** 티켓 카드 — 이름 + 종류 칩 · 오른쪽 상태 칩, 아래 옵션 응답 */
export function TicketCard({
  name,
  dudoong,
  end,
  answers,
}: {
  name: string;
  dudoong: boolean;
  end: ReactNode;
  answers: Answers;
}) {
  return (
    <li className={s.card}>
      <Flex align="center" gap={2}>
        <Txt typography="bodyMd" color={colors.textPrimaryLabel}>
          {name}
        </Txt>
        {dudoong && (
          <Chip shape="round" color="violet" theme="weak">
            두둥 티켓
          </Chip>
        )}
        <span className={s.cardEnd}>{end}</span>
      </Flex>
      <OptionAnswers answers={answers} />
    </li>
  );
}

/** 옵션 응답 — "옵션 1. 질문" + 응답(GUI 로컬 `옵션 1` — 간격 2, `Body/md`) */
export function OptionAnswers({ answers }: { answers: Answers }) {
  if (answers.length === 0) return null;
  return (
    <dl className={s.answers}>
      {answers.map((a, i) => (
        <div key={i} className={s.answer}>
          <Txt as="dt" typography="bodyMd" color={colors.textPrimaryLabel}>
            옵션 {i + 1}. {text(a.optionName)}
          </Txt>
          <Txt as="dd" typography="bodyMd" color={colors.textPrimaryLabel} className={s.plain}>
            {text(a.answer)}
            {a.additionalPrice > 0 ? ` (${formatSignedWon(a.additionalPrice)})` : ''}
          </Txt>
        </div>
      ))}
    </dl>
  );
}
