'use client';

import Link from 'next/link';

import { useEventList } from './model/useEventList';

/**
 * 공연 리스트(GP-2 + GE-11) — L 단계의 최소 마크업. 검색·태그 패널·지난공연 토글·카드 모양과 무한 스크롤 sentinel은 P5a-V.
 */
export function EventListView() {
  const s = useEventList();
  return (
    <main>
      <h1>공연 둘러보기</h1>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          s.submitKeyword();
        }}
      >
        <input
          type="search"
          aria-label="공연명 또는 호스트명"
          value={s.keywordInput}
          onChange={(e) => s.setKeywordInput(e.target.value)}
        />
      </form>
      <label>
        <input
          type="checkbox"
          checked={s.filter.includePast}
          onChange={(e) => s.setIncludePast(e.target.checked)}
        />
        지난공연
      </label>
      <p>공연임박순</p>
      <section aria-label={`태그 ${s.tags.selectedCount}개 선택`}>
        {s.tags.groups.map((g) => (
          <fieldset key={`${g.category}-${g.index}`}>
            <legend>{g.label}</legend>
            {g.tags.map((t) => (
              <button
                key={t.tagId}
                type="button"
                aria-pressed={t.selected}
                onClick={() => s.toggleTag(t.tagId)}
              >
                {t.name}
              </button>
            ))}
          </fieldset>
        ))}
        <button type="button" onClick={s.resetTags}>
          초기화
        </button>
      </section>
      <section aria-label="공연 목록" aria-busy={s.events.status === 'pending'}>
        {s.events.status === 'empty' && <p>조건에 맞는 공연이 없어요.</p>}
        {s.events.status === 'error' && (
          <button type="button" onClick={s.events.retry}>
            다시 시도
          </button>
        )}
        <ul>
          {s.events.items.map((e) => (
            <li key={e.eventId}>
              <Link href={`/events/${e.eventId}`}>{e.name ?? '이름 없는 공연'}</Link>
            </li>
          ))}
        </ul>
        {s.events.nextPageError ? (
          <button type="button" onClick={s.events.retry}>
            다시 시도
          </button>
        ) : (
          s.events.hasNextPage && (
            <button type="button" onClick={s.events.loadMore}>
              더 보기
            </button>
          )
        )}
      </section>
    </main>
  );
}
