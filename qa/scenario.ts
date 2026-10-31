import type { APIRequestContext, Page, TestInfo } from '@playwright/test';
import type { RequestHandler } from 'msw';

import { test } from '../e2e/support/fixtures';
import type { MockBackend } from '../e2e/support/mock-backend';

/**
 * QA 시나리오 DSL. `qa/scenarios/<feature>.qa.ts`에서 쓴다(.claude/skills/qa-scenario/SKILL.md).
 * Playwright 테스트 하나 = 시나리오 하나 × 뷰포트 하나. 단계마다 화면을 찍어 qa/reporter.ts가 리포트에 넣는다.
 */

export type ScenarioKind = '정상' | '빈 상태' | '에러' | '권한' | '반응형' | '크롤러';
export type ViewportName = 'mobile' | 'desktop';

export type ScenarioMeta = {
  /** 무엇을 확인하는지 한두 문장 */
  summary?: string;
  kind: ScenarioKind;
  /** 근거 문서 위치. 예: `plan P5a 완료 기준`, `patterns §24 P5a`, `api-contract GE-11` */
  basis: string[];
  /** 이 시나리오의 백엔드 응답. 서버 조회와 브라우저 요청 둘 다에 적용된다. 기본 핸들러보다 먼저 맞는다 */
  mocks?: RequestHandler[];
  /** 기본은 둘 다 */
  viewports?: ViewportName[];
};

export type StepOptions = {
  /** 단계가 끝난 뒤 화면을 찍는다. 화면이 없는 단계(HTTP 요청만)는 false. 기본 true */
  capture?: boolean;
  /** 페이지 전체를 찍는다. 기본 true */
  fullPage?: boolean;
};

export type ScenarioContext = {
  page: Page;
  request: APIRequestContext;
  mockApi: MockBackend;
  testInfo: TestInfo;
  /** 단계 하나. 설명은 리포트에 그대로 나온다 — "무엇을 하면 무엇이 보인다" 형태로 쓴다 */
  step: (title: string, body: () => Promise<void>, options?: StepOptions) => Promise<void>;
  /** 리포트에 남길 근거(응답 상태, 받은 API 호출 등) */
  note: (text: string) => Promise<void>;
};

/** 리포트가 읽는 어노테이션·첨부 이름 */
export const QA = {
  meta: 'qa-meta',
  manual: 'qa-manual',
  steps: 'qa-steps',
  stepShot: (index: number) => `qa-step-${String(index).padStart(2, '0')}`,
  note: 'qa-note',
} as const;

/** 단계 기록. 시나리오가 끝나면(실패해도) `qa-steps` 첨부로 리포터에 넘긴다 */
export type StepLog = {
  index: number;
  title: string;
  status: 'passed' | 'failed';
  error?: string;
  /** 캡처 첨부 이름 */
  shot?: string;
};

type Body = (ctx: ScenarioContext) => Promise<void>;

function annotate(testInfo: TestInfo, id: string, title: string, meta: ScenarioMeta) {
  testInfo.annotations.push({
    type: QA.meta,
    description: JSON.stringify({ id, title, ...meta, mocks: meta.mocks?.length ?? 0 }),
  });
}

/** 자동 시나리오 하나. 뷰포트마다 한 번씩 돈다. */
export function scenario(id: string, title: string, meta: ScenarioMeta, body: Body) {
  test(`${id} ${title}`, async ({ page, request, mockApi }, testInfo) => {
    annotate(testInfo, id, title, meta);
    const viewports = meta.viewports ?? ['mobile', 'desktop'];
    test.skip(!viewports.includes(testInfo.project.name as ViewportName), 'viewport-excluded');
    if (meta.mocks?.length) mockApi.use(...meta.mocks);

    const log: StepLog[] = [];
    const step: ScenarioContext['step'] = (stepTitle, stepBody, options = {}) =>
      test.step(stepTitle, async () => {
        const entry: StepLog = { index: log.length + 1, title: stepTitle, status: 'passed' };
        log.push(entry);
        try {
          await stepBody();
        } catch (e) {
          entry.status = 'failed';
          entry.error = e instanceof Error ? e.message : String(e);
          if (page.url() !== 'about:blank') {
            entry.shot = QA.stepShot(entry.index);
            await testInfo.attach(entry.shot, {
              body: await page.screenshot({ fullPage: true }),
              contentType: 'image/png',
            });
          }
          throw e;
        }
        if (options.capture !== false && page.url() !== 'about:blank') {
          entry.shot = QA.stepShot(entry.index);
          await testInfo.attach(entry.shot, {
            body: await page.screenshot({ fullPage: options.fullPage ?? true }),
            contentType: 'image/png',
          });
        }
      });
    const note: ScenarioContext['note'] = (text) =>
      testInfo.attach(QA.note, { body: text, contentType: 'text/plain' });

    try {
      await body({ page, request, mockApi, testInfo, step, note });
    } finally {
      await testInfo.attach(QA.steps, {
        body: JSON.stringify(log),
        contentType: 'application/json',
      });
    }
  });
}

/**
 * 자동으로 확인할 수 없는 시나리오(실기기, 카카오 로그인 왕복, 스테이징). 실행하지 않고 리포트에 "수동"으로 남긴다.
 * `how`에는 확인 방법(agent-browser로 스테이징을 열어 …)을 쓴다.
 */
scenario.manual = (id: string, title: string, meta: ScenarioMeta & { how: string }) => {
  test(`${id} ${title}`, async ({}, testInfo) => {
    annotate(testInfo, id, title, meta);
    testInfo.annotations.push({ type: QA.manual, description: meta.how });
    // 한 뷰포트에서만 남긴다(리포트에서 중복 없이)
    test.skip(true, testInfo.project.name === 'desktop' ? 'manual' : 'viewport-excluded');
  });
};

export { expect } from '../e2e/support/fixtures';
export { http, HttpResponse } from 'msw';

/** 백엔드 래퍼 응답 헬퍼(api-contract §1) */
export const envelope = {
  ok: <T>(data: T) => ({ success: true, status: 200, data, timeStamp: '' }),
  error: (status: number, code: string, reason = '') => ({
    success: false,
    status,
    code,
    reason,
    timeStamp: '',
  }),
};
