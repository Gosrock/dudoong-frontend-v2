'use client';

import {
  type ReactNode,
  type Ref,
  type RefObject,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

import * as s from './Input.css';

export type FieldProps = {
  /** 칸 id. 라벨의 htmlFor와 aria-describedby가 이 값을 쓴다 */
  controlId: string;
  label?: ReactNode;
  /** 라벨 아래 설명(GUI 필드 설명 위치) */
  helper?: ReactNode;
  /** 있으면 칸 아래 빨간 문구 */
  error?: string;
  /** 라벨 옆 `*` */
  required?: boolean;
  /** 글자 수 카운터 "3/12" */
  count?: { length: number; max: number };
  className?: string;
  children: ReactNode;
};

/** 칸 id에서 도움말·에러 id를 만든다 */
export function fieldIds(controlId: string) {
  return { helperId: `${controlId}-helper`, errorId: `${controlId}-error` };
}

/** id가 없으면 useId로 만든다 */
export function useControlId(id?: string) {
  const auto = useId();
  return id ?? auto;
}

/** aria-describedby 값. 빈 값은 빼고, 아무것도 없으면 undefined */
export function describedBy(...ids: Array<string | false | null | undefined>) {
  const joined = ids.filter(Boolean).join(' ');
  return joined || undefined;
}

/**
 * 라벨 · 도움말 · 에러 · 글자 수를 칸 둘레에 놓는 틀. Input · TextArea · Dropdown · DatePicker가 같이 쓴다.
 * Figma에 없는 상태라 GUI `584:4775`(새 티켓 만들기)의 배치를 따른다 — 카운터는 칸 오른쪽 아래.
 */
export function Field({
  controlId,
  label,
  helper,
  error,
  required,
  count,
  className,
  children,
}: FieldProps) {
  const { helperId, errorId } = fieldIds(controlId);
  const hasHeader = Boolean(label || helper);
  const hasFooter = Boolean(error || count);
  return (
    <div className={className ? `${s.field} ${className}` : s.field}>
      {hasHeader && (
        <div className={s.header}>
          {label && (
            <label htmlFor={controlId} className={s.label}>
              {label}
              {required && (
                <span aria-hidden className={s.requiredMark}>
                  *
                </span>
              )}
            </label>
          )}
          {helper && (
            <span id={helperId} className={s.helper}>
              {helper}
            </span>
          )}
        </div>
      )}
      {children}
      {hasFooter && (
        <div className={s.footer}>
          {error && (
            <span id={errorId} role="alert" className={s.errorText}>
              {error}
            </span>
          )}
          {count && (
            <span className={s.counter} aria-hidden>
              {count.length}/{count.max}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** 여러 ref(객체·함수)를 하나로. React 19 ref 콜백 정리 함수까지 지킨다 */
export function useMergedRefs<T>(a: Ref<T> | undefined, b: Ref<T> | undefined) {
  return useMemo(() => mergeRefs(a, b), [a, b]);
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    const cleanups: Array<() => void> = [];
    for (const ref of refs) {
      if (typeof ref === 'function') {
        const c = ref(node);
        if (typeof c === 'function') cleanups.push(c);
        else cleanups.push(() => ref(null));
      } else if (ref) {
        ref.current = node;
        cleanups.push(() => {
          ref.current = null;
        });
      }
    }
    return () => cleanups.forEach((c) => c());
  };
}

/**
 * 네이티브 칸의 현재 값을 화면 상태로 따라간다(글자 수 카운터, 지우기 버튼, 빈 칸 표시).
 * 제어형이든 `register`(비제어)든 동작하도록 렌더 뒤 DOM 값을 읽어 맞춘다 — `reset()`처럼
 * 이벤트 없이 값이 바뀐 경우도 부모가 다시 렌더하면 따라온다. 입력 중에는 onChange에서 바로 갱신한다.
 */
export function useTrackedValue(
  ref: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  initial: string,
) {
  const [value, setValue] = useState(initial);
  // 의존성 없이 매 렌더 뒤에 돈다 — DOM 값이 바뀌었는지는 렌더 밖에서만 알 수 있다. 같은 값이면 setState하지 않아 반복되지 않는다
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.value !== value) setValue(el.value);
  });
  return [value, setValue] as const;
}

/** value·defaultValue prop을 문자열로 */
export function initialText(value: unknown, defaultValue: unknown) {
  const v = value ?? defaultValue;
  if (v == null) return '';
  return Array.isArray(v) ? v.join(',') : String(v);
}
