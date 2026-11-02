'use client';

import { STATE_TONE_COLOR } from '@/features/audience/ticket/ui/state-tone';
import { Chip } from '@/ui/components/Chip/Chip';
import { UploadedImage } from '@/ui/components/UploadedImage/UploadedImage';

import type { OrderStatusView } from '../model/order-status';
import * as s from './mypage.css';

/** 상태 칩 + (거절·호스트 취소된 유료 주문의) 환불 진행 보조 칩 */
export function OrderStatusChips({ view }: { view: OrderStatusView }) {
  return (
    <span data-testid="order-status" data-tone={view.tone} className={s.chipRow}>
      <Chip size="sm" shape="square" color={STATE_TONE_COLOR[view.tone]} theme="weak">
        {view.label}
      </Chip>
      {view.refund && (
        <Chip size="sm" shape="square" color="grey" theme="weak">
          <span className={s.visuallyHidden}> · </span>
          {view.refund}
        </Chip>
      )}
    </span>
  );
}

/** 포스터 상자 + 오른쪽 위 배지(D-n · 공연 종료). 포스터가 없거나 못 읽으면 빈 상자(Q26 기본안) */
export function OrderPoster({ src, badge }: { src: string | null; badge: string | null }) {
  return (
    <span className={s.poster}>
      {src && (
        // 서버 이미지(업로드 출처면 `/_next/image` 최적화 — P15). 폭 76 · PC 120(mypage.css `poster`)
        <UploadedImage
          src={src}
          alt=""
          width={120}
          height={160}
          sizes="(min-width: 1024px) 120px, 76px"
          className={s.posterImage}
        />
      )}
      {badge && (
        <span className={s.posterChip}>
          <Chip size="sm" shape="square" color="grey" theme="weak">
            {badge}
          </Chip>
        </span>
      )}
    </span>
  );
}
