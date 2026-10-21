import type { EventSection } from '@/api/event/schema';

import { renderSectionHtml } from './render-section';

/**
 * 공연 상세 섹션 탭 규칙(plan P5b, patterns §14).
 * 서버 섹션(GE-5)이 있으면 `sortOrder` 순서대로 그대로, 없으면 기본 4탭을 프론트가 만든다(내용 없음 → 빈 상태).
 * 새 공연은 서버에 섹션이 없다(tech-decisions §17). 미리보기(P11)도 같은 규칙을 쓴다.
 */

/** 기본 4탭 라벨(GUI `29:1017`·plan P5b) */
export const DEFAULT_SECTION_TITLES = ['공연소개', '예매안내', '세트리스트', '유의사항'] as const;

export type SectionTab = {
  /** 탭 키. 서버 섹션은 `section-{sectionId}`, v1 대체 섹션·기본 탭은 `section-at-{순서}` */
  key: string;
  title: string;
  /** sanitize를 거친 HTML. 내용이 없으면 null(빈 상태) */
  html: string | null;
  /** 서버에 섹션이 없어 프론트가 만든 기본 탭인지 */
  isDefault: boolean;
};

export function toSectionTabs(sections: readonly EventSection[]): SectionTab[] {
  if (sections.length === 0) {
    return DEFAULT_SECTION_TITLES.map((title, i) => ({
      key: `section-at-${i}`,
      title,
      html: null,
      isDefault: true,
    }));
  }
  return sections
    .map((section, index) => ({ section, index }))
    .sort((a, b) => a.section.sortOrder - b.section.sortOrder || a.index - b.index)
    .map(({ section }, i) => ({
      key: section.sectionId === null ? `section-at-${i}` : `section-${section.sectionId}`,
      title: section.title,
      html: renderSectionHtml(section),
      isDefault: false,
    }));
}
