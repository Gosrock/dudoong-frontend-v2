'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useId } from 'react';

import type { EventListItem } from '@/api/event/schema';
import { NO_SEARCH_ATTR } from '@/features/audience/shell/AudienceShell.css';
import { UNNAMED_EVENT } from '@/features/shared/event-labels';
import { eventHref } from '@/features/shared/routes';
import { Button } from '@/ui/components/Button/Button';
import { Chip } from '@/ui/components/Chip/Chip';
import { ConcertCard } from '@/ui/components/ConcertCard/ConcertCard';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { FilterChip } from '@/ui/components/FilterChip/FilterChip';
import { LoadMoreSentinel } from '@/ui/components/LoadMoreSentinel/LoadMoreSentinel';
import { Popover } from '@/ui/components/Popover/Popover';
import { SearchField } from '@/ui/components/SearchField/SearchField';
import { Skeleton, SkeletonText } from '@/ui/components/Skeleton/Skeleton';
import { Toggle } from '@/ui/components/Toggle/Toggle';
import { useActivityMarker } from '@/ui/hooks/useActivityMarker';
import { Icon } from '@/ui/icons/Icon';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './EventListView.css';
import { concertCardDate } from './model/card-date';
import { useEventList } from './model/useEventList';
import { useRecommendedEvents } from './model/useRecommendedEvents';
import { ScrollTopButton } from './ui/ScrollTopButton';
import { TagPanel } from './ui/TagPanel';

/** 첫 페이지를 읽는 동안 그리는 카드 수(GUI `759:7895` 첫 화면 6장) */
const SKELETON_COUNT = 6;

/**
 * 공연 리스트(GP-2 + GE-11, GUI `759:7895` 예매하기 · `939:34039` 예매하기(2줄) · `759:11869` 태그선택 · `1184:33829` · `1270:36348` 결과 없음 · PC 와이어 `640:1032`·`640:1425`).
 * 검색칸 → [태그 ▾] · 지난공연보기 · 공연임박순(고정) → ConcertCard 격자(모바일 2 · 600~ 3 · PC 4열) → 무한 스크롤 → ↑.
 * 상태는 L 훅(`useEventList`)이 주소와 맞춘다. 헤더의 검색 아이콘은 숨긴다(`NO_SEARCH_ATTR`).
 */
