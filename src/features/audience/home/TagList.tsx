'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { eventTagsQuery } from '@/api/event/queries';
import type { TagGroup } from '@/api/event/schema';
import { Button } from '@/ui/components/Button/Button';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';

const CATEGORY_LABEL: Record<TagGroup['category'], string> = {
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
    <Flex as="section" direction="column" gap={5}>
      {data.map((group, i) => (
        // 모르는 카테고리가 여럿이면 모두 UNKNOWN이라 순서를 key에 섞는다
        <Flex key={`${group.category}-${i}`} direction="column" gap={2}>
          <Txt as="h2" typography="headingSmEmphasized">
            {CATEGORY_LABEL[group.category]}
          </Txt>
          <Flex wrap gap={2}>
            {group.tags.map((tag) => (
              <Button key={tag.tagId} size="sm" variant="secondary">
                {tag.name}
              </Button>
            ))}
          </Flex>
        </Flex>
      ))}
    </Flex>
  );
}
