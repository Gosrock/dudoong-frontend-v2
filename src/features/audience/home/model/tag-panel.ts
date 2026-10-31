import type { TagGroup } from '@/api/event/schema';

/** 태그 분류 이름(GUI 태그 패널 `324:3237` — 공연구분 · 장르 · 장소 · 팀). 모르는 분류는 "기타" */
export const TAG_CATEGORY_LABEL: Record<TagGroup['category'], string> = {
  EVENT_TYPE: '공연구분',
  GENRE: '장르',
  AREA: '장소',
  TEAM: '팀',
  UNKNOWN: '기타',
};

export type TagPanelGroup = {
  category: TagGroup['category'];
  label: string;
  tags: { tagId: number; name: string; selected: boolean }[];
  selectedCount: number;
};

/**
 * GE-11 응답 + 선택된 id → 태그 패널(분류별 칩 + 선택 수). 화면 값이 아니라 응답 순서대로 그린다(plan P5a).
 * 모르는 분류가 여럿이면 모두 UNKNOWN이라 순서(`index`)를 함께 둔다(렌더 key용).
 */
export function toTagPanel(groups: readonly TagGroup[], selected: readonly number[]) {
  const set = new Set(selected);
  const panel: (TagPanelGroup & { index: number })[] = groups.map((g, index) => {
    const tags = g.tags.map((t) => ({ ...t, selected: set.has(t.tagId) }));
    return {
      index,
      category: g.category,
      label: TAG_CATEGORY_LABEL[g.category],
      tags,
      selectedCount: tags.filter((t) => t.selected).length,
    };
  });
  return {
    groups: panel,
    /** 필터 칩 Badge 숫자(응답에 있는 태그 중 선택된 것) */
    selectedCount: panel.reduce((n, g) => n + g.selectedCount, 0),
  };
}
