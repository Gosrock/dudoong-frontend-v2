'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import Link from 'next/link';
import { type ReactNode, useId, useState } from 'react';

import { Button } from '@/ui/components/Button/Button';
import { EmptyState, EmptyStateAction } from '@/ui/components/EmptyState/EmptyState';
import { LoadMoreSentinel } from '@/ui/components/LoadMoreSentinel/LoadMoreSentinel';
import { Skeleton } from '@/ui/components/Skeleton/Skeleton';
import { Tab, TabList, Tabs } from '@/ui/components/Tabs/Tabs';
import { UploadedImage } from '@/ui/components/UploadedImage/UploadedImage';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { useArchive } from './model/useArchive';
import * as s from './ui/mypage.css';

const ALL = 'all';

/**
 * `/mypage/archive` 지난 공연 아카이빙(P9-V, 와이어 근거 — 모바일 `503:16328` · PC `671:6692`).
 * 연도 탭(와이어 "2026년 2025년 …")은 DS `Tabs`로 — 앞에 "전체"를 둔다(서버가 전체 기준 `years`를 주고 `year` 없이 전체를 읽는다).
 * 포스터 그리드(모바일 2열 · PC 4열) + 공연 이름 + 공연 일시. `orderUuid`가 있으면 그 주문상세로, 없으면(선물받은 티켓) 누를 수 없다.
 * 와이어의 CD 케이스 틀은 그리지 않는다(장식 — design-workflow §3). 포스터 크게 보기 · 다운로드(Tomato 10-24 미해결)는 범위 밖.
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
        <div className={s.tabsBar}>
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
        <div aria-busy="true" className={s.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={200} />
          ))}
        </div>
      )}
      {a.listStatus === 'error' && (
        <div role="alert" className={s.stateBox}>
          <Flex direction="column" align="center" gap={3}>
            <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
              불러오지 못했어요.
            </Txt>
            <Button variant="secondary" size="sm" onClick={a.retry}>
              다시 시도
            </Button>
          </Flex>
        </div>
      )}
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
        className={s.grid}
        aria-label="관람한 공연"
        aria-busy={a.switching || undefined}
      >
        {a.events.map((e) => {
          const body: ReactNode = (
            <>
              <ArchivePoster src={e.posterImageUrl} />
              <Txt typography="labelLgEmphasized" lines={2}>
                {e.name ?? '이름 없는 공연'}
              </Txt>
              <Txt typography="bodySm" color={colors.textTertiaryLabel}>
                {e.startAt ?? ''}
              </Txt>
            </>
          );
          return (
            <li key={e.eventId} data-testid="archive-event">
              {e.orderHref ? (
                <Link href={e.orderHref} className={s.gridItem}>
                  {body}
                  {/* 이름 = 보이는 공연명 · 날짜 + "주문상세"(WCAG 2.5.3, P14 접근성) */}
                  <VisuallyHidden> 주문상세</VisuallyHidden>
                </Link>
              ) : (
                <div className={s.gridItem}>{body}</div>
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
  const [failed, setFailed] = useState(false);
  return (
    <span className={s.gridPoster}>
      {src && !failed && (
        // 서버 이미지(업로드 출처면 `/_next/image` 최적화 — P15). 2열 · PC 4열(mypage.css `grid`)
        <UploadedImage
          src={src}
          alt=""
          width={240}
          height={240}
          sizes="(min-width: 1024px) 320px, 50vw"
          ref={(img) => {
            if (img && img.complete && img.naturalWidth === 0) setFailed(true);
          }}
          className={s.posterImage}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
