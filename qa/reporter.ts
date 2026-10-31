import fs from 'node:fs';
import path from 'node:path';

import type { FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';

import { QA, type StepLog } from './scenario';

/**
 * QA 리포트. 시나리오별 통과·실패, 단계 설명, 단계 캡처, 실패 원인을 한 폴더(index.html + images/ + results.json)로 낸다.
 * 폴더는 qa/run.mjs가 `QA_REPORT_DIR`로 정한다. git에 넣지 않는다(.gitignore `qa/reports/`).
 */

type Status = 'passed' | 'failed' | 'manual' | 'skipped';

type Run = {
  viewport: string;
  status: Status;
  durationMs: number;
  steps: (StepLog & { image?: string })[];
  notes: string[];
  error?: string;
  /** Playwright가 실패 때 찍은 화면(단계 밖에서 실패한 경우) */
  failureImage?: string;
  skipReason?: string;
};

type Scenario = {
  id: string;
  title: string;
  kind: string;
  summary?: string;
  basis: string[];
  mocks: number;
  manualHow?: string;
  file: string;
  runs: Run[];
};

type Meta = {
  id: string;
  title: string;
  kind: string;
  summary?: string;
  basis: string[];
  mocks: number;
};

const ANSI = /\u001b\[[0-9;]*m/g;
const stripAnsi = (s: string) => s.replace(ANSI, '');

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** 테스트 위치는 qa/scenario.ts(DSL)라서 파일 suite에서 시나리오 파일을 찾는다 */
function scenarioFile(test: TestCase) {
  for (let s: Suite | undefined = test.parent; s; s = s.parent) {
    if (s.type === 'file' && s.location) return s.location.file;
  }
  return test.location.file;
}

const slug = (s: string) => s.replace(/[^\w가-힣-]+/g, '_').slice(0, 60);

class QaReporter implements Reporter {
  private readonly dir: string;
  private readonly feature: string;
  private readonly scenarios = new Map<string, Scenario>();
  private startedAt = new Date();

  constructor() {
    this.feature = process.env.QA_FEATURE ?? 'all';
    this.dir = path.resolve(
      process.env.QA_REPORT_DIR ?? path.join('qa', 'reports', this.feature, 'latest'),
    );
  }

  onBegin() {
    this.startedAt = new Date();
    fs.mkdirSync(path.join(this.dir, 'images'), { recursive: true });
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const annotations = [...test.annotations, ...result.annotations];
    const metaRaw = annotations.find((a) => a.type === QA.meta)?.description;
    if (!metaRaw) return;
    const meta = JSON.parse(metaRaw) as Meta;
    const manualHow = annotations.find((a) => a.type === QA.manual)?.description;
    const skipReason = annotations.find((a) => a.type === 'skip')?.description;
    if (skipReason === 'viewport-excluded') return;

    const scenario =
      this.scenarios.get(meta.id) ??
      ({
        ...meta,
        manualHow,
        file: path.relative(process.cwd(), scenarioFile(test)),
        runs: [],
      } satisfies Scenario);
    this.scenarios.set(meta.id, scenario);

    const viewport = test.parent.project()?.name ?? 'default';
    const prefix = `${slug(meta.id)}-${viewport}`;
    const save = (name: string, body: Buffer) => {
      const file = `images/${prefix}-${slug(name)}.png`;
      fs.writeFileSync(path.join(this.dir, file), body);
      return file;
    };

    const stepsAttachment = result.attachments.find((a) => a.name === QA.steps);
    const steps: StepLog[] = stepsAttachment?.body
      ? (JSON.parse(stepsAttachment.body.toString()) as StepLog[])
      : [];
    const shots = new Map(
      result.attachments
        .filter((a) => a.name.startsWith('qa-step-') && a.body)
        .map((a) => [a.name, save(a.name, a.body!)]),
    );
    const pwShot = result.attachments.find((a) => a.name === 'screenshot' && a.path);
    const failureImage =
      pwShot?.path && fs.existsSync(pwShot.path)
        ? save('failure', fs.readFileSync(pwShot.path))
        : undefined;

    const status: Status = manualHow
      ? 'manual'
      : result.status === 'passed'
        ? 'passed'
        : result.status === 'skipped'
          ? 'skipped'
          : 'failed';

    scenario.runs.push({
      viewport,
      status,
      durationMs: result.duration,
      steps: steps.map((s) => ({ ...s, image: s.shot ? shots.get(s.shot) : undefined })),
      notes: result.attachments
        .filter((a) => a.name === QA.note && a.body)
        .map((a) => a.body!.toString()),
      error: result.error
        ? stripAnsi(result.error.message ?? String(result.error.value))
        : undefined,
      failureImage,
      skipReason: status === 'skipped' ? skipReason : undefined,
    });
  }

  onEnd(full: FullResult) {
    const scenarios = [...this.scenarios.values()].sort((a, b) =>
      a.id.localeCompare(b.id, 'en', { numeric: true }),
    );
    const count = (s: Status) =>
      scenarios.flatMap((x) => x.runs).filter((r) => r.status === s).length;
    const summary = {
      feature: this.feature,
      startedAt: this.startedAt.toISOString(),
      overall: full.status,
      passed: count('passed'),
      failed: count('failed'),
      manual: count('manual'),
      skipped: count('skipped'),
    };
    fs.writeFileSync(
      path.join(this.dir, 'results.json'),
      JSON.stringify({ summary, scenarios }, null, 2),
    );
    fs.writeFileSync(path.join(this.dir, 'index.html'), renderHtml(summary, scenarios));
    const rel = path.relative(process.cwd(), path.join(this.dir, 'index.html'));
    console.log(
      `\nQA 리포트: ${rel}\n  통과 ${summary.passed} · 실패 ${summary.failed} · 수동 ${summary.manual} · 건너뜀 ${summary.skipped}`,
    );
  }

  printsToStdio() {
    return false;
  }
}

const STATUS_LABEL: Record<Status, string> = {
  passed: '통과',
  failed: '실패',
  manual: '수동 확인',
  skipped: '건너뜀',
};

function scenarioStatus(s: Scenario): Status {
  if (s.runs.some((r) => r.status === 'failed')) return 'failed';
  if (s.runs.every((r) => r.status === 'manual')) return 'manual';
  if (s.runs.every((r) => r.status === 'skipped')) return 'skipped';
  return 'passed';
}

function renderRun(run: Run) {
  const steps = run.steps
    .map(
      (s) => `
      <li class="step ${s.status}">
        <div class="step-head"><span class="num">${s.index}</span><span>${esc(s.title)}</span>
        <span class="badge ${s.status}">${STATUS_LABEL[s.status]}</span></div>
        ${s.error ? `<pre class="err">${esc(stripAnsi(s.error))}</pre>` : ''}
        ${s.image ? `<a href="${s.image}" target="_blank"><img loading="lazy" src="${s.image}" alt="${esc(s.title)}"></a>` : ''}
      </li>`,
    )
    .join('');
  return `
    <section class="run">
      <h4>${esc(run.viewport)} <span class="badge ${run.status}">${STATUS_LABEL[run.status]}</span>
        <span class="muted">${(run.durationMs / 1000).toFixed(1)}s</span></h4>
      ${run.skipReason ? `<p class="muted">사유: ${esc(run.skipReason)}</p>` : ''}
      ${steps ? `<ol class="steps">${steps}</ol>` : ''}
      ${run.notes.length ? `<div class="notes">${run.notes.map((n) => `<pre>${esc(n)}</pre>`).join('')}</div>` : ''}
      ${run.error ? `<details open class="fail"><summary>실패 원인</summary><pre class="err">${esc(run.error)}</pre></details>` : ''}
      ${run.failureImage ? `<a href="${run.failureImage}" target="_blank"><img class="failure" src="${run.failureImage}" alt="실패 시점 화면"></a>` : ''}
    </section>`;
}

function renderHtml(
  summary: {
    feature: string;
    startedAt: string;
    passed: number;
    failed: number;
    manual: number;
    skipped: number;
  },
  scenarios: Scenario[],
) {
  const toc = scenarios
    .map((s) => {
      const st = scenarioStatus(s);
      return `<li><a href="#${esc(s.id)}"><span class="badge ${st}">${STATUS_LABEL[st]}</span> ${esc(s.id)} ${esc(s.title)}</a></li>`;
    })
    .join('');
  const body = scenarios
    .map((s) => {
      const st = scenarioStatus(s);
      return `
  <article id="${esc(s.id)}" class="scenario ${st}">
    <header>
      <h3><span class="badge ${st}">${STATUS_LABEL[st]}</span> ${esc(s.id)} · ${esc(s.title)}</h3>
      <p class="meta"><span class="kind">${esc(s.kind)}</span> · 근거: ${s.basis.map(esc).join(', ')} · 가짜 응답 ${s.mocks}개 · <code>${esc(s.file)}</code></p>
      ${s.summary ? `<p>${esc(s.summary)}</p>` : ''}
      ${s.manualHow ? `<p class="manual-how"><b>확인 방법</b> ${esc(s.manualHow)}</p>` : ''}
    </header>
    <div class="runs">${s.runs
      .filter((r) => r.status !== 'manual')
      // 모바일 먼저(모바일 우선 설계)
      .sort((a, b) => (a.viewport === 'mobile' ? -1 : b.viewport === 'mobile' ? 1 : 0))
      .map(renderRun)
      .join('')}</div>
  </article>`;
    })
    .join('');

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>QA 리포트 — ${esc(summary.feature)}</title>
<style>
  :root { --bg:#fff; --fg:#1b1d1f; --muted:#6b7280; --line:#e5e7eb; --card:#f9fafb;
    --pass:#15803d; --pass-bg:#dcfce7; --fail:#b91c1c; --fail-bg:#fee2e2; --manual:#92400e; --manual-bg:#fef3c7; --skip:#4b5563; --skip-bg:#f3f4f6; }
  @media (prefers-color-scheme: dark) { :root { --bg:#111315; --fg:#e5e7eb; --muted:#9ca3af; --line:#2a2e33; --card:#181b1f;
    --pass:#86efac; --pass-bg:#14321f; --fail:#fca5a5; --fail-bg:#3b1414; --manual:#fcd34d; --manual-bg:#3a2c0a; --skip:#d1d5db; --skip-bg:#24272b; } }
  * { box-sizing: border-box; }
  body { margin:0; padding:24px 16px 64px; background:var(--bg); color:var(--fg);
    font:14px/1.6 Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif; }
  main { max-width:1200px; margin:0 auto; }
  h1 { font-size:22px; margin:0 0 4px; } h3 { font-size:17px; margin:0 0 4px; } h4 { margin:0 0 8px; font-size:15px; }
  .muted, .meta { color:var(--muted); } .meta { font-size:13px; margin:0 0 6px; }
  .summary { display:flex; gap:8px; flex-wrap:wrap; margin:12px 0 16px; }
  .summary span { padding:4px 10px; border-radius:999px; font-weight:600; }
  .badge { display:inline-block; padding:1px 8px; border-radius:999px; font-size:12px; font-weight:600; vertical-align:middle; }
  .passed { --c:var(--pass); --cb:var(--pass-bg); } .failed { --c:var(--fail); --cb:var(--fail-bg); }
  .manual { --c:var(--manual); --cb:var(--manual-bg); } .skipped { --c:var(--skip); --cb:var(--skip-bg); }
  .badge, .summary span { color:var(--c); background:var(--cb); }
  .toc { list-style:none; padding:0; margin:0 0 24px; display:grid; gap:4px; }
  .toc a { color:inherit; text-decoration:none; } .toc a:hover { text-decoration:underline; }
  .scenario { border:1px solid var(--line); border-left:4px solid var(--c); border-radius:10px; padding:16px; margin:0 0 20px; background:var(--card); }
  .kind { font-weight:600; color:var(--fg); }
  .runs { display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:16px; margin-top:12px; }
  .run { min-width:0; }
  .steps { list-style:none; padding:0; margin:0; display:grid; gap:12px; }
  .step-head { display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; }
  .num { font-weight:700; color:var(--muted); min-width:1.2em; }
  .step img, img.failure { display:block; margin-top:6px; max-width:100%; max-height:560px; object-fit:contain; object-position:left top;
    border:1px solid var(--line); border-radius:6px; background:#fff; }
  img.failure { border-color:var(--fail); }
  pre { white-space:pre-wrap; word-break:break-word; margin:6px 0; padding:8px 10px; border-radius:6px; background:var(--bg); border:1px solid var(--line); font-size:12px; }
  pre.err { color:var(--fail); border-color:var(--fail); }
  .fail summary { cursor:pointer; color:var(--fail); font-weight:600; }
  .manual-how { background:var(--manual-bg); color:var(--manual); padding:8px 10px; border-radius:6px; }
  code { font-size:12px; }
</style>
</head>
<body><main>
  <h1>QA 리포트 — ${esc(summary.feature)}</h1>
  <p class="muted">${esc(new Date(summary.startedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))} · 개수는 시나리오×뷰포트 실행 단위 · 단계 캡처는 클릭하면 원본 크기로 열린다 · trace는 <code>playwright/index.html</code></p>
  <div class="summary">
    <span class="passed">통과 ${summary.passed}</span><span class="failed">실패 ${summary.failed}</span>
    <span class="manual">수동 ${summary.manual}</span><span class="skipped">건너뜀 ${summary.skipped}</span>
  </div>
  <ul class="toc">${toc}</ul>
  ${body}
</main></body></html>`;
}

export default QaReporter;
