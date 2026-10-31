import { describe, expect, it } from 'vitest';

import { v1SectionSamples } from '@/api/__mocks__/fixtures/v1-sections';
import type { EventSection } from '@/api/event/schema';

import { renderSectionHtml } from './render-section';

type Format = EventSection['contentFormat'];
const FORMATS: Format[] = ['HTML', 'MARKDOWN', 'UNKNOWN'];

/** 태그를 지운 글자(엔티티는 그대로). 변환 전후에 글이 빠지지 않았는지 본다 */
const textOf = (html: string) => html.replace(/<[^>]*>/g, '');
const countTags = (html: string, tag: string) =>
  (html.match(new RegExp(`<${tag}[\\s>/]`, 'gi')) ?? []).length;

describe('섹션 본문 렌더 — 형식별 렌더러', () => {
  it.each(FORMATS)('%s: 내용이 없거나 공백뿐이면 null(빈 상태)', (contentFormat) => {
    expect(renderSectionHtml({ content: null, contentFormat })).toBeNull();
    expect(renderSectionHtml({ content: '   \n ', contentFormat })).toBeNull();
  });

  it.each(FORMATS)('%s: 지워지고 남는 것이 없으면 null', (contentFormat) => {
    expect(renderSectionHtml({ content: '<script>alert(1)</script>', contentFormat })).toBeNull();
  });

  it('MARKDOWN: 마크다운 문법을 HTML로 바꾼다(GFM, 줄바꿈은 <br>)', () => {
    const html = renderSectionHtml({
      content: '## 여름 공연\n\n- 일시: 8월 23일\n- 장소: 롤링홀\n\n**많이 와 주세요!**\n둘째 줄',
      contentFormat: 'MARKDOWN',
    });
    expect(html).toContain('<h2>여름 공연</h2>');
    expect(html).toContain('<li>일시: 8월 23일</li>');
    expect(html).toMatch(/<strong>많이 와 주세요!<\/strong><br \/>\s*둘째 줄/);
  });

  it('HTML: 마크다운 문법을 해석하지 않는다', () => {
    expect(renderSectionHtml({ content: '<p>**굵게** 아님</p>', contentFormat: 'HTML' })).toBe(
      '<p>**굵게** 아님</p>',
    );
  });

  it('모르는 형식(UNKNOWN)은 마크다운 경로 — 글자도 HTML도 그대로 보인다', () => {
    expect(renderSectionHtml({ content: '그냥 글', contentFormat: 'UNKNOWN' })).toBe(
      '<p>그냥 글</p>',
    );
    expect(renderSectionHtml({ content: '<p>문단</p>', contentFormat: 'UNKNOWN' })).toBe(
      '<p>문단</p>',
    );
  });
});

describe('섹션 본문 렌더 — v1 실데이터 샘플(운영 MARKDOWN = toast-ui HTML)', () => {
  const samples = Object.entries(v1SectionSamples);

  it.each(samples)(
    '%s: 마크다운 경로를 거쳐도 글·이미지·제목·목록이 빠지지 않는다',
    (_, sample) => {
      const html = renderSectionHtml({ content: sample.content, contentFormat: 'MARKDOWN' });
      expect(html).not.toBeNull();
      expect(textOf(html!)).toBe(textOf(sample.content));
      for (const tag of ['img', 'p', 'h1', 'h2', 'li', 'blockquote', 'strong', 'a']) {
        expect(countTags(html!, tag), tag).toBe(countTags(sample.content, tag));
      }
    },
  );

  it.each(samples)(
    '%s: HTML 경로와 결과가 같다(마크다운으로 다시 해석하지 않는다)',
    (_, sample) => {
      expect(renderSectionHtml({ content: sample.content, contentFormat: 'MARKDOWN' })).toBe(
        renderSectionHtml({ content: sample.content, contentFormat: 'HTML' }),
      );
    },
  );

  it('v1 서식(글자색 span, 체크리스트 class, https 이미지, 링크)을 남기고 에디터 속성은 지운다', () => {
    const html = renderSectionHtml({
      content: v1SectionSamples.taskListAndColor.content,
      contentFormat: 'MARKDOWN',
    })!;
    expect(html).toContain('<span style="color:#fc0000">');
    expect(html).toContain('<li class="task-list-item checked">');
    expect(html).toContain('<img src="https://asset.dudoong.com/production/event/1647/');
    expect(html).toMatch(
      /<a href="https:\/\/www\.instagram\.com\/[^"]*" rel="noopener noreferrer">/,
    );
    expect(html).not.toContain('contenteditable');
    expect(html).not.toContain('data-task');
  });
});

/**
 * XSS 페이로드 표. 각 행은 [이름, 입력, 결과에 있으면 안 되는 것]. 세 형식(HTML·MARKDOWN·UNKNOWN) 모두 확인한다.
 * 출처: OWASP XSS Filter Evasion Cheat Sheet, DOMPurify·sanitize-html 테스트의 대표 행.
 */
