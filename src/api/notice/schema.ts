import { z } from 'zod';

import { openEnum } from '../shared/open-enum';
import { pageSchema } from '../shared/page';

/**
 * 서비스 공지 GA-1 · GA-2 · GA-3(백엔드 #832 — 공지 도메인 #823). 모두 비로그인 공개 GET(`SecurityConfig.V2_PUBLIC_GET_PATHS`).
 * 기준: 백엔드 dev d89d4f9 `v2/notice/controller/V2NoticeController.kt`·`v2/notice/dto/V2NoticeDtos.kt`·
 * `v2/notice/usecase/V2ReadNoticesUseCase.kt`, `domains/notice/domain/Notice.kt`·`NoticeTarget.kt` (432cce4와 같다).
 */

/**
 * 공지를 보는 화면(요청 파라미터 `audience`, 서버 enum `V2NoticeAudience`). 생략하면 서버 기본값 `USER`.
 * `USER` = 사용자 앱(`ALL` 공지만), `HOST` = 호스팅 센터(`ALL` + `HOST` 공지). 다른 값은 400 `BAD_REQUEST`
 */
export const NOTICE_AUDIENCES = ['USER', 'HOST'] as const;
export type NoticeAudience = (typeof NOTICE_AUDIENCES)[number];

/** 공지 노출 대상(`NoticeTarget`). `ALL` = 사용자 앱 + 호스팅 센터, `HOST` = 호스팅 센터만 */
export const NOTICE_TARGETS = ['ALL', 'HOST'] as const;
export const NoticeTargetSchema = openEnum('NoticeTarget', NOTICE_TARGETS);
export type NoticeTarget = z.infer<typeof NoticeTargetSchema>;

/** GA-1 페이지 크기 — 기본 20(`V2Paging.DEFAULT_SIZE`), 상한 50(`V2Paging.MAX_SIZE`). 넘으면 400 */
export const NOTICE_PAGE_SIZE = 20;
export const NOTICE_PAGE_SIZE_MAX = 50;

/** 제목 최대 길이(`Notice.TITLE_MAX_LENGTH`). 작성은 운영 어드민이라 FE는 검증하지 않고 참고로만 둔다 */
export const NOTICE_TITLE_MAX = 100;

/** GA-1 항목(`V2NoticeListItemResponse`). 목록에는 본문이 없다 */
export const NoticeListItemSchema = z.object({
  noticeId: z.number().int(),
  /** 텍스트로만 그린다(HTML로 넣지 않는다 — PR #832 권고) */
  title: z.string(),
  target: NoticeTargetSchema,
  /** 목록 상단 고정. 서버가 고정 먼저 → 최신(id 내림차순)으로 준다 */
  pinned: z.boolean(),
  /** `yyyy.MM.dd HH:mm`. 서버 타입이 nullable */
  createdAt: z.string().nullable(),
});
export type NoticeListItem = z.infer<typeof NoticeListItemSchema>;

/** GA-1 `V2PageResponse`. Page라 `totalElements`·`totalPages`가 온다 — 그래도 다음 페이지는 `hasNext`로만 */
export const NoticePageSchema = pageSchema(NoticeListItemSchema);
export type NoticePage = z.infer<typeof NoticePageSchema>;

/** GA-2 `V2NoticeDetailResponse`. 숨김·없는 공지는 404 `Notice_404_1`. `audience`와 상관없이 열린다 */
export const NoticeDetailSchema = z.object({
  noticeId: z.number().int(),
  title: z.string(),
  /** 본문 HTML. 서버가 저장할 때 sanitize한다(`HtmlSanitizer.sanitizeV2RichText`) — FE는 그릴 때 한 번 더 */
  content: z.string(),
  target: NoticeTargetSchema,
  pinned: z.boolean(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});
export type NoticeDetail = z.infer<typeof NoticeDetailSchema>;

/** GA-3 항목(`V2NoticeBannerResponse`). 누르면 GA-2 상세 */
export const NoticeBannerSchema = z.object({
  noticeId: z.number().int(),
  title: z.string(),
  /** 배너 노출 종료(`yyyy.MM.dd HH:mm`, 미포함). null이면 운영자가 끌 때까지 */
  bannerEndAt: z.string().nullable(),
});
export type NoticeBanner = z.infer<typeof NoticeBannerSchema>;

/** GA-3은 페이지가 아니라 배열(최신순 — id 내림차순) */
export const NoticeBannersSchema = z.array(NoticeBannerSchema);
