'use client';

import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './SectionViewer.css';

/** 내용이 없는 탭(서버 섹션 없음·빈 본문)의 문구 */
export const EMPTY_SECTION_TEXT = '아직 등록된 내용이 없어요';

/**
 * 섹션 뷰어(plan P5b — 공연 상세, P11 미리보기가 재사용). `html`은 `toSectionTabs`가 sanitize까지 끝낸 값이다
 * (`contentFormat`으로 HTML/마크다운 렌더러를 골라 같은 sanitize — `model/render-section.ts`). 여기서는 그리기만 한다.
 */
export function SectionViewer({ html }: { html: string | null }) {
  if (!html) {
    return (
      <Txt as="p" typography="bodyLg" color={colors.textTertiary}>
        {EMPTY_SECTION_TEXT}
      </Txt>
    );
  }
  // sanitize를 거친 HTML(model/sanitize-section-html)
  return <div className={s.root} dangerouslySetInnerHTML={{ __html: html }} />;
}
