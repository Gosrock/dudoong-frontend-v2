import {
  EVENT_SECTION_CONTENT_MAX,
  EVENT_SECTION_TITLE_MAX,
  EVENT_SECTIONS_MAX,
  EVENT_SECTIONS_MIN,
  type EventSection,
  type UpdateEventSectionsRequest,
} from '@/api/event/schema';
import { renderSectionHtml } from '@/features/shared/section-viewer/model/render-section';
import { DEFAULT_SECTION_TITLES } from '@/features/shared/section-viewer/model/section-tabs';

/**
 * 상세 정보(`/hosting/events/[eventId]/detail`, GE-5 · PE-6, plan P11) 섹션 폼. PE-6은 **전체 교체**다 —
 * 탭 하나를 고쳐도 모든 섹션을 보내고, 목록에서 뺀 섹션은 서버에서 지워진다(api-contract §1, patterns §23).
 * 형식: 1~10개, 제목 1~20자, 본문 20,000자(`Event_400_21` — `V2EventDomainService.replaceSections`, 432cce4).
 *
 * 새 공연은 서버에 섹션이 없다 — 관객 상세(P5b)와 같은 기본 4탭(`section-tabs.ts`의 `DEFAULT_SECTION_TITLES`)으로 시작한다.
 * v1에서 온 MARKDOWN 섹션은 관객 상세와 같은 변환(`renderSectionHtml` — marked + sanitize)으로 HTML로 바꿔 에디터에 넣는다.
 * 저장하면 서버가 HTML로 저장한다.
 */

export type SectionInput = {
  /** 목록 안에서만 쓰는 키(서버 섹션 `section-{id}`, 새 섹션 `new-{n}`). 서버로 보내지 않는다 */
  key: string;
  title: string;
  /** 에디터 HTML. 비면 `''` */
  content: string;
};

let seq = 0;
const newKey = () => `new-${++seq}`;

/** GE-5 → 폼 값(`sortOrder` 순). 섹션이 없으면 기본 4탭(본문 없음) */
export function sectionInputsOf(sections: readonly EventSection[]): SectionInput[] {
  if (sections.length === 0) {
    return DEFAULT_SECTION_TITLES.map((title) => ({ key: newKey(), title, content: '' }));
  }
  return [...sections]
    .map((s, index) => ({ s, index }))
    .sort((a, b) => a.s.sortOrder - b.s.sortOrder || a.index - b.index)
    .map(({ s }) => ({
      key: s.sectionId === null ? newKey() : `section-${s.sectionId}`,
      title: s.title,
      content: s.contentFormat === 'HTML' ? (s.content ?? '') : (renderSectionHtml(s) ?? ''),
    }));
}

/** 태그를 지우고도 글자가 없고 이미지도 없으면 빈 본문(에디터의 빈 문단 `<p></p>`) */
export const isEmptyContent = (html: string) =>
  !/<img\b/i.test(html) &&
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim() === '';

export const canAddSection = (sections: readonly SectionInput[]) =>
  sections.length < EVENT_SECTIONS_MAX;
export const canRemoveSection = (sections: readonly SectionInput[]) =>
  sections.length > EVENT_SECTIONS_MIN;

/** 섹션을 더한다(10개면 그대로). 새 섹션은 제목·본문이 비어 있다 — 제목을 채워야 저장된다 */
export const withAddedSection = (sections: readonly SectionInput[]): SectionInput[] =>
  canAddSection(sections)
    ? [...sections, { key: newKey(), title: '', content: '' }]
    : [...sections];

/** 섹션을 뺀다(1개면 그대로). 저장하면 서버에서도 지워진다 */
export const withoutSection = (sections: readonly SectionInput[], key: string): SectionInput[] =>
  canRemoveSection(sections) ? sections.filter((s) => s.key !== key) : [...sections];

export const withSectionTitle = (sections: readonly SectionInput[], key: string, title: string) =>
  sections.map((s) => (s.key === key ? { ...s, title } : s));

export const withSectionContent = (
  sections: readonly SectionInput[],
  key: string,
  content: string,
) => sections.map((s) => (s.key === key ? { ...s, content } : s));

/** 섹션 순서를 옮긴다(`to`는 옮긴 뒤 자리). 범위 밖이면 그대로 */
export function withMovedSection(sections: readonly SectionInput[], key: string, to: number) {
  const from = sections.findIndex((s) => s.key === key);
  if (from < 0 || to < 0 || to >= sections.length || from === to) return [...sections];
  const next = [...sections];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

export const SECTION_ERROR = {
  title: '탭 이름을 입력해 주세요',
  titleTooLong: `탭 이름은 ${EVENT_SECTION_TITLE_MAX}자까지 입력할 수 있어요`,
  contentTooLong: `본문이 너무 길어요(${EVENT_SECTION_CONTENT_MAX.toLocaleString('ko-KR')}자까지)`,
  /** PE-6 `Event_400_21` — 폼이 먼저 막으므로 정상 흐름에서는 나지 않는다(서버 sanitize 뒤 길이가 다를 때 등) */
  Event_400_21: '섹션 형식을 확인해 주세요(1~10개, 탭 이름 20자, 본문 20,000자)',
} as const;

export type SectionErrors = Record<string, { title: string | null; content: string | null }>;

export function validateSections(sections: readonly SectionInput[]): SectionErrors {
  return Object.fromEntries(
    sections.map((s) => {
      const title = s.title.trim();
      return [
        s.key,
        {
          title: !title
            ? SECTION_ERROR.title
            : title.length > EVENT_SECTION_TITLE_MAX
              ? SECTION_ERROR.titleTooLong
              : null,
          content:
            s.content.length > EVENT_SECTION_CONTENT_MAX ? SECTION_ERROR.contentTooLong : null,
        },
      ];
    }),
  );
}

export const hasSectionErrors = (errors: SectionErrors) =>
  Object.values(errors).some((e) => e.title !== null || e.content !== null);

/** 보내는 본문(PE-6) — 전체, 지금 순서대로 `sortOrder` 0부터. 빈 본문은 `null`, 제목은 앞뒤 공백을 지운다 */
export function toUpdateSectionsBody(
  sections: readonly SectionInput[],
): UpdateEventSectionsRequest {
  return {
    sections: sections.map((s, sortOrder) => ({
      title: s.title.trim(),
      content: isEmptyContent(s.content) ? null : s.content,
      sortOrder,
    })),
  };
}

/** 저장하지 않은 변경 — 보낼 본문이 처음 값과 다른지(키는 보지 않는다) */
export const isSectionsDirty = (base: readonly SectionInput[], values: readonly SectionInput[]) =>
  JSON.stringify(toUpdateSectionsBody(base)) !== JSON.stringify(toUpdateSectionsBody(values));
