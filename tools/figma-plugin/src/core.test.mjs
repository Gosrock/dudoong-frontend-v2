import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

import { build } from '../build.mjs';
import {
  buildComment,
  buildIssue,
  LABELS,
  marker,
  matchIssues,
  nodeUrl,
  parseFileKey,
  parseMarkers,
  resolveTarget,
  sectionPath,
  suggestType,
  summaryOf,
  TEST_LABEL,
  tokenUrl,
} from './core.mjs';

const GUI = '1Cn4WOu6TDaSajbFIuH6fO';

function tree() {
  const page = { type: 'PAGE', name: '↳기본정보', parent: { type: 'DOCUMENT' } };
  const section = { type: 'SECTION', name: '와프 v1.0 적용', parent: page };
  const frame = { type: 'FRAME', name: '기본정보_입력됨', id: '748:33451', parent: section };
  const inner = { type: 'FRAME', name: 'Frame 1', parent: frame };
  const text = { type: 'TEXT', name: '제목', parent: inner };
  const set = { type: 'COMPONENT_SET', name: 'Tabs', parent: page };
  const variant = { type: 'COMPONENT', name: 'selected=true', parent: set };
  const variantChild = { type: 'TEXT', name: 'label', parent: variant };
  const docFrame = { type: 'FRAME', name: '아이콘 모음', parent: page };
  const icon = { type: 'COMPONENT', name: 'ic/gift', parent: docFrame };
  const iconChild = { type: 'VECTOR', name: 'v', parent: icon };
  return {
    page,
    section,
    frame,
    inner,
    text,
    set,
    variant,
    variantChild,
    docFrame,
    icon,
    iconChild,
  };
}

const target = {
  id: '748:33451',
  name: '기본정보_입력됨',
  type: 'FRAME',
  devStatus: 'READY_FOR_DEV',
  sections: ['와프 v1.0 적용'],
};

const ctx = {
  fileKey: GUI,
  fileName: 'GUI 화면',
  pageName: '↳기본정보',
  targets: [target],
  typeId: 'update',
  summary: ' 문의처 placeholder 변경 ',
  description: '이메일 칸 placeholder를 바꿨어요',
  author: 'Nemin',
};

describe('resolveTarget', () => {
  it('안쪽 레이어를 페이지·섹션 바로 아래 프레임으로 올린다', () => {
    const t = tree();
    expect(resolveTarget(t.text)).toBe(t.frame);
    expect(resolveTarget(t.frame)).toBe(t.frame);
    expect(resolveTarget(t.section)).toBe(t.section);
  });

  it('variant는 컴포넌트 세트로, 프레임 안 컴포넌트는 그 컴포넌트로 올린다', () => {
    const t = tree();
    expect(resolveTarget(t.variantChild)).toBe(t.set);
    expect(resolveTarget(t.variant)).toBe(t.set);
    expect(resolveTarget(t.iconChild)).toBe(t.icon);
  });

  it('섹션 경로를 바깥부터 모은다', () => {
    const t = tree();
    expect(sectionPath(t.frame)).toEqual(['와프 v1.0 적용']);
    expect(sectionPath(t.set)).toEqual([]);
  });
});

describe('buildIssue', () => {
  it('제목·라벨·본문에 파일·페이지·프레임 링크와 마커를 넣는다', () => {
    const issue = buildIssue(ctx);
    expect(issue.title).toBe('[디자인·GUI] 기본정보_입력됨 — 문의처 placeholder 변경');
    expect(issue.labels).toEqual(['Design Sync', 'Design: 수정', 'Figma: GUI']);
    expect(issue.body).toContain(
      '**파일** GUI 화면 (`1Cn4WOu6TDaSajbFIuH6fO`) · **페이지** ↳기본정보',
    );
    expect(issue.body).toContain(
      `| [기본정보_입력됨](https://www.figma.com/design/${GUI}/?node-id=748-33451) | \`748:33451\` | FRAME | 와프 v1.0 적용 | Ready for dev |`,
    );
    expect(issue.body).toContain('작성자 **Nemin**');
    expect(parseMarkers(issue.body)).toEqual([`${GUI}/748:33451`]);
  });

  it('여러 프레임은 "외 n"으로 묶고, 표 칸의 |·줄바꿈을 막는다', () => {
    const issue = buildIssue({
      ...ctx,
      summary: '',
      targets: [target, { ...target, id: '1:2', name: 'a|b\nc', sections: [] }],
    });
    expect(issue.title).toBe('[디자인·GUI] 기본정보_입력됨 외 1');
    expect(issue.body).toContain('[a\\|b c]');
  });

  it('트래킹 파일이 아니면 테스트 라벨과 [디자인·테스트] 제목', () => {
    const issue = buildIssue({ ...ctx, fileKey: 'TestFileKey123' });
    expect(issue.title.startsWith('[디자인·테스트]')).toBe(true);
    expect(issue.labels).toContain(TEST_LABEL);
    expect(issue.labels).not.toContain('Figma: GUI');
  });

  it('프레임이 없거나 유형이 틀리면 던진다', () => {
    expect(() => buildIssue({ ...ctx, targets: [] })).toThrow();
    expect(() => buildIssue({ ...ctx, typeId: 'nope' })).toThrow();
  });
});

