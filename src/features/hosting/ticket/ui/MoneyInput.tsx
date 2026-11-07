'use client';

import { useLayoutEffect, useRef } from 'react';

import { Input, type InputProps } from '@/ui/components/Input/Input';
import { formatAmountInput, parseAmountInput } from '@/utils/money';

type MoneyInputProps = Omit<InputProps, 'value' | 'defaultValue' | 'onChange' | 'inputMode'> & {
  /** 숫자 글자(`'10000'`) — 폼 값 그대로 */
  value: string;
  /** 숫자 글자만 넘긴다(쉼표·글자는 뺀다) */
  onValueChange?: (digits: string) => void;
};

/** 커서 앞에 있는 숫자 개수 */
const digitsBefore = (text: string, caret: number) =>
  text.slice(0, caret).replace(/\D/g, '').length;

/** 표시 글자에서 숫자 `n`개 뒤 자리 */
const caretAfterDigits = (text: string, n: number) => {
  if (n === 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (/\d/.test(text.charAt(i))) seen += 1;
    if (seen === n) return i + 1;
  }
  return text.length;
};

/**
 * 금액 입력 칸(티켓 가격 `767:*` · 옵션 '네' 추가금 `943:2200` · `933:2015`) — 칸에는 "1,000"처럼 쉼표를 보이고,
 * 폼에는 숫자 글자만 넘긴다(검증·서버 본문 그대로). 쉼표가 끼어도 커서는 친 숫자 뒤에 둔다.
 * DS `Input`을 감싼 hosting 안 작은 부품 — DS에 금액 칸이 없다(I-h6).
 */
export function MoneyInput({ value, onValueChange, ref, ...rest }: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  /** 다음 그리기 뒤 커서를 둘 자리(커서 앞 숫자 개수) */
  const pendingCaret = useRef<number | null>(null);
  const display = formatAmountInput(value);

  useLayoutEffect(() => {
    const el = inputRef.current;
    const n = pendingCaret.current;
    pendingCaret.current = null;
    if (!el || n === null || document.activeElement !== el) return;
    const at = caretAfterDigits(el.value, n);
    el.setSelectionRange(at, at);
  });

  return (
    <Input
      {...rest}
      ref={(el) => {
        inputRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      inputMode="numeric"
      value={display}
      onChange={(e) => {
        const raw = e.target.value;
        const caret = e.target.selectionStart ?? raw.length;
        const digits = parseAmountInput(raw);
        // 앞의 0을 지운 만큼 커서 앞 숫자도 준다
        const dropped = raw.replace(/\D/g, '').length - digits.length;
        pendingCaret.current = Math.max(0, digitsBefore(raw, caret) - dropped);
        onValueChange?.(digits);
      }}
    />
  );
}
