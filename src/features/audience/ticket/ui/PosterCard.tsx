'use client';

import { useState } from 'react';

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
    <button
      type="button"
      className={s.cardFrame}
      aria-label={label}
      onClick={(e) => onPress(e.currentTarget)}
    >
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
    // 서버 이미지(자산 도메인). nginx가 `/_next/image`를 막아 next/image 최적화를 쓰지 않는다(v1 #378, ConcertCard와 같다)
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={(img) => {
        if (img && img.complete && img.naturalWidth === 0) setFailed(true);
      }}
      className={s.posterImage}
      src={src}
      alt=""
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
