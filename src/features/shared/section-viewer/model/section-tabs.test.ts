import { describe, expect, it } from 'vitest';

import type { EventSection } from '@/api/event/schema';

import { DEFAULT_SECTION_TITLES, toSectionTabs } from './section-tabs';

const section = (over: Partial<EventSection>): EventSection => ({
  sectionId: 1,
  title: '공연 소개',
  content: '<p>본문</p>',
  contentFormat: 'HTML',
  sortOrder: 0,
  ...over,
});

describe('섹션 탭 규칙', () => {
  it('서버 섹션이 없으면 기본 4탭(공연소개·예매안내·세트리스트·유의사항)을 빈 상태로 만든다', () => {
    const tabs = toSectionTabs([]);
    expect(tabs.map((t) => t.title)).toEqual([...DEFAULT_SECTION_TITLES]);
    expect(tabs.map((t) => t.title)).toEqual(['공연소개', '예매안내', '세트리스트', '유의사항']);
    expect(tabs.every((t) => t.html === null && t.isDefault)).toBe(true);
    expect(new Set(tabs.map((t) => t.key)).size).toBe(4);
  });

  it('서버 섹션이 있으면 그 섹션만, sortOrder 순서대로 쓴다(기본 탭을 섞지 않는다)', () => {
    const tabs = toSectionTabs([
      section({ sectionId: 3, title: '세트리스트', sortOrder: 2 }),
      section({ sectionId: 1, title: '공연 소개', sortOrder: 0 }),
      section({ sectionId: 2, title: '오시는 길', sortOrder: 1 }),
    ]);
    expect(tabs.map((t) => [t.key, t.title, t.isDefault])).toEqual([
      ['section-1', '공연 소개', false],
      ['section-2', '오시는 길', false],
      ['section-3', '세트리스트', false],
    ]);
  });

  it('sortOrder가 같으면 받은 순서를 지킨다', () => {
    const tabs = toSectionTabs([
      section({ sectionId: 8, title: 'B', sortOrder: 0 }),
      section({ sectionId: 9, title: 'A', sortOrder: 0 }),
    ]);
    expect(tabs.map((t) => t.title)).toEqual(['B', 'A']);
  });

  it('섹션 10개(서버 상한)를 모두 탭으로 만든다', () => {
    const tabs = toSectionTabs(
      Array.from({ length: 10 }, (_, i) =>
        section({ sectionId: i + 1, title: `탭${i}`, sortOrder: i }),
      ),
    );
    expect(tabs).toHaveLength(10);
  });

  it('v1 대체 섹션(sectionId null)은 순서로 키를 만든다', () => {
    const [tab] = toSectionTabs([
      section({ sectionId: null, contentFormat: 'MARKDOWN', content: '**v1**' }),
    ]);
    expect(tab).toMatchObject({ key: 'section-at-0', html: '<p><strong>v1</strong></p>' });
  });

  it.each([
    ['내용 null', null],
    ['공백', '  '],
  ])('서버 섹션의 내용이 없으면(%s) 탭은 두고 html은 null(빈 상태)', (_, content) => {
    const [tab] = toSectionTabs([section({ content })]);
    expect(tab).toMatchObject({ title: '공연 소개', html: null, isDefault: false });
  });

  it('탭 본문은 sanitize를 거친다', () => {
    const [tab] = toSectionTabs([
      section({ content: '<p onclick="x()">글</p><script>x()</script>' }),
    ]);
    expect(tab?.html).toBe('<p>글</p>');
  });
});
