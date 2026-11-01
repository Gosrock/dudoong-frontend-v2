'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useState } from 'react';

import { UploadedImage } from '@/ui/components/UploadedImage/UploadedImage';

import type { TicketGroupView } from '../model/ticket-groups';
import { TicketStateChips } from './ticket-chips';
import * as s from './TicketTab.css';

/**
 * 묶음(주문) 카드 앞면 — 공연 포스터(`908:11288` "image 182-1" 294×416 · 모서리 16) + 오른쪽 위 상태 칩.
 * 한 주문에 티켓이 2장 이상이면 뒤에 기운 카드를 하나 겹친다(`908:11332` — 회전 · 포스터 위 검정 40%).
 * 포스터가 없거나 못 읽으면 빈 상자(`surface.imageBg` — Q26 기본안, 공연홈 ConcertCard와 같다).
 */
export function PosterCard({
  group,
  label,
  onPress,
}: {
  group: TicketGroupView;
  label: string;
  onPress: (el: HTMLElement) => void;
}) {
  const poster = group.group.event?.posterImageUrl ?? null;
  // FIGMA-CUSTOM: 티켓 카드(gui 908:11288 "image 182-1") 커스텀 → 커스텀 TicketTab.css.ts. DS 후보(design-system §3)
  return (
    <button type="button" className={s.cardFrame} onClick={(e) => onPress(e.currentTarget)}>
      {/* 이름은 label + 보이는 상태 칩(aria-label로 덮으면 칩이 읽히지 않는다 — WCAG 2.5.3, P14 접근성) */}
      <VisuallyHidden>{`${label} `}</VisuallyHidden>
      {group.total > 1 && (
        <span className={s.stack} aria-hidden>
          <Poster key={poster ?? ''} src={poster} />
        </span>
      )}
      <span className={s.card}>
        <Poster key={poster ?? ''} src={poster} />
        <TicketStateChips
          counts={group.counts}
          displayStatus={group.group.event?.displayStatus ?? null}
        />
      </span>
    </button>
  );
}

function Poster({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    // 서버 이미지(업로드 출처면 `/_next/image` 최적화 — P15). 카드 폭 `min(294px, 75vw)`(TicketTab.css)
    <UploadedImage
      ref={(img) => {
        if (img && img.complete && img.naturalWidth === 0) setFailed(true);
      }}
      className={s.posterImage}
      src={src}
      alt=""
      width={294}
      height={416}
      sizes="(min-width: 392px) 294px, 75vw"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