const XSS_PAYLOADS: [string, string, RegExp][] = [
  ['script 태그', '<p>안녕</p><script>alert(1)</script>', /<script|alert\(1\)/i],
  ['script 대소문자 섞기', '<ScRiPt>alert(1)</sCrIpT>', /script|alert/i],
  ['img onerror', '<img src="x" onerror="alert(1)">', /onerror|alert/i],
  ['img onerror 따옴표 없음', '<img src=x onerror=alert(1)//>', /onerror|alert/i],
  ['javascript: 링크', '<a href="javascript:alert(1)">눌러</a>', /javascript:|href/i],
  ['javascript: 대소문자', '<a href="JaVaScRiPt:alert(1)">눌러</a>', /javascript:|href/i],
  ['javascript: 엔티티', '<a href="&#106;avascript:alert(1)">눌러</a>', /avascript|href/i],
  ['javascript: 탭 끼우기', '<a href="java\tscript:alert(1)">눌러</a>', /script:|href/i],
  ['javascript: 앞 공백', '<a href=" javascript:alert(1)">눌러</a>', /javascript|href/i],
  ['data: 링크', '<a href="data:text/html,<script>alert(1)</script>">눌러</a>', /data:|href/i],
  ['data: 이미지', '<img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=">', /data:|<img/i],
  ['javascript: 이미지', '<img src="javascript:alert(1)">', /javascript|<img/i],
  ['vbscript: 링크', '<a href="vbscript:msgbox(1)">눌러</a>', /vbscript|href/i],
  ['프로토콜 상대 주소', '<a href="//evil.example">눌러</a>', /evil\.example|href/i],
  ['iframe', '<iframe src="https://evil.example"></iframe>', /<iframe|evil/i],
  ['iframe srcdoc', '<iframe srcdoc="<script>alert(1)</script>"></iframe>', /iframe|srcdoc|alert/i],
  ['svg onload', '<svg onload="alert(1)"><circle r="1"/></svg>', /<svg|onload|alert/i],
  ['svg 안 script', '<svg><script>alert(1)</script></svg>', /<svg|script|alert/i],
  [
    'math mXSS',
    '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
    /onerror|<math|<style/i,
  ],
  ['style 태그', '<style>body{display:none}</style><p>글</p>', /<style|display/i],
  ['p style 속성', '<p style="position:fixed;top:0;left:0">덮기</p>', /style=|position/i],
  [
    'span style 배경 url',
    '<span style="color:red;background:url(javascript:alert(1))">글</span>',
    /url\(|javascript|background/i,
  ],
  [
    'span style expression',
    '<span style="color: expression(alert(1))">글</span>',
    /expression|alert|style=/i,
  ],
  ['onclick 속성', '<div onclick="alert(1)">글</div>', /onclick|alert/i],
  [
    'onmouseover 속성',
    '<a href="https://ok.example" onmouseover="alert(1)">글</a>',
    /onmouseover|alert/i,
  ],
  ['object', '<object data="https://evil.example/x.swf"></object>', /<object|evil/i],
  ['embed', '<embed src="https://evil.example/x.swf">', /<embed|evil/i],
  [
    'form·input',
    '<form action="https://evil.example"><input name="pw"></form>',
    /<form|<input|evil/i,
  ],
  [
    'button formaction',
    '<button formaction="javascript:alert(1)">x</button>',
    /<button|formaction|javascript/i,
  ],
  [
    'meta refresh',
    '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
    /<meta|javascript/i,
  ],
  ['base href', '<base href="https://evil.example/">', /<base|evil/i],
  ['link stylesheet', '<link rel="stylesheet" href="https://evil.example/x.css">', /<link|evil/i],
  [
    'img srcset',
    '<img src="https://ok.example/a.png" srcset="javascript:alert(1)">',
    /srcset|javascript/i,
  ],
  [
    'noscript mXSS',
    '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
    /onerror|alert/i,
  ],
  [
    'template 안 script',
    '<template><script>alert(1)</script></template>',
    /<template|script|alert/i,
  ],
  ['주석 안 script', '<!--<script>alert(1)</script>--><p>글</p>', /script|alert|<!--/i],
  [
    'target 이름 지정(탭 가로채기)',
    '<a href="https://ok.example" target="_parent">글</a>',
    /_parent/,
  ],
  [
    'id·name 덮어쓰기(DOM clobbering)',
    '<img name="cookie" id="body" src="https://ok.example/a.png">',
    /name=|id=/i,
  ],
];

describe('섹션 본문 렌더 — XSS 차단', () => {
  const rows = XSS_PAYLOADS.flatMap(([name, payload, forbidden]) =>
    FORMATS.map((format) => [`${format} · ${name}`, format, payload, forbidden] as const),
  );

  it.each(rows)('%s', (_, contentFormat, payload, forbidden) => {
    const html = renderSectionHtml({ content: payload, contentFormat }) ?? '';
    expect(html).not.toMatch(forbidden);
  });

  it.each(['MARKDOWN', 'UNKNOWN'] as const)(
    '%s: 마크다운 링크·이미지 문법의 javascript: 주소도 지운다',
    (contentFormat) => {
      const html =
        renderSectionHtml({
          content: '[눌러](javascript:alert(1)) ![x](javascript:alert(2))',
          contentFormat,
        }) ?? '';
      expect(html).not.toMatch(/javascript|alert|href|<img/i);
    },
  );

  it('HTML: 마크다운 링크 문법은 글자로 남고 링크가 되지 않는다', () => {
    const html = renderSectionHtml({
      content: '[눌러](javascript:alert(1))',
      contentFormat: 'HTML',
    });
    expect(html).toBe('[눌러](javascript:alert(1))');
  });

  it('모든 링크에 rel="noopener noreferrer"를 붙이고 target은 _blank만 남긴다', () => {
    const html = renderSectionHtml({
      content: '<p><a href="https://ok.example" target="_blank" rel="opener">글</a></p>',
      contentFormat: 'HTML',
    });
    expect(html).toBe(
      '<p><a href="https://ok.example" target="_blank" rel="noopener noreferrer">글</a></p>',
    );
  });

  it('mailto 링크와 http 이미지(v1 본문)는 남긴다', () => {
    const html = renderSectionHtml({
      content:
        '<p><a href="mailto:band@example.com">메일</a><img src="http://old.example/a.png"></p>',
      contentFormat: 'HTML',
    });
    expect(html).toContain('href="mailto:band@example.com"');
    expect(html).toContain('src="http://old.example/a.png"');
  });
});
