'use client';

import { useState } from 'react';

import { Chip, type ChipColor } from '@/ui/components/Chip/Chip';
import { UploadedImage } from '@/ui/components/UploadedImage/UploadedImage';

import type { OrderStatusView, OrderTone } from '../model/order-status';
import * as s from './mypage.css';

/**
 * 주문 상태 칩 색. 티켓탭(P8-V `ticket-chips.tsx`)과 같은 tone → 색 — 승인완료 green · 승인대기 cyan · 승인거절 red · 그 밖 grey.
 * 와이어 `128:2772`은 승인대기 회색 · 승인완료 파랑 · 승인거절 빨강 · 주문취소완료 검정 글자로 그렸지만 와이어 색은 가져오지 않는다
 * (design-workflow §3 — 같은 상태를 티켓탭 GUI와 같은 색으로).
 */
const TONE_COLOR: Record<OrderTone, ChipColor> = {
  positive: 'green',
  waiting: 'cyan',
  negative: 'red',
  muted: 'grey',
};

/** 상태 칩 + (거절·호스트 취소된 유료 주문의) 환불 진행 보조 칩 */
export function OrderStatusChips({ view }: { view: OrderStatusView }) {
  return (
    <span data-testid="order-status" data-tone={view.tone} className={s.chipRow}>
      <Chip size="sm" shape="square" color={TONE_COLOR[view.tone]} theme="weak">
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

/** 포스터 상자 + 오른쪽 위 배지(D-n · 공연종료). 포스터가 없거나 못 읽으면 빈 상자(Q26 기본안) */
export function OrderPoster({ src, badge }: { src: string | null; badge: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={s.poster}>
      {src && !failed && (
        // 서버 이미지(업로드 출처면 `/_next/image` 최적화 — P15). 폭 76 · PC 120(mypage.css `poster`)
        <UploadedImage
          src={src}
          alt=""
          width={120}
          height={160}
          sizes="(min-width: 1024px) 120px, 76px"
          ref={(img) => {
            if (img && img.complete && img.naturalWidth === 0) setFailed(true);
          }}
          className={s.posterImage}
          onError={() => setFailed(true)}
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
