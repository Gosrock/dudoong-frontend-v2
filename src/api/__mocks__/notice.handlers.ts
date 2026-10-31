import { http, type HttpHandler } from 'msw';

import { NOTICE_AUDIENCES, type NoticeAudience } from '@/api/notice/schema';

import { activeBanners, type MockNotice, visibleNotice, visibleNotices } from './fixtures/notice';
import { errors, fail, ok, paginate, publicIdMismatch, readId, readPageParams } from './respond';

/**
 * 서비스 공지(#832) — GA-1 목록(Page, 기본 20 · 상한 50), GA-2 상세, GA-3 배너. 모두 공개 GET이라 쿠키를 보지 않는다.
 * 백엔드 `V2NoticeController`·`V2ReadNoticesUseCase`·`NoticeRepository`(dev d89d4f9) 그대로:
 * `audience` 생략 = `USER`, 모르는 값 = 400 `BAD_REQUEST`. 숫자가 아닌 id는 공개 경로가 아니라 인증부터 본다.
 */

/** `?audience=` — 없으면 USER, 모르는 값이면 null(400) */
function readAudience(url: URL): NoticeAudience | null {
  const raw = url.searchParams.get('audience');
  if (raw === null) return 'USER';
  return (NOTICE_AUDIENCES as readonly string[]).includes(raw) ? (raw as NoticeAudience) : null;
}

const listItem = (n: MockNotice) => ({
  noticeId: n.noticeId,
  title: n.title,
  target: n.target,
  pinned: n.pinned,
  createdAt: n.createdAt,
});

const detailOf = (n: MockNotice) => ({
  noticeId: n.noticeId,
  title: n.title,
  content: n.content,
  target: n.target,
  pinned: n.pinned,
  createdAt: n.createdAt,
  updatedAt: n.updatedAt,
});

export const noticeNotFound = (request: Request) =>
  fail(request, 404, 'Notice_404_1', '공지사항을 찾을 수 없습니다.');

const list = http.get('*/api/v2/notices', ({ request }) => {
  const url = new URL(request.url);
  const audience = readAudience(url);
  const params = readPageParams(url, 20, 50);
  if (!audience || !params) return errors.badRequest(request);
  return ok(paginate(visibleNotices(audience).map(listItem), params.page, params.size));
});

// 고정 경로 banners는 상세(:noticeId)보다 앞
const banners = http.get('*/api/v2/notices/banners', ({ request }) => {
  const audience = readAudience(new URL(request.url));
  if (!audience) return errors.badRequest(request);
  return ok(
    activeBanners(audience).map((n) => ({
      noticeId: n.noticeId,
      title: n.title,
      bannerEndAt: n.bannerEndAt,
    })),
  );
});

const detail = http.get('*/api/v2/notices/:noticeId', ({ request, params, cookies }) => {
  const id = readId(params.noticeId);
  if (id === null) return publicIdMismatch(request, cookies);
  const notice = visibleNotice(id);
  return notice ? ok(detailOf(notice)) : noticeNotFound(request);
});

/**
 * 이름 붙인 세트(plan §0).
 * - `default` — 기본 목록에 들어 있는 GA-1 · GA-3 · GA-2
 * - `empty` — 공지·배너가 하나도 없음
 * - `listServerError` · `bannersServerError` · `detailServerError` — 각 5xx
 */
export const noticeHandlers = {
  default: [list, banners, detail],
  empty: [
    http.get('*/api/v2/notices', ({ request }) => {
      const params = readPageParams(new URL(request.url), 20, 50) ?? { page: 0, size: 20 };
      return ok(paginate([], params.page, params.size));
    }),
    http.get('*/api/v2/notices/banners', () => ok([])),
  ] satisfies HttpHandler[],
  listServerError: [
    http.get('*/api/v2/notices', ({ request }) => errors.serverError(request)),
  ] satisfies HttpHandler[],
  bannersServerError: [
    http.get('*/api/v2/notices/banners', ({ request }) => errors.serverError(request)),
  ] satisfies HttpHandler[],
  detailServerError: [
    http.get('*/api/v2/notices/:noticeId', ({ request, params }) =>
      params.noticeId === 'banners' ? undefined : errors.serverError(request),
    ),
  ] satisfies HttpHandler[],
};
