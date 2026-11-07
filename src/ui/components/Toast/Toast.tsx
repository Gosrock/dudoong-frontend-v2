'use client';

import type { CSSProperties } from 'react';
import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner';

import * as s from './Toast.css';

export type ToastOptions = {
  /**
   * 같은 id면 새로 쌓지 않고 바꾼다. 배경 재조회가 한꺼번에 실패해도 하나만 뜨게
   * 쿼리는 queryKey 해시, mutation은 에러 코드를 준다(patterns §4-5).
   */
  id?: string;
  /** ms. 기본 3000 */
  duration?: number;
  /**
   * `default` — DS `Toast popup`(흰 판). `success` — 연두 판 · 초록 `Heading/sm` · 모서리 16 · 테두리 없음 · 글자 폭만큼
   * (R1d — GUI 링크 복사 토스트 `908:21601`이 직접 그린 모양, 2026-11-08). FIGMA-CUSTOM: DS에 없는 변형(2단계 후보)
   */
  tone?: 'default' | 'success';
  /** `bottom`(기본 — 화면 아래 가운데) · `top`(머리 아래 — `908:21601` 화면 위 93) */
  position?: 'bottom' | 'top';
};

/**
 * 명령형 토스트. 훅이 아니라서 컴포넌트 밖(QueryCache·MutationCache.onError)에서도 부른다.
 * 기본은 문구만(DS `Toast popup`에 상태 · 액션이 없다 — design-system §3), 성공 모양은 `tone: 'success'`.
 */
export function toast(message: string, options: ToastOptions = {}) {
  return sonnerToast(message, {
    id: options.id,
    duration: options.duration,
    className: options.tone === 'success' ? s.success : undefined,
    position: options.position === 'top' ? 'top-center' : undefined,
  });
}

toast.dismiss = (id?: string) => sonnerToast.dismiss(id);

/**
 * 루트 Providers에 한 번 둔다. 화면 아래 가운데, 최대 3개.
 * 자리는 화면이 정한다(`toastPosition` — 모바일 FAB 위 · 호스팅 PC 본문 영역 가운데, I-h2)
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      duration={3000}
      visibleToasts={3}
      gap={8}
      containerAriaLabel="알림"
      offset={s.toastOffset}
      mobileOffset={s.toastMobileOffset}
      // sonner 목록 폭 변수 — Figma 358
      style={{ '--width': '358px' } as CSSProperties}
      toastOptions={{ unstyled: true, classNames: { toast: s.toast, title: s.title } }}
    />
  );
}