export function EventListView() {
  const list = useEventList();
  const pastLabelId = useId();
  const recommendedTitleId = useId();
  const { events } = list;
  // 검색어 · 태그로 찾은 결과가 없을 때만 추천을 부른다(GUI `1184:33829`)
  const noResult = events.status === 'empty' && list.hasConditions;
  // 태그를 고른 채 결과 없음(GUI `1270:36348`, #200)
  const tagNoResult = noResult && list.filter.tagIds.length > 0;
  const recommended = useRecommendedEvents(noResult);
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
          list.submitKeyword();
        }}
      >
        <SearchField
          // 서버 검색은 공연명 · 호스트 · 공연장 이름(백엔드 #922 — 2.5.6, B31). 안내 글자는 GUI `939:34039`대로 —
          // 공연장이 미리 보이던 옛 문구("공연명, 호스트, 공연장으로 검색")를 뺐다(Design Sync #201). 읽어 주는 이름에만 남긴다
          aria-label="공연명, 호스트, 공연장으로 검색"
          placeholder="검색어를 입력해 주세요"
          enterKeyHint="search"
          value={list.keywordInput}
          onChange={(e) => list.setKeywordInput(e.target.value)}
          onClear={list.submitKeyword}
        />
      </form>

      <div className={s.filters}>
        <div className={s.filtersStart}>
          {/* FIGMA-CUSTOM: 태그 패널 상자(gui 759:12049 "Frame 1707480347" · 새 판 1231:2003) Figma대로 — Popover(흰 판 · 테두리 #dddcda · 모서리 8 · drop shadow,
              2026-11-08 fm-ds-overlays O21 — Ready 밖이지만 사용자 결정 11-08). Figma 코멘트 2026-11-01 · 고침 2026-11-08 */}
          <Popover
            trigger={<FilterChip label="태그" count={list.tags.selectedCount} />}
            label="태그 고르기"
            align="start"
          >
            <TagPanel tags={list.tags} onToggle={list.toggleTag} onReset={list.resetTags} />
          </Popover>
          <span className={s.pastToggle}>
            <Txt typography="labelSm" color={colors.textPrimary}>
              <span id={pastLabelId}>지난공연보기</span>
            </Txt>
            <Toggle
              aria-labelledby={pastLabelId}
              checked={list.filter.includePast}
              onCheckedChange={list.setIncludePast}
            />
          </span>
        </div>
        {/* DS SortButton(GUI `759:8031` — 라벨 + chevron-down 12, 간격 4). 서버 정렬이 하나라 고정 라벨, 누를 수 없다
            (design-system §3 · patterns §13). ▾는 Figma대로 그린다 — 사용자 지정 근거 2026-11-08(옛: ▾ 없음) */}
        <span className={s.sort}>
          <Txt typography="labelSm" color={colors.textPrimary}>
            공연임박순
          </Txt>
          <Icon name="chevron-down" size={12} />
        </span>
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
        {noResult && (
          // 검색 결과 없음(GUI `1184:33829`, #158) — 그림 100 · 문구 둘, [검색 조건 지우기]는 GUI에 없어 뺐다(Q91).
          // 태그를 고른 채 결과가 없으면 GUI `1270:36348`(#200) — 문구 하나 + [필터 초기화](DS Button Secondary small)가 태그만 지운다.
          // 🤖 검색어와 태그가 같이 걸려 있어도 태그 판을 보인다(버튼이 태그만 지우고 검색어는 남김 — design-requests Q220)
          <div className={s.noResult}>
            <Illustration name="no-search-result" width={100} />
            <div className={s.noResultTexts}>
              <Txt as="p" typography="headingMd2" color={colors.textPrimary}>
                검색된 공연이 없습니다.
              </Txt>
              {!tagNoResult && (
                <Txt as="p" typography="bodyMd" color={colors.textTertiary}>
                  다른 검색어를 입력해보세요.
                </Txt>
              )}
            </div>
            {tagNoResult && (
              <Button variant="secondary" size="sm" onClick={list.resetTags}>
                필터 초기화
              </Button>
            )}
          </div>
        )}
        {events.status === 'empty' && !list.hasConditions && (
          <div className={s.state}>
            <EmptyState
              illustration={<Illustration name="no-search-result" />}
              // 조건 없이 0건(공연이 하나도 없음) — 디자인 없음(Figma 코멘트 759:7993)
              description="조건에 맞는 공연이 없어요."
            />
          </div>
        )}
        {events.items.length > 0 && (
          <ul className={s.grid}>
            {events.items.map((e) => (
              <li key={e.eventId}>
                <EventCard event={e} />
              </li>
            ))}
          </ul>
        )}
        {events.status === 'success' && <LoadMoreSentinel list={events} />}
      </section>

      {noResult && recommended.items.length > 0 && (
        <section aria-labelledby={recommendedTitleId} className={s.recommended}>
          <Txt as="h2" typography="headingMd2Emphasized" color={colors.textPrimary}>
            <span id={recommendedTitleId}>이런 공연은 어때요?</span>
          </Txt>
          <ul className={s.grid}>
            {recommended.items.map((e) => (
              <li key={e.eventId} className={s.recommendedItem}>
                <EventCard event={e} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <ScrollTopButton />
    </main>
  );
}

/**
 * 목록 카드 하나. 지난 공연(`displayStatus` PAST — 종료 · 정산중 · 지난 공연)은 GUI `939:34039`(#159)대로
 * 포스터 흐림 + 왼쪽 위 "공연종료" 칩(DS `tag_v2` small · round · grey · weak). 가격 줄은 어느 카드에도 없다 —
 * GUI `759:7895` · `939:34039`(사용자 지정 근거 2026-11-08)대로 날짜 + 제목만(옛 Q63 기본안을 뺌, 🤖 되돌리기: `price={concertCardPrice(e)}`)
 */
function EventCard({ event: e }: { event: EventListItem }) {
  const ended = e.displayStatus === 'PAST';
  return (
    <ConcertCard
      href={eventHref(e.eventId)}
      title={e.name ?? UNNAMED_EVENT}
      date={concertCardDate(e.startAt)}
      posterUrl={e.posterImageUrl}
      ended={ended}
      badge={
        ended ? (
          <Chip size="sm" shape="round" color="grey" theme="weak">
            공연종료
          </Chip>
        ) : undefined
      }
    />
  );
}
