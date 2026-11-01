'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useId } from 'react';

import { NO_SEARCH_ATTR } from '@/features/audience/shell/AudienceShell.css';
import { useActivityMarker } from '@/features/shared/shell/useActivityMarker';
import { Button } from '@/ui/components/Button/Button';
import { ConcertCard } from '@/ui/components/ConcertCard/ConcertCard';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { FilterChip } from '@/ui/components/FilterChip/FilterChip';
import { LoadMoreSentinel } from '@/ui/components/LoadMoreSentinel/LoadMoreSentinel';
import { Popover } from '@/ui/components/Popover/Popover';
import { SearchField } from '@/ui/components/SearchField/SearchField';
import { Skeleton, SkeletonText } from '@/ui/components/Skeleton/Skeleton';
import { Toggle } from '@/ui/components/Toggle/Toggle';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './EventListView.css';
import { concertCardDate, UNNAMED_EVENT } from './model/card-date';
import { useEventList } from './model/useEventList';
import { ScrollTopButton } from './ui/ScrollTopButton';
import { TagPanel } from './ui/TagPanel';

/** 첫 페이지를 읽는 동안 그리는 카드 수(GUI `759:7895` 첫 화면 6장) */
const SKELETON_COUNT = 6;

/**
 * 공연 리스트(GP-2 + GE-11, GUI `759:7895` 예매하기 · `759:11869` 태그선택 · PC 와이어 `640:1032`·`640:1425`).
 * 검색칸 → [태그 ▾] · 지난공연보기 · 공연임박순(고정) → ConcertCard 격자(모바일 2 · 600~ 3 · PC 4열) → 무한 스크롤 → ↑.
 * 상태는 L 훅(`useEventList`)이 주소와 맞춘다. 헤더의 검색 아이콘은 숨긴다(`NO_SEARCH_ATTR`).
 */
export function EventListView() {
  const l = useEventList();
  const pastLabelId = useId();
  const { events } = l;
  // 이동 뒤 숨은 Activity로 남아도 다른 화면의 검색 아이콘을 숨기지 않게(fix-qa-1101)
  const markerRef = useActivityMarker<HTMLElement>();
  return (
    <main ref={markerRef} className={s.main} {...{ [NO_SEARCH_ATTR]: '' }}>
      <VisuallyHidden asChild>
        <h1>공연 둘러보기</h1>
      </VisuallyHidden>
      <Illustration name="login" width={128} className={s.illustration} />

      <form
        role="search"
        className={s.search}
        onSubmit={(e) => {
          e.preventDefault();
          l.submitKeyword();
        }}
      >
        <SearchField
          aria-label="공연명 또는 호스트명"
          placeholder="검색어를 입력해주세요"
          enterKeyHint="search"
          value={l.keywordInput}
          onChange={(e) => l.setKeywordInput(e.target.value)}
          onClear={l.submitKeyword}
        />
      </form>

      <div className={s.filters}>
        <div className={s.filtersStart}>
          {/* FIGMA-CUSTOM: 태그 패널 상자(gui 759:12049 "Frame 1707480347" 흰 판 · 테두리 · 모서리 8) 커스텀 → DS Popover. Figma 코멘트 2026-11-01 */}
          <Popover
            trigger={<FilterChip label="태그" count={l.tags.selectedCount} />}
            label="태그 고르기"
            align="start"
          >
            <TagPanel tags={l.tags} onToggle={l.toggleTag} onReset={l.resetTags} />
          </Popover>
          <span className={s.pastToggle}>
            <Txt typography="labelSm" color={colors.textPrimary}>
              <span id={pastLabelId}>지난공연보기</span>
            </Txt>
            <Toggle
              aria-labelledby={pastLabelId}
              checked={l.filter.includePast}
              onCheckedChange={l.setIncludePast}
            />
          </span>
        </div>
        {/* DS SortButton — 서버 정렬이 하나라 고정 라벨, 누를 수 없다(design-system §3 · patterns §13) */}
        <Txt typography="labelSm" color={colors.textPrimary}>
          공연임박순
        </Txt>
      </div>

      <section aria-label="공연 목록" aria-busy={events.status === 'pending'}>
        {events.status === 'pending' && (
          <ul className={s.grid} aria-hidden>
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <li key={i} className={s.skeletonCard}>
                <Skeleton className={s.skeletonPoster} />
                <SkeletonText lines={2} lineHeight={16} />
              </li>
            ))}
          </ul>
        )}
        {events.status === 'error' && (
          <div role="alert" className={s.state}>
            <EmptyState
              description="공연 목록을 불러오지 못했어요."
              action={
                <Button variant="secondary" size="sm" onClick={events.retry}>
                  다시 시도
                </Button>
              }
            />
          </div>
        )}
        {events.status === 'empty' && (
          <div className={s.state}>
            <EmptyState
              illustration={<Illustration name="no-search-result" />}
              description="조건에 맞는 공연이 없어요."
            />
          </div>
        )}
        {events.items.length > 0 && (
          <ul className={s.grid}>
            {events.items.map((e) => (
              <li key={e.eventId}>
                <ConcertCard
                  href={`/events/${e.eventId}`}
                  title={e.name ?? UNNAMED_EVENT}
                  date={concertCardDate(e.startAt)}
                  posterUrl={e.posterImageUrl}
                />
              </li>
            ))}
          </ul>
        )}
        {events.status === 'success' && <LoadMoreSentinel list={events} />}
      </section>

      <ScrollTopButton />
    </main>
  );
}
