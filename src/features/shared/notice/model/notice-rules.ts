import type {
  NoticeAudience,
  NoticeBanner,
  NoticeDetail,
  NoticeListItem,
} from '@/api/notice/schema';
import { isKstDateTime, parseKstDateTime } from '@/api/shared/date';
import { sanitizeSectionHtml } from '@/features/shared/section-viewer/model/sanitize-section-html';

/**
 * 서비스 공지 도메인 규칙(plan P9c). 관객(`USER`)과 호스팅 센터(`HOST`)가 같은 규칙을 쓴다 — 다른 것은 `audience`와 경로뿐.
 */

/** 경로의 공지 id. 숫자가 아니면 null — 라우트는 백엔드를 부르지 않고 404(서버는 숫자 id만 공개 경로로 본다) */
export function parseNoticeIdParam(raw: string): string | null {
  if (!/^\d{1,16}$/.test(raw)) return null;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  return String(id);
}

/** 공지 목록 경로. 관객 `/notices`, 호스팅 센터 `/hosting/notices` */
export const noticeListHref = (audience: NoticeAudience) =>
  audience === 'HOST' ? '/hosting/notices' : '/notices';

/** 공지 상세 경로. 같은 공지라도 보는 화면(셸)에 따라 경로가 다르다 */
export const noticeHref = (audience: NoticeAudience, noticeId: number | string) =>
  `${noticeListHref(audience)}/${encodeURIComponent(noticeId)}`;

export type NoticeRow = {
  id: number;
  /** 텍스트로만 그린다 */
  title: string;
  pinned: boolean;
  /** 호스팅 센터에만 보이는 공지(`target=HOST`). 관객 목록에는 오지 않는다 */
  hostOnly: boolean;
  /** `yyyy.MM.dd HH:mm` 그대로(표시 형식은 V) */
  createdAt: string | null;
  href: string;
};

export const toNoticeRow = (audience: NoticeAudience, item: NoticeListItem): NoticeRow => ({
  id: item.noticeId,
  title: item.title,
  pinned: item.pinned,
  hostOnly: item.target === 'HOST',
  createdAt: item.createdAt,
  href: noticeHref(audience, item.noticeId),
});

/**
 * 공지 본문 → 화면에 넣을 HTML. 서버가 저장할 때 sanitize했지만 섹션 뷰어와 같은 허용 목록으로 한 번 더 거른다
 * (PR #832 권고, tech-decisions §17). 공지 본문은 언제나 HTML이다(`contentFormat` 없음). 비면 null
 */
export function renderNoticeHtml(content: string): string | null {
  if (content.trim() === '') return null;
  const safe = sanitizeSectionHtml(content).trim();
  return safe === '' ? null : safe;
}

/** 고친 공지인지(`updatedAt`이 `createdAt`과 다름). 둘 중 하나가 없으면 false */
export const isNoticeEdited = (n: Pick<NoticeDetail, 'createdAt' | 'updatedAt'>) =>
  n.createdAt !== null && n.updatedAt !== null && n.createdAt !== n.updatedAt;

/**
 * 배너가 지금 보이는지 — 서버가 요청 시각에 이미 거른다(종료 미포함). FE는 캐시한 응답이 종료 시각을 넘겼을 때만 뺀다.
 * 읽을 수 없는 시각은 서버 판단을 믿고 보인다
 */
export function isBannerLive(banner: Pick<NoticeBanner, 'bannerEndAt'>, now: Date): boolean {
  const end = banner.bannerEndAt;
  if (end === null || !isKstDateTime(end)) return true;
  return now.getTime() < parseKstDateTime(end).getTime();
}

/** 보일 배너 — 닫지 않았고 아직 끝나지 않은 것, 서버 순서(최신순) 그대로 */
export function visibleBanners(
  banners: readonly NoticeBanner[],
  dismissed: ReadonlySet<number>,
  now: Date,
): NoticeBanner[] {
  return banners.filter((b) => !dismissed.has(b.noticeId) && isBannerLive(b, now));
}
