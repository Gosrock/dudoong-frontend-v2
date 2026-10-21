import sanitizeHtml from 'sanitize-html';

/**
 * 섹션 본문 HTML의 렌더 직전 sanitize(2차 방어선 — 백엔드가 저장할 때 jsoup으로 이미 정리한다, tech-decisions §17).
 *
 * 허용 목록은 백엔드 기준을 따른다(`HtmlSanitizer.kt` · `V2HtmlSanitizer.kt`, dev 24aa595):
 * jsoup `Safelist.relaxed()` + v1 본문 서식(취소선·구분선, `span`의 글자색, 코드 블록 언어, 체크리스트 class, 링크 target).
 * 링크에는 `rel="noopener noreferrer"`를 붙인다(백엔드 v1 기준과 같다).
 *
 * 라이브러리는 `sanitize-html`(htmlparser2, DOM 없음)이다. `isomorphic-dompurify`는 서버에서 jsdom을 띄워
 * 공연 상세 연속 요청에서 RSS가 계속 늘어 바꿨다(P5b-L 측정, implementation-log).
 */

const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

const ALLOWED_TAGS = [
  // jsoup Safelist.relaxed()
  'a',
  'b',
  'blockquote',
  'br',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'dd',
  'div',
  'dl',
  'dt',
  'em',
  ...HEADINGS,
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'q',
  'small',
  'span',
  'strike',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
  // v1 본문 서식(HtmlSanitizer.V1_EVENT_CONTENT)
  'del',
  's',
  'hr',
];

/** 글자색만(백엔드 `COLOR_STYLE`과 같은 값 범위) */
const COLOR_VALUE = [/^#[0-9a-f]{3,8}$/i, /^rgba?\([0-9.,\s%]+\)$/i];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    blockquote: ['cite'],
    q: ['cite'],
    col: ['span', 'width'],
    colgroup: ['span', 'width'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    ol: ['start', 'type'],
    ul: ['type'],
    table: ['summary', 'width'],
    td: ['abbr', 'colspan', 'rowspan', 'width'],
    th: ['abbr', 'colspan', 'rowspan', 'scope', 'width'],
    span: ['style'],
    li: ['class'],
    pre: ['data-language'],
    code: ['class', 'data-language'],
  },
  allowedClasses: {
    li: ['task-list-item', 'checked'],
    code: [/^language-[A-Za-z0-9_+-]{1,30}$/],
  },
  allowedStyles: { span: { color: COLOR_VALUE } },
  // jsoup relaxed: a[href] ftp·http·https·mailto, img[src] http·https. ftp는 뺐다
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
  allowProtocolRelative: false,
  // 허용하지 않은 태그는 지우고 안의 글자는 남긴다. script·style·textarea 등은 내용까지 지운다(라이브러리 기본 nonTextTags)
  disallowedTagsMode: 'discard',
  // 주소가 지워진 이미지(`data:`·`javascript:` 등)는 빈 <img>로 남기지 않는다
  exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs.src,
  transformTags: {
    a: (tagName, attribs) => {
      const next: sanitizeHtml.Attributes = { ...attribs, rel: 'noopener noreferrer' };
      if (next.target !== undefined && next.target !== '_blank') delete next.target;
      return { tagName, attribs: next };
    },
  },
};

export function sanitizeSectionHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