describe('buildComment', () => {
  it('이슈 본문에 없는 프레임만 새 마커로 돌려준다', () => {
    const other = { ...target, id: '9:9', name: '다른 프레임' };
    const c = buildComment(
      { ...ctx, targets: [target, other] },
      `본문\n${marker(GUI, '748:33451')}`,
    );
    expect(c.newMarkers).toEqual([marker(GUI, '9:9')]);
    expect(c.label).toBe('Design: 수정');
    expect(c.body).toContain('### 디자인 변경 — 수정 · 문의처 placeholder 변경');
    expect(parseMarkers(c.body)).toEqual([]);
  });
});

describe('matchIssues', () => {
  const issue = (number, state, created, body, extra) => ({
    number,
    state,
    title: `t${number}`,
    html_url: `https://github.com/x/${number}`,
    created_at: created,
    user: { login: 'nemin' },
    body,
    ...extra,
  });

  it('고른 노드가 든 이슈만, 열린 것 먼저·최근 것 먼저', () => {
    const list = matchIssues(
      [
        issue(1, 'closed', '2026-10-01', marker(GUI, '1:1')),
        issue(2, 'open', '2026-10-02', marker(GUI, '1:1')),
        issue(3, 'open', '2026-10-03', `${marker(GUI, '1:1')}\n${marker(GUI, '2:2')}`),
        issue(4, 'open', '2026-10-04', marker('Other', '1:1')),
        issue(5, 'open', '2026-10-05', marker(GUI, '1:1'), { pull_request: {} }),
        issue(6, 'open', '2026-10-06', null),
      ],
      GUI,
      ['1:1', '2:2'],
    );
    expect(list.map((i) => i.number)).toEqual([3, 2, 1]);
    expect(list[0].nodeIds).toEqual(['1:1', '2:2']);
  });
});

describe('그 밖', () => {
  it('기본 유형: 모두 Ready → ready, 디자인 시스템 파일 → ds, 그 밖 → update', () => {
    expect(suggestType([target], GUI)).toBe('ready');
    expect(suggestType([target, { ...target, devStatus: null }], GUI)).toBe('update');
    expect(suggestType([{ ...target, devStatus: null }], '0QD9tGSt8ZciDqe7ol2gYH')).toBe('ds');
    expect(suggestType([], GUI)).toBe('update');
  });

  it('요약은 내용의 첫 줄, 40자 넘으면 자른다', () => {
    expect(summaryOf('  판매 수량 기본값 변경\n자세한 설명')).toBe('판매 수량 기본값 변경');
    expect(summaryOf('가'.repeat(50))).toBe(`${'가'.repeat(39)}…`);
    expect(summaryOf('')).toBe('');
  });

  it('Figma 링크에서 fileKey를 꺼낸다', () => {
    expect(parseFileKey(`https://www.figma.com/design/${GUI}/GUI?node-id=1-2`)).toBe(GUI);
    expect(parseFileKey('https://www.figma.com/file/AbC123/x')).toBe('AbC123');
    expect(parseFileKey('https://example.com')).toBeNull();
  });

  it('노드 링크는 node-id의 :를 -로', () => {
    expect(nodeUrl(GUI, '759:22611')).toBe(
      `https://www.figma.com/design/${GUI}/?node-id=759-22611`,
    );
  });

  it('토큰 발급 링크는 Gosrock·Issues 쓰기·366일', () => {
    const url = new URL(tokenUrl(new Date(2026, 9, 31, 9, 5)));
    expect(url.searchParams.get('name')).toBe('DuDoong Figma 트래커 2026-10-31 09:05');
    expect(url.origin + url.pathname).toBe(
      'https://github.com/settings/personal-access-tokens/new',
    );
    expect(url.searchParams.get('target_name')).toBe('Gosrock');
    expect(url.searchParams.get('issues')).toBe('write');
    expect(url.searchParams.get('expires_in')).toBe('366');
    expect(url.searchParams.get('name').length).toBeLessThanOrEqual(40);
  });

  it('라벨 이름이 겹치지 않고 GitHub 제한(이름 50·설명 100자) 안', () => {
    const names = LABELS.map((l) => l.name);
    expect(new Set(names).size).toBe(names.length);
    for (const l of LABELS) {
      expect(l.name.length).toBeLessThanOrEqual(50);
      expect(l.description.length).toBeLessThanOrEqual(100);
    }
  });
});

describe('빌드', () => {
  it('plugin/이 src/와 맞다(node tools/figma-plugin/build.mjs)', () => {
    const out = build();
    for (const [p, content] of Object.entries(out)) {
      expect(readFileSync(join(import.meta.dirname, '..', p), 'utf8')).toBe(content);
    }
  });

  it('code.js는 스크립트로 파싱되고 ui.html 스크립트에 <!--·</script가 없다', () => {
    const out = build();
    expect(() => new vm.Script(out['plugin/code.js'])).not.toThrow();
    const script = /<script>([\s\S]*)<\/script>/.exec(out['plugin/ui.html'])[1];
    expect(script).not.toMatch(/<!--|<\/script/i);
    expect(() => new vm.Script(script)).not.toThrow();
  });
});
