'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { eventTagsQuery } from '@/api/event/queries';
import { Button } from '@/ui/components/Button/Button';

const CATEGORY_LABEL: Record<string, string> = {
  EVENT_TYPE: '공연구분',
  GENRE: '장르',
  AREA: '장소',
  TEAM: '팀',
  UNKNOWN: '기타',
};

/** P0 수직 슬라이스: 서버가 <Prefetch>로 받은 GE-11을 브라우저 캐시에서 읽는다. */
export function TagList() {
  const { data } = useSuspenseQuery(eventTagsQuery());
  return (
    <section>
      {data.map((group) => (
        <div key={group.category}>
          <h2>{CATEGORY_LABEL[group.category] ?? CATEGORY_LABEL.UNKNOWN}</h2>
          {group.tags.map((tag) => (
            <Button key={tag.tagId} size="sm">
              {tag.name}
            </Button>
          ))}
        </div>
      ))}
    </section>
  );
}
