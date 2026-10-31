'use client';

import type { EventDetail } from '@/api/event/schema';
import { shareKakaoFeed } from '@/features/shared/kakao-share/model/kakao-sdk';
import { toast } from '@/ui/components/Toast/Toast';
import { copyText } from '@/utils/copy-text';

import { eventShareTemplate } from '../model/event-share';
import { eventPageUrl } from '../model/event-summary';

/**
 * 공유 버튼(모바일 포스터 위 · PC 정사각 버튼 — Q22 기본안). 카카오 공유창을 열고, SDK가 실패하면 주소를 복사한다(patterns §14).
 */
export async function shareEvent(event: EventDetail) {
  const url = eventPageUrl(window.location.origin, event.eventId);
  const result = await shareKakaoFeed(eventShareTemplate(event, url));
  if (result === 'shared') return;
  const copied = await copyText(url);
  toast(copied ? '공연 주소를 복사했어요' : '공유하지 못했어요. 잠시 후 다시 시도해 주세요.');
}
