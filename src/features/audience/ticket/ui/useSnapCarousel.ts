'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 가로 스와이프 캐러셀(CSS scroll-snap). 가운데에 가장 가까운 칸을 "지금 칸"으로 본다.
 * 화면 크기를 JS로 읽지 않는다 — 스크롤 위치만 본다(마운트 뒤 이벤트 안에서).
 *
 * - `initial`: 처음 가운데에 둘 칸(마운트 때 한 번, 애니메이션 없이)
 * - `onChange`: 사용자가 넘겨 지금 칸이 바뀌면
 */
export function useSnapCarousel({
  count,
  initial = 0,
  onChange,
}: {
  count: number;
  initial?: number;
  onChange?: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(initial);
  const activeRef = useRef(initial);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const itemAt = (i: number) =>
    ref.current?.querySelectorAll<HTMLElement>(':scope > [data-carousel-item]')[i] ?? null;

  const scrollTo = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const root = ref.current;
    const item = itemAt(index);
    if (!root || !item) return;
    const left = item.offsetLeft + item.offsetWidth / 2 - root.clientWidth / 2;
    // 축소 모션이면 미끄러지지 않고 바로 간다(P14 접근성)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.scrollTo({ left, behavior: reduce && behavior === 'smooth' ? 'instant' : behavior });
  }, []);

  // 처음 칸으로(애니메이션 없이)
  const initialRef = useRef(initial);
  useEffect(() => {
    if (initialRef.current > 0) scrollTo(initialRef.current, 'instant');
  }, [scrollTo]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const center = root.scrollLeft + root.clientWidth / 2;
      const items = root.querySelectorAll<HTMLElement>(':scope > [data-carousel-item]');
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      items.forEach((el, i) => {
        const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      if (best !== activeRef.current) {
        activeRef.current = best;
        setActive(best);
        onChangeRef.current?.(best);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [count]);

  return { ref, active: Math.min(active, Math.max(0, count - 1)), scrollTo };
}
