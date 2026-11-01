import { sanitizeSectionHtml } from '@/features/shared/section-viewer/model/sanitize-section-html';

/**
 * 공지 본문 → 화면에 넣을 HTML. 서버가 저장할 때 sanitize했지만 섹션 뷰어와 같은 허용 목록으로 한 번 더 거른다
 * (PR #832 권고, tech-decisions §17). 공지 본문은 언제나 HTML이다(`contentFormat` 없음). 비면 null
 *
 * `notice-rules.ts`와 파일을 나눈 이유(P14 성능): 셸 상단 배너(`useNoticeBanner`)가 `notice-rules`를 쓰므로 거기에
 * sanitize를 두면 `sanitize-html`(+ postcss·htmlparser2) gzip 약 50KB가 모든 라우트 첫 로드에 실린다. 상세 화면만 이 파일을 쓴다.
 */
export function renderNoticeHtml(content: string): string | null {
  if (content.trim() === '') return null;
  const safe = sanitizeSectionHtml(content).trim();
  return safe === '' ? null : safe;
}
