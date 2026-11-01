'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import type { ReactNode } from 'react';

import type { TicketOptionType } from '@/api/ticket-item/schema';
import { Chip } from '@/ui/components/Chip/Chip';
import { Toggle } from '@/ui/components/Toggle/Toggle';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';

import * as s from './TicketParts.css';

/** 옵션 응답 형식 라벨(GUI 칩 "주관식" · "네/아니오". 객관식은 v1 옵션만) */
export function optionTypeLabel(type: TicketOptionType | null) {
  return type === 'YES_NO' ? '네/아니오' : type === 'SUBJECTIVE' ? '주관식' : '객관식';
}

// FIGMA-CUSTOM: 노란 안내 상자(gui 793:11743 "Frame 1707480439") 커스텀 → 커스텀 TicketParts.css.ts. DS 후보(design-system §3)
/** 노란 안내 상자(아이콘 + 한 줄). `onClick`이 있으면 버튼 */
export function NoticeBox({
  icon,
  children,
  onClick,
  className,
}: {
  icon: 'lightbulb' | 'important';
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <Icon name={icon} />
      <Txt typography="bodyMd">{children}</Txt>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className={[s.noticeButton, className].filter(Boolean).join(' ')}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }
  return <p className={[s.notice, className].filter(Boolean).join(' ')}>{content}</p>;
}

/** 옵션 칩 둘 — 응답 형식(grey weak round) + 추가금(violet fill round, 0원이면 없음) */
export function OptionChips({
  type,
  yesAdditionalPrice,
}: {
  type: TicketOptionType | null;
  yesAdditionalPrice: number | null;
}) {
  return (
    <span className={s.chips}>
      <Chip shape="round" color="grey" theme="weak">
        {optionTypeLabel(type)}
      </Chip>
      {type === 'YES_NO' && (yesAdditionalPrice ?? 0) > 0 && (
        <Chip shape="round" color="violet" theme="fill">
          {`+${(yesAdditionalPrice ?? 0).toLocaleString('ko-KR')}원`}
        </Chip>
      )}
    </span>
  );
}

// FIGMA-CUSTOM: 옵션 행(gui 915:2516 "티켓 옵션 행" 로컬 컴포넌트) 커스텀 → 커스텀 TicketParts.css.ts. DS 후보(design-system §3)
/**
 * 옵션 행(GUI `티켓 옵션 행` — 상태 기본: 오른쪽 ✕ = 이 티켓에서 떼기 · 판매 발생: 오른쪽 › = 상세).
 * 행 본문을 누르면 상세(`onOpen`). `onDetach`가 있으면 ✕, 없으면 ›. 둘 다 없으면 보기만(가이드 예시)
 */
export function OptionRow({
  name,
  type,
  yesAdditionalPrice,
  onOpen,
  onDetach,
  detachDisabled,
}: {
  name: string;
  type: TicketOptionType | null;
  yesAdditionalPrice: number | null;
  onOpen?: () => void;
  onDetach?: () => void;
  detachDisabled?: boolean;
}) {
  const body = (
    <>
      <Txt typography="bodyMd" className={s.optionName}>
        {name}
      </Txt>
      <OptionChips type={type} yesAdditionalPrice={yesAdditionalPrice} />
    </>
  );
  // 이름 = 보이는 옵션 이름 · 칩 + "옵션 상세"(aria-label로 덮으면 칩이 읽히지 않는다 — WCAG 2.5.3, P14 접근성)
  const detailSuffix = <VisuallyHidden> 옵션 상세</VisuallyHidden>;
  if (!onOpen) {
    return (
      <div className={s.optionRow}>
        <span className={s.optionRowBody}>{body}</span>
        <span className={s.optionTrail} aria-hidden>
          <Icon name="chevron-right" size={12} />
        </span>
      </div>
    );
  }
  if (!onDetach) {
    return (
      <button type="button" className={s.optionRowButton} onClick={onOpen}>
        <span className={s.optionRowBody}>{body}</span>
        {detailSuffix}
        <span className={s.optionTrail} aria-hidden>
          <Icon name="chevron-right" size={12} />
        </span>
      </button>
    );
  }
  return (
    <div className={s.optionRow}>
      <button type="button" className={s.optionRowBody} onClick={onOpen}>
        {body}
        {detailSuffix}
      </button>
      <button
        type="button"
        className={s.optionTrail}
        aria-label={`${name} 옵션 빼기`}
        disabled={detachDisabled}
        onClick={onDetach}
      >
        <Icon name="close" size={12} />
      </button>
    </div>
  );
}

/**
 * 토글 칸(GUI 관리자 승인 여부 · 재고 정보 공개 · 구매 가능 매수 제한 · 판매 기간 설정 · '네' 선택 시 가격 추가하기):
 * 제목 `Heading/md2 - emphasized`(+ ⓘ) · 안내 `Body/md` | DS Toggle. 토글 이름은 제목. `children`은 토글 아래(금액 칸 등)
 */
export function ToggleSection({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
  onInfo,
  infoLabel,
  dimmed,
  children,
  testId,
}: {
  title: string;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (on: boolean) => void;
  disabled?: boolean;
  /** 제목 옆 ⓘ(`information` 16)를 누르면 */
  onInfo?: () => void;
  infoLabel?: string;
  /** 제목까지 흐리게(잠긴 칸) */
  dimmed?: boolean;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <div
      className={[s.toggleSection, dimmed && s.dimmed].filter(Boolean).join(' ')}
      data-testid={testId}
    >
      <div className={s.toggleHead}>
        <div className={s.toggleText}>
          <h2 className={s.toggleTitle}>
            <Txt typography="headingMd2Emphasized">{title}</Txt>
            {onInfo && (
              <button
                type="button"
                className={s.infoButton}
                aria-label={infoLabel ?? `${title} 설명`}
                onClick={onInfo}
              >
                <Icon name="information" size={16} />
              </button>
            )}
          </h2>
          {description && (
            <Txt as="p" typography="bodyMd" className={s.preLine}>
              {description}
            </Txt>
          )}
        </div>
        <Toggle
          aria-label={title}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
        />
      </div>
      {children}
    </div>
  );
}
