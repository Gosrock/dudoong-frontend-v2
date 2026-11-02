'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { newApprovedTicketsQuery } from '@/api/my-ticket/queries';
import { NOTIFICATIONS_KEY } from '@/api/notification/queries';

/**
 * 상세를 처음 받았을 때 공지 바(G11/T-3)와 알림(GN-2)을 한 번 무효화한다 — 읽음 동기화(코드 패턴 점검 A35: 조회 훅 안의 숨은 부수효과를
 * 이름으로 드러낸다). 서버가 T-2·GG-7a 응답 전에 그 주문의 승인 알림을 읽음 처리한다(#888, B9) — 응답 직후 T-3 `hasNew: false`라
 * 기다리거나 다시 읽지 않는다. 드물게 읽음 처리가 실패해도 T-2는 200이고 바는 다음에 열 때까지 남는다.
 *
 * `key`는 연 상세(티켓 uuid 또는 보낸 선물 id)마다 다른 값, `loaded`는 그 상세를 받았는지.
 */
export function useMarkTicketViewed(key: string | null, loaded: boolean) {
  const queryClient = useQueryClient();
  const viewed = useRef<string | null>(null);
  useEffect(() => {
    if (!key || !loaded || viewed.current === key) return;
    viewed.current = key;
    void queryClient.invalidateQueries({ queryKey: newApprovedTicketsQuery().queryKey });
    void queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_KEY] });
  }, [key, loaded, queryClient]);
}
