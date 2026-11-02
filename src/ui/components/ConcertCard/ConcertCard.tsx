'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { Txt } from '../../primitives/Txt';
import { colors } from '../../theme/colors';
import { LinkProgress } from '../LinkProgress/LinkProgress';
import { UploadedImage } from '../UploadedImage/UploadedImage';
import * as s from './ConcertCard.css';

export type ConcertCardProps = {
  href: string;
  /** 공연명. 없으면 대신 보일 글자를 부르는 쪽이 준다 */
  title: string;
  /** 표시용 일시(예: `2026.01.01 수요일 (18:00)`). 없으면 줄을 비운다 */
  date?: string | null;
  /**
   * 날짜 줄 아래 가격 줄(예: `15,000원~` · `무료` · `매진` · `티켓 없음`). 없으면 그리지 않는다.
   * FIGMA-CUSTOM: DS ConcertCard(`759:22415`)에 가격 줄이 없다 — design-requests Q63 기본안. 🤖 Claude 판단(2026-11-02). Figma 코멘트 2026-11-02
   */
  price?: string | null;
  /** 서버 포스터 주소. 없거나 못 읽으면 빈 상자(design-requests Q26 — 기본 이미지 자산 없음) */
  posterUrl?: string | null;
  /** 포스터 왼쪽 위에 얹는 상태 표시(보통 `Chip` — 호스트 홈 "준비중"·"D-15", 와이어 `503:30867`). 없으면 그리지 않는다 */
  badge?: ReactNode;
  className?: string;
};

/**
 * Figma ConcertCard(디자인 시스템 — 포스터 + 날짜 + 제목, design-system §3). 카드 전체가 공연 상세 링크이고,
 * 누른 뒤 응답을 기다리는 동안 날짜 줄 끝에 이동 표시(`LinkProgress`)가 나온다 — `(public)`에는 `loading.tsx`가 없다(patterns §6).
 * 제목은 2줄 말줄임(컴포넌트 설정), 날짜는 말줄임 없음.
 */
export function ConcertCard({
  href,
  title,
  date,
  price,
  posterUrl,
  badge,
  className,
}: ConcertCardProps) {
  return (
    <Link href={href} className={className ? `${s.root} ${className}` : s.root}>
      <span className={s.posterWrap}>
        <Poster src={posterUrl ?? null} />
        {badge ? <span className={s.badge}>{badge}</span> : null}
      </span>
      <span className={s.meta}>
        <span className={s.dateRow}>
          <Txt typography="labelSm" color={colors.textSecondary} className={s.date}>
            {date ?? ''}
          </Txt>
          <LinkProgress size="sm" />
        </span>
        {price ? (
          <Txt typography="labelMdEmphasized" color={colors.textPrimaryLabel}>
            <span data-testid="card-price">{price}</span>
          </Txt>
        ) : null}
        <Txt typography="headingMd2Emphasized" lines={2} className={s.title}>
          {title}
        </Txt>
      </span>
    </Link>
  );
}

function Poster({ src }: { src: string | null }) {
  // 못 읽으면 `UploadedImage`가 아무것도 그리지 않아 회색 빈 상자만 남는다(#92-5 — 호스팅 카드도 같은 처리)
  return (
    <span className={s.poster}>
      {src ? (
        // 서버 이미지(업로드 출처면 `/_next/image` 최적화 — P15). 목록 4열(PC, 최대 1280) · 3열(600~) · 2열
        <UploadedImage
          className={s.posterImage}
          src={src}
          alt=""
          width={163}
          height={231}
          sizes="(min-width: 1024px) 320px, (min-width: 600px) 33vw, 50vw"
          decoding="async"
        />
      ) : null}
    </span>
  );
}
