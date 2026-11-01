'use client';

import { useEffect, useState } from 'react';

import { Fab } from '@/ui/components/Fab/Fab';
import { Icon } from '@/ui/icons/Icon';

import * as s from './ScrollTopButton.css';

/** 화면 높이의 이 비율만큼 내려가면 보인다 */
const SHOW_AFTER_VIEWPORT = 0.5;

/**
 * 맨 위로(GUI 공연 리스트 `759:12102` · PC 와이어 공연홈 `626:19888`). 움직임 줄이기 설정이면 바로 올라간다.
 *
 * 스크롤한 뒤에만 보인다(이슈 #92-8 — 첫 화면부터 떠 있으면 카드 제목을 가린다. Figma 첫 화면에는 있지만 겹침이 더 크다,
 * 🤖 Claude 판단). 서버와 첫 렌더는 숨김으로 같고(patterns §1), 마운트 뒤 스크롤 위치로 바꾼다. 숨김은 CSS
 * (`visibility: hidden`)라 탭 이동·스크린리더에도 빠진다.
 */
export function ScrollTopButton() {
  const visible = useScrolledPast();
  return (
    <Fab
      className={s.root}
      data-visible={visible || undefined}
      icon={<Icon name="up" />}
      aria-label="맨 위로"
      onClick={() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      }}
    />
  );
}

function useScrolledPast() {
  const [past, setPast] = useState(false);
  useEffect(() => {
    // 같은 값이면 React가 다시 그리지 않아 스크롤마다 렌더하지 않는다
    const update = () => setPast(window.scrollY > window.innerHeight * SHOW_AFTER_VIEWPORT);
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return past;
}
