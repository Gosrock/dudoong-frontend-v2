'use client';

import { Fab } from '@/ui/components/Fab/Fab';
import { Icon } from '@/ui/icons/Icon';

import * as s from './ScrollTopButton.css';

/**
 * 맨 위로(GUI 공연 리스트 `759:12102` · PC 와이어 공연홈 `626:19888`). 스크롤 위치와 상관없이 늘 보인다(Figma 첫 화면에도 있다).
 * 움직임 줄이기 설정이면 바로 올라간다.
 */
export function ScrollTopButton() {
  return (
    <Fab
      className={s.root}
      icon={<Icon name="up" />}
      aria-label="맨 위로"
      onClick={() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      }}
    />
  );
}
