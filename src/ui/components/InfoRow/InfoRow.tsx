import type { ReactNode } from 'react';

import { CopyButton } from './CopyButton';
import * as s from './InfoRow.css';

export type InfoRowHierarchy = 'first' | 'second' | 'third';

export type InfoRowProps = {
  /**
   * Figma `Hierarchy`. first = 굵은 큰 라벨 + 아래 선, second = 회색 라벨 + 위·아래 선, third = 선 없는 세부 행.
   * 펼침형(second-open/closed)은 `Accordion`을 쓴다.
   */
  hierarchy?: InfoRowHierarchy;
  label: ReactNode;
  /**
   * 값. 글자면 hierarchy에 맞는 글자 모양을 입힌다. 칩(`Chip`)·체크박스(`Checkbox`, Figma second-radio)·
   * 금액 칩 + 글자(text+money)는 노드로 넘긴다. 없으면 라벨만(value type=no)
   */
  value?: ReactNode;
  /** Figma value type=account — 계좌번호 + "복사" 버튼 */
  account?: {
    number: string;
    /** 복사 버튼 접근성 이름. 기본 "계좌번호 복사" */
    copyLabel?: string;
    onCopied?: () => void;
    onCopyError?: (error: unknown) => void;
  };
  /**
   * 값 글자를 굵게(`Label/md-emphasized` 700, 색은 hierarchy 그대로) — R1c: GUI 결제 화면 결제정보 줄(`564:4156` · 코멘트 `567:7913`)이
   * DS `list` 값 500을 700으로 덮어씀(2026-11-08). FIGMA-CUSTOM: DS에 없는 변형(2단계 후보)
   */
  valueEmphasized?: boolean;
  /**
   * 총액 줄 — 라벨 `Label/lg-emphasized` 진한색, 값 `Label/lg-emphasized` 보라(R1c — GUI 결제 화면 `567:7913` · 입금 확인 창 `567:9756`이
   * DS `list` 값 500을 700으로 덮어씀, 2026-11-08). 선은 hierarchy를 따른다. FIGMA-CUSTOM: DS에 없는 변형(2단계 후보)
   */
  total?: boolean;
  className?: string;
};

/**
 * 라벨 + 값 정보 행(Figma `list`). 행 하나가 `<dl>` 하나(dt + dd)라 어디에 두어도 마크업이 맞다. 값이 없으면 `<div>`.
 * account의 복사 버튼만 클라이언트 컴포넌트다.
 */
export function InfoRow({
  hierarchy = 'third',
  label,
  value,
  account,
  total,
  valueEmphasized,
  className,
}: InfoRowProps) {
  const cls = [s.row, s.hierarchy[hierarchy], className].filter(Boolean).join(' ');
  const valueTextCls = total
    ? s.totalValue
    : valueEmphasized
      ? s.valueTextEmphasized[hierarchy]
      : s.valueText[hierarchy];
  const valueNode = account ? (
    <>
      <CopyButton
        text={account.number}
        aria-label={account.copyLabel ?? '계좌번호 복사'}
        onCopied={account.onCopied}
        onCopyError={account.onCopyError}
      />
      <span className={valueTextCls}>{account.number}</span>
    </>
  ) : typeof value === 'string' || typeof value === 'number' || (total && value != null) ? (
    <span className={valueTextCls}>{value}</span>
  ) : (
    value
  );
  const labelCls = `${s.labelCell} ${total ? s.totalLabel : s.label[hierarchy]}`;
  // 값이 없으면(value type=no — 묶음 머리) 정의 목록이 아니다: `<dl>`에 `<dt>`만 두면 화면 읽기 도구가 짝 없는 용어로 읽는다(P14 접근성)
  if (valueNode === undefined || valueNode === null) {
    return (
      <div className={cls} data-hierarchy={hierarchy}>
        <div className={labelCls}>{label}</div>
      </div>
    );
  }
  return (
    <dl className={cls} data-hierarchy={hierarchy}>
      <dt className={labelCls}>{label}</dt>
      <dd className={s.value}>{valueNode}</dd>
    </dl>
  );
}
