import { Marked } from 'marked';

import type { EventSection } from '@/api/event/schema';

import { sanitizeSectionHtml } from './sanitize-section-html';

/**
 * 섹션 본문 → 화면에 넣을 HTML(patterns §14). `contentFormat`으로 렌더러를 고르고 결과는 언제나 같은 sanitize를 거친다.
 *
 * - `HTML`(v2 에디터): 그대로 sanitize.
 * - `MARKDOWN`(v1 이관분): `marked` → HTML → sanitize. 운영의 v1 본문은 toast-ui가 저장한 HTML 한 줄이라
 *   `marked`가 HTML 블록으로 그대로 넘긴다(블록 태그로 시작할 때). 마크다운 문법은 GFM + 줄바꿈 = `<br>`.
 * - 모르는 형식(`UNKNOWN`): 마크다운 경로. HTML도 글자도 그대로 보이는 쪽이 안전하다.
 *
 * 보여 줄 내용이 없으면(`null`·공백·sanitize 뒤 빈 문자열) `null` — 화면은 빈 상태를 그린다.
 */

// 전역 `marked` 설정을 바꾸지 않게 인스턴스를 따로 둔다
const markdown = new Marked({ gfm: true, breaks: true, async: false });

export type SectionContentInput = Pick<EventSection, 'content' | 'contentFormat'>;

export function renderSectionHtml({ content, contentFormat }: SectionContentInput): string | null {
  if (content === null || content.trim() === '') return null;
  const html =
    contentFormat === 'HTML' ? content : (markdown.parse(content, { async: false }) as string);
  const safe = sanitizeSectionHtml(html).trim();
  return safe === '' ? null : safe;
}
