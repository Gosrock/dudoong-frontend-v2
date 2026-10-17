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
};

/**
 * 명령형 토스트. 훅이 아니라서 컴포넌트 밖(QueryCache·MutationCache.onError)에서도 부른다.
 * Figma에 성공·에러 구분과 액션이 없어 문구만 받는다(design-system §3 "없는 상태").
 */
export function toast(message: string, options: ToastOptions = {}) {
  return sonnerToast(message, { id: options.id, duration: options.duration });
}

toast.dismiss = (id?: string) => sonnerToast.dismiss(id);

/** 루트 Providers에 한 번 둔다. 화면 아래 가운데, 최대 3개 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      duration={3000}
      visibleToasts={3}
      gap={8}
      containerAriaLabel="알림"
      // sonner 목록 폭 변수 — Figma 358
      style={{ '--width': '358px' } as CSSProperties}
      toastOptions={{ unstyled: true, classNames: { toast: s.toast, title: s.title } }}
    />
  );
}
