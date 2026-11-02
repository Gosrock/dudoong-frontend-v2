'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useSuspenseQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { homeQuery } from '@/api/event/queries';
import { ConcertCard } from '@/ui/components/ConcertCard/ConcertCard';
import { fab } from '@/ui/components/Fab/Fab.css';
import { Icon } from '@/ui/icons/Icon';
import { assetSrc } from '@/ui/illustrations/assetSrc';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import heroSmall from './assets/home-hero-780.jpg';
import heroLarge from './assets/home-hero-1170.jpg';
import * as s from './HomeView.css';
import { concertCardDate, concertCardPrice, UNNAMED_EVENT } from './model/card-date';
import { ScrollTopButton } from './ui/ScrollTopButton';

/**
 * 공연홈(GP-1, GUI `759:22391` · PC 와이어 `626:19888`). 라우트가 `<Prefetch>`로 넘긴 캐시를 읽는다(`(public)`이라 Suspense 없음).
 * 히어로 → "더 많은 공연 둘러보기 →" 가로 캐러셀 → ↑. PC는 같은 순서에 본문 1200, 캐러셀은 화면 오른쪽 끝까지 흐른다.
 * "두둥 소개"(GUI `759:22549`)는 내용·목적지가 정해지지 않아 그리지 않는다(design-requests Q4 묶음, figma-structure 개발 메모).
 */
export function HomeView() {
  const { data } = useSuspenseQuery(homeQuery());
  return (
    <main className={s.main}>
      <VisuallyHidden asChild>
        <h1>두둥</h1>
      </VisuallyHidden>
      <div className={s.hero}>
        {/* GUI `759:22590` 그룹을 Figma에서 그대로 내보낸 그림(2x 780 · 3x 1170). 첫 화면이라 바로 읽는다 */}
        {/* eslint-disable-next-line @next/next/no-img-element -- 정적 자산, /_next/image는 nginx가 막는다(v1 #378) */}
        <img
          className={s.heroImage}
          src={assetSrc(heroSmall)}
          srcSet={`${assetSrc(heroSmall)} 780w, ${assetSrc(heroLarge)} 1170w`}
          sizes="(min-width: 600px) 600px, 100vw"
          width={390}
          height={390}
          alt=""
          fetchPriority="high"
        />
      </div>

      <section className={s.section} aria-label="다가오는 공연">
        <div className={s.sectionHead}>
          <Link href="/events" className={s.moreLink}>
            <Txt as="h2" typography="headingMdEmphasized">
              더 많은 공연 둘러보기
            </Txt>
            <span className={`${fab} ${s.moreArrow}`} aria-hidden>
              <Icon name="forward" size={24} />
            </span>
          </Link>
        </div>
        {data.events.length === 0 ? (
          <Txt as="p" typography="bodyMd" color={colors.textSecondary} className={s.empty}>
            예정된 공연이 없어요.
          </Txt>
        ) : (
          <ul className={s.carousel}>
            {data.events.map((e) => (
              <li key={e.eventId} className={s.carouselItem}>
                <ConcertCard
                  href={`/events/${e.eventId}`}
                  title={e.name ?? UNNAMED_EVENT}
                  date={concertCardDate(e.startAt)}
                  price={concertCardPrice(e)}
                  posterUrl={e.posterImageUrl}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ScrollTopButton />
    </main>
  );
}
