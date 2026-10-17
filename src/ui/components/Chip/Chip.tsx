import type { CSSProperties, ReactNode } from 'react';

import { chip } from './Chip.css';

type Common = { className?: string; style?: CSSProperties };

/**
 * 모양만 고른다. 서버 상태(티켓 상태 11가지, 공연 단계 등) → 모양 매핑은 쓰는 Phase가 정한다
 * (design-system §3 "없는 상태", 예시는 스토리 `Components/Chip`).
 */
export type ChipProps = Common &
  (
    | {
        /** Ticket state chip. brand=승인완료, muted=승인대기, accent=선물대기, success=선물완료, neutral·danger=임시(디자인 대기) */
        variant: 'status';
        tone: 'brand' | 'muted' | 'accent' | 'success' | 'neutral' | 'danger';
        children: ReactNode;
      }
    | {
        /** tag. default=공연 태그(회색), plain=티켓 수(흰 배경) */
        variant: 'tag';
        tone?: 'default' | 'plain';
        children: ReactNode;
      }
    | {
        /** role chip. GUEST는 칩 없음(호스트 행 `Role tag=false`) */
        variant: 'role';
        tone: 'master' | 'manager';
        children: ReactNode;
      }
    | {
        /** Concert state chip. ready=준비중, dday=D-n·D-day·공연 중, past=지난 공연 */
        variant: 'concert';
        tone: 'ready' | 'dday' | 'past';
        children: ReactNode;
      }
    | {
        /** money option chip. `amount`를 주면 "+ 1,000원"으로 쓴다 */
        variant: 'money';
        tone?: never;
        amount?: number;
        children?: ReactNode;
      }
  );

/** 옵션 추가 금액 표기 — Figma "+ N 원" */
export const formatOptionAmount = (amount: number) =>
  `${amount < 0 ? '-' : '+'} ${Math.abs(amount).toLocaleString('ko-KR')}원`;

/** Concert state chip의 D-day 글자. 0이면 "D-day"(design-system §3 "없는 상태"), 지난 날은 "D+n" */
export const formatDday = (dDay: number) =>
  dDay === 0 ? 'D-day' : dDay > 0 ? `D-${dDay}` : `D+${-dDay}`;

/** Figma Tag 페이지의 칩 5종. 훅이 없어 서버 컴포넌트에서도 쓴다. */
export function Chip(props: ChipProps) {
  const { variant, className, style } = props;
  const tone =
    variant === 'tag' ? (props.tone ?? 'default') : variant === 'money' ? undefined : props.tone;
  const content =
    variant === 'money' && props.amount !== undefined
      ? formatOptionAmount(props.amount)
      : props.children;
  const cls = chip({ variant, tone });
  return (
    <span
      className={className ? `${cls} ${className}` : cls}
      style={style}
      data-variant={variant}
      data-tone={tone}
    >
      {content}
    </span>
  );
}
