import type { EventDetail } from '@/api/event/schema';
import {
  type KakaoFeedTemplate,
  kakaoFeedTemplate,
} from '@/features/shared/kakao-share/model/feed-template';

import { eventSummary, eventTitle } from './event-summary';

/**
 * 공연 상세 카카오 공유 내용(plan P5b — 모바일 공유 버튼, PC □ 버튼은 design-requests Q22 기본안대로 공유).
 * OG와 같은 공개 값만 쓴다. 공유창을 여는 것은 `shareKakaoFeed`(실패하면 부르는 쪽이 주소 복사).
 */
export function eventShareTemplate(event: EventDetail, pageUrl: string): KakaoFeedTemplate {
  return kakaoFeedTemplate({
    title: eventTitle(event),
    description: eventSummary(event),
    imageUrl: event.posterImageUrl,
    url: pageUrl,
    buttonTitle: '공연 보기',
  });
}
