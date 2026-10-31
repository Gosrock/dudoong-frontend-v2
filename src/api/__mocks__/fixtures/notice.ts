import type { NoticeAudience } from '@/api/notice/schema';
import { parseKstDateTime } from '@/api/shared/date';

/**
 * 서비스 공지(GA-1 · GA-2 · GA-3, #832). 백엔드 `Notice` 엔티티 모양(숨김 `visible`·배너 기간 포함)으로 두고
 * 핸들러가 공개 응답으로 줄인다. 읽기 전용이라 저장소 초기화가 없다.
 *
 * - 관객(`USER`)에게 보이는 공지 24건(페이지 2개: 20 + 4), 호스팅(`HOST`)은 29건
 * - 배너: 상시(30, ALL) · 기간 안(28, HOST만) · 지난 배너(26) · 예정 배너(25) · 숨긴 배너(27)
 * - 30번 본문에는 sanitize로 지워져야 할 것(`<script>`, `onclick`, `javascript:` 링크)을 넣었다 — 실제 서버는 저장할 때 이미 지운다
 */
export type MockNotice = {
  noticeId: number;
  title: string;
  content: string;
  target: 'ALL' | 'HOST';
  pinned: boolean;
  visible: boolean;
  banner: boolean;
  /** `yyyy.MM.dd HH:mm`(KST). null이면 제한 없음 */
  bannerStartAt: string | null;
  bannerEndAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const SANITIZE_NOTICE_ID = 30;
export const PINNED_NOTICE_ID = 29;
export const HOST_NOTICE_ID = 28;
export const HIDDEN_NOTICE_ID = 27;
export const MISSING_NOTICE_ID = 999;

const day = (n: number) => `2026.10.${String(Math.min(n, 28)).padStart(2, '0')} 10:00`;

const filler: MockNotice[] = Array.from({ length: 24 }, (_, i) => {
  const id = i + 1;
  const host = id % 6 === 0;
  return {
    noticeId: id,
    title: host ? `[호스트] 공연준비 업데이트 노트 #${id}` : `두둥 업데이트 노트 #${id}`,
    content: `<p>${host ? '공연준비' : '두둥'} 업데이트 노트 ${id}번째 소식이에요.</p>`,
    target: host ? 'HOST' : 'ALL',
    pinned: false,
    visible: true,
    banner: false,
    bannerStartAt: null,
    bannerEndAt: null,
    createdAt: day(id),
    updatedAt: day(id),
  };
});

const named: MockNotice[] = [
  {
    noticeId: SANITIZE_NOTICE_ID,
    title: '[점검] 11월 2일 새벽 서버 점검 안내',
    content:
      '<p onclick="steal()">11월 2일 02:00~04:00 서버 점검이 있어요.</p><script>alert(1)</script>' +
      '<p><a href="javascript:alert(1)">자세히</a> · <a href="https://dudoong.com/meta/term" target="_blank">이용약관</a></p>',
    target: 'ALL',
    pinned: true,
    visible: true,
    banner: true,
    bannerStartAt: null,
    bannerEndAt: null,
    createdAt: '2026.10.30 18:00',
    updatedAt: '2026.10.31 09:30',
  },
  {
    noticeId: PINNED_NOTICE_ID,
    title: '이용약관 개정 안내 (2026년 10월 25일 시행)',
    content: '<h2>개정 내용</h2><ul><li>제3조 중개자 지위 고지</li><li>제38조 공지 방법</li></ul>',
    target: 'ALL',
    pinned: true,
    visible: true,
    banner: false,
    bannerStartAt: null,
    bannerEndAt: null,
    createdAt: '2026.10.18 10:00',
    updatedAt: '2026.10.18 10:00',
  },
  {
    noticeId: HOST_NOTICE_ID,
    title: '[호스트] 두둥티켓 환불 의무 안내',
    content: '<p>두둥티켓(호스트 계좌 입금) 대금의 환불은 호스트가 직접 해요.</p>',
    target: 'HOST',
    pinned: false,
    visible: true,
    banner: true,
    bannerStartAt: '2020.01.01 00:00',
    bannerEndAt: '2099.12.31 23:59',
    createdAt: '2026.10.29 10:00',
    updatedAt: '2026.10.29 10:00',
  },
  {
    noticeId: HIDDEN_NOTICE_ID,
    title: '숨긴 공지',
    content: '<p>공개 조회에서는 404</p>',
    target: 'ALL',
    pinned: false,
    visible: false,
    banner: true,
    bannerStartAt: null,
    bannerEndAt: null,
    createdAt: '2026.10.28 10:00',
    updatedAt: '2026.10.28 10:00',
  },
  {
    noticeId: 26,
    title: '지난 배너 공지(게시판에는 남는다)',
    content: '<p>배너 기간이 끝났어요.</p>',
    target: 'ALL',
    pinned: false,
    visible: true,
    banner: true,
    bannerStartAt: null,
    bannerEndAt: '2020.01.01 00:00',
    createdAt: '2026.10.27 10:00',
    updatedAt: '2026.10.27 10:00',
  },
  {
    noticeId: 25,
    title: '예정 배너 공지',
    content: '<p>배너 기간이 아직 오지 않았어요.</p>',
    target: 'ALL',
    pinned: false,
    visible: true,
    banner: true,
    bannerStartAt: '2099.01.01 00:00',
    bannerEndAt: null,
    createdAt: '2026.10.26 10:00',
    updatedAt: '2026.10.26 10:00',
  },
];

export const mockNotices: MockNotice[] = [...named, ...filler];

const targetsOf = (audience: NoticeAudience) => (audience === 'HOST' ? ['ALL', 'HOST'] : ['ALL']);

/** 공개 게시판(`findAllByVisibleTrueAndTargetInOrderByPinnedDescIdDesc`) — 노출 공지, 고정 먼저 → id 내림차순 */
export function visibleNotices(audience: NoticeAudience): MockNotice[] {
  const targets = targetsOf(audience);
  return mockNotices
    .filter((n) => n.visible && targets.includes(n.target))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.noticeId - a.noticeId);
}

/** 공개 상세(`findByIdAndVisibleTrue`) — 숨김·없음은 undefined(404) */
export const visibleNotice = (id: number) =>
  mockNotices.find((n) => n.noticeId === id && n.visible);

/** 지금 노출 기간인 배너(`findActiveBanners`) — 시작 포함·종료 미포함, null은 제한 없음, id 내림차순 */
export function activeBanners(audience: NoticeAudience, now = new Date()): MockNotice[] {
  const targets = targetsOf(audience);
  const t = now.getTime();
  return mockNotices
    .filter(
      (n) =>
        n.visible &&
        n.banner &&
        targets.includes(n.target) &&
        (n.bannerStartAt === null || parseKstDateTime(n.bannerStartAt).getTime() <= t) &&
        (n.bannerEndAt === null || parseKstDateTime(n.bannerEndAt).getTime() > t),
    )
    .sort((a, b) => b.noticeId - a.noticeId);
}
