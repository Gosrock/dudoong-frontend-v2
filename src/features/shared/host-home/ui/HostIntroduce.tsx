'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './HostIntroduce.css';

/**
 * 호스트 소개글 — 3줄까지 보이고 넘치면 [더보기 ⌄] → 펼치면 [접기 ⌃](GUI `1464:4953` · `1465:5019`, Design Sync #257).
 * 넘치는지는 하이드레이션 뒤 실제 높이로 잰다(폭이 바뀌면 다시) — 서버 HTML은 3줄로 잘린 글만(버튼 없음).
 */
export function HostIntroduce({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, text]);

  return (
    <div className={s.root}>
      <Txt as="p" typography="headingSm" className={s.text}>
        <span ref={ref} className={expanded ? undefined : s.clampBox}>
          {text}
        </span>
      </Txt>
      {(overflows || expanded) && (
        <button
          type="button"
          className={s.toggle}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <Txt typography="labelMd" color={colors.textTertiary}>
            {expanded ? '접기' : '더보기'}
          </Txt>
          {expanded ? (
            <Icon name="chevron-up" className={s.toggleIcon} />
          ) : (
            <Icon name="chevron-down" className={s.toggleIcon} />
          )}
        </button>
      )}
    </div>
  );
}
