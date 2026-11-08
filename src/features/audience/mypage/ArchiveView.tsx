'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import Link from 'next/link';
import { type ReactNode, useId } from 'react';

import { UNNAMED_EVENT } from '@/features/shared/event-labels';
import { EmptyState, EmptyStateAction } from '@/ui/components/EmptyState/EmptyState';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { LoadMoreSentinel } from '@/ui/components/LoadMoreSentinel/LoadMoreSentinel';
import { Skeleton } from '@/ui/components/Skeleton/Skeleton';
import { Tab, TabList, Tabs } from '@/ui/components/Tabs/Tabs';
import { UploadedImage } from '@/ui/components/UploadedImage/UploadedImage';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as p from './ArchiveView.css';
import { useArchive } from './model/useArchive';
import { openArchivePoster } from './ui/ArchivePosterOverlay';
import * as s from './ui/mypage.css';

const ALL = 'all';

/**
 * `/mypage/archive` 지난 공연 아카이빙(P9-V, 와이어 근거 — 모바일 `503:16328` · PC `671:6692`).
 * 연도 탭(와이어 "2026년 2025년 …")은 DS `Tabs`로 — 앞에 "전체"를 둔다(서버가 전체 기준 `years`를 주고 `year` 없이 전체를 읽는다).
 * 포스터 그리드(모바일 2열 · PC 4열) + 공연 이름 + 공연 일시. 이름 · 일시는 `orderUuid`가 있으면 그 주문상세 링크, 없으면(선물받은 티켓) 글자만.
 * 포스터를 누르면 크게 보기 + [이미지 저장](Tomato 10-24 "이미지 크게 보이고 이미지 다운로드" — 2026-11-08, 디자인 없음 Q207).
 * 와이어의 CD 케이스 틀은 그리지 않는다(장식 — design-workflow §3).
 */
export function ArchiveView() {
  const a = useArchive();
  // 연도 탭은 패널을 따로 두지 않고 아래 목록 하나를 거른다 — Radix가 붙이는 없는 패널 id 대신 그 목록을 가리킨다(P14 접근성)
  const listId = useId();
  return (
    <main className={s.page}>
      <Txt as="h1" typography="headingMdEmphasized" className={s.title}>
        지난 공연 아카이빙
      </Txt>
      {a.tabs.length > 1 && (
        <div className={p.tabsBar}>
          <Tabs
            value={a.year === null ? ALL : String(a.year)}
            onValueChange={(v) => a.setYear(v === ALL ? null : Number(v))}
          >
            <TabList aria-label="연도" size="responsive">
              {a.tabs.map((t) => (
                <Tab
                  key={t.label}
                  value={t.year === null ? ALL : String(t.year)}
                  aria-controls={listId}
                >
                  {t.year === null ? t.label : `${t.label}년`}
                </Tab>
              ))}
            </TabList>
          </Tabs>
        </div>
      )}

      {a.listStatus === 'pending' && (
        <div aria-busy="true" className={p.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={200} />
          ))}
        </div>
      )}
      {a.listStatus === 'error' && <InlineError className={s.stateBox} onRetry={a.retry} />}
      {a.empty && (
        <div className={s.stateBox}>
          {/* 빈 상태는 와이어에 없다(Tomato 10-24 "빈 상태 만들기" 미해결) — DS EmptyState로(Figma 코멘트 — 디자인 없음) */}
          <EmptyState
            title="아직 관람한 공연이 없어요"
            description="입장한 공연이 끝나면 여기에 모여요."
            action={<EmptyStateAction href="/events">공연 둘러보기</EmptyStateAction>}
          />
        </div>
      )}

      <ul
        id={listId}
        className={p.grid}
        aria-label="관람한 공연"
        aria-busy={a.switching || undefined}
      >
        {a.events.map((e) => {
          const name = e.name ?? UNNAMED_EVENT;
          const text: ReactNode = (
            <>
              <Txt typography="labelLgEmphasized" lines={2}>
                {name}
              </Txt>
              <Txt typography="bodySm" color={colors.textTertiaryLabel}>
                {e.startAt ?? ''}
              </Txt>
            </>
          );
          const poster = e.posterImageUrl;
          return (
            <li key={e.eventId} data-testid="archive-event" className={p.gridItem}>
              {poster ? (
                <button
                  type="button"
                  className={p.posterButton}
                  aria-label={`${name} 포스터 크게 보기`}
                  onClick={() => openArchivePoster({ src: poster, name: e.name })}
                >
                  <ArchivePoster src={poster} />
                </button>
              ) : (
                <ArchivePoster src={null} />
              )}
              {e.orderHref ? (
                <Link href={e.orderHref} className={p.gridText}>
                  {text}
                  {/* 이름 = 보이는 공연명 · 날짜 + "주문상세"(WCAG 2.5.3, P14 접근성) */}
                  <VisuallyHidden> 주문상세</VisuallyHidden>
                </Link>
              ) : (
                <div className={p.gridText}>{text}</div>
              )}
            </li>
          );
        })}
      </ul>
      {a.listStatus === 'success' && <LoadMoreSentinel list={a} />}
    </main>
  );
}

function ArchivePoster({ src }: { src: string | null }) {
  return (
    <span className={p.gridPoster}>
      {src && (
        // 서버 이미지(업로드 출처면 `/_next/image` 최적화 — P15). 2열 · PC 4열(mypage.css `grid`)
        <UploadedImage
          src={src}
          alt=""
          width={240}
          height={240}
          sizes="(min-width: 1024px) 320px, 50vw"
          className={s.posterImage}
        />
      )}
    </span>
  );
}
