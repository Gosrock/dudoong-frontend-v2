import type { Me, MeHost } from '@/api/me/schema';
import { loginHref } from '@/features/shared/auth/login-href';

/**
 * 셸 메뉴(plan P4s-L) — 관객 모바일 햄버거 · 관객 PC 아바타 드롭다운 · 호스팅 모바일 드로어 · 호스팅 PC 아바타 드롭다운이
 * **같은 목록 하나**를 그린다. 그래서 `features/shared`다(audience ↔ hosting import 금지 — 호스팅 드로어도 같은 메뉴와 벨을 쓴다,
 * tech-decisions §3 "호스팅 센터 셸").
 *
 * 항목은 GUI 햄버거 `331:11622`(로그인) · `331:11679`(미로그인)와 plan P4s L 범위. AD 칸 · 서비스 업데이트 노트는 목적지가 없어
 * 넣지 않는다(design-requests Q4). 화면 문구는 "공연준비"다 — "호스팅 센터"는 쓰지 않는다(라우트 `/hosting`은 그대로).
 * 미로그인의 보호 항목은 `/login?redirect=<그 경로>`(Q16), 로그인 뒤 그 경로로 돌아오는 것은 P4b-L 콜백이 한다.
 */

export type ShellLinkKey =
  | 'bell'
  | 'login'
  | 'profile'
  | 'tickets'
  | 'orders'
  | 'following'
  | 'archive'
  | 'browse'
  | 'hosting'
  | 'newHost'
  | 'newEvent';

export type ShellLink = {
  key: ShellLinkKey;
  label: string;
  /** 누르면 가는 곳. 익명인데 로그인이 필요한 항목이면 `/login?redirect=<to>` */
  href: string;
  /** 원래 목적지 */
  to: string;
  /** 익명이라 로그인으로 보내는 항목인지 */
  viaLogin: boolean;
};

/** 목적지와 문구. 로그인이 필요한 곳은 `protected` */
const LINKS = {
  bell: { label: '알림', to: '/mypage/notifications', protected: true },
  login: { label: '로그인', to: '/login', protected: false },
  profile: { label: '프로필 편집', to: '/mypage', protected: true },
  tickets: { label: '티켓', to: '/tickets', protected: true },
  orders: { label: '주문내역', to: '/orders', protected: true },
  following: { label: '관심 호스트', to: '/mypage/following', protected: true },
  archive: { label: '지난 공연 아카이빙', to: '/mypage/archive', protected: true },
  browse: { label: '공연 둘러보기', to: '/events', protected: false },
  hosting: { label: '공연 준비', to: '/hosting', protected: true },
  newHost: { label: '새 호스트 만들기', to: '/hosting/new/hosts', protected: true },
  newEvent: { label: '새 공연 만들기', to: '/hosting/new/events', protected: true },
} as const satisfies Record<ShellLinkKey, { label: string; to: string; protected: boolean }>;

/** 항목 하나. 익명이면 보호 항목을 로그인으로 보낸다 */
export function shellLink(key: ShellLinkKey, loggedIn: boolean): ShellLink {
  const { label, to, protected: needsLogin } = LINKS[key];
  const viaLogin = needsLogin && !loggedIn;
  return { key, label, to, href: viaLogin ? loginHref(to) : to, viaLogin };
}

// ─── 호스트 줄 ──────────────────────────────────────────────────────────

/** GM-1 `hosts` 상한(백엔드 `V2MeUseCase.MAX_HOST_SUMMARY` — 합류 최신순 최대 10개) */
export const SHELL_HOST_MAX = 10;
/** 소속 호스트가 없을 때(GUI `331:11679`, 백엔드 `V2MeResponse.hosts` 설명과 같은 문구). 미로그인도 이 문구 */
export const SHELL_HOSTS_EMPTY_TEXT = '아직 두둥에서 호스트가 없어요.';
/** 보여 준 것보다 많을 때 전체 목록 — 공연준비 홈의 호스트 탭(GH-1. P10a `HOSTING_HOME_HOSTS_HREF`와 같은 주소) */
export const SHELL_HOSTS_MORE_HREF = '/hosting?tab=hosts';

export type ShellHost = Pick<MeHost, 'hostId' | 'name' | 'profileImageUrl' | 'myRole'> & {
  /** 호스트 홈(설정·멤버 입구가 거기 있다 — P10a 호스트 카드와 같다) */
  href: string;
};

export type ShellHostRow = {
  hosts: ShellHost[];
  /** 0개일 때 문구. 있으면 null */
  emptyText: string | null;
  /** 보여 주지 않은 호스트가 있을 때. 로그인으로 보내지 않는다(호스트가 있으면 로그인 상태다) */
  more: { count: number; href: string } | null;
};

/** GM-1 `hosts`(최대 10) + `hostCount` → 호스트 줄. 익명(`null`)은 빈 줄 */
export function shellHostRow(me: Pick<Me, 'hosts' | 'hostCount'> | null): ShellHostRow {
  const hosts = (me?.hosts ?? []).slice(0, SHELL_HOST_MAX).map((h) => ({
    hostId: h.hostId,
    name: h.name,
    profileImageUrl: h.profileImageUrl,
    myRole: h.myRole,
    href: `/hosts/${h.hostId}`,
  }));
  const hidden = Math.max(0, (me?.hostCount ?? 0) - hosts.length);
  return {
    hosts,
    emptyText: hosts.length === 0 && hidden === 0 ? SHELL_HOSTS_EMPTY_TEXT : null,
    more: hidden > 0 ? { count: hidden, href: SHELL_HOSTS_MORE_HREF } : null,
  };
}

// ─── 메뉴 전체 ─────────────────────────────────────────────────────────

type MenuBase = {
  /** 벨. 익명이면 `/login?redirect=/mypage/notifications`(Q16) */
  bell: ShellLink;
  /** "공연 둘러보기 ↗" · "공연 준비 ↗"(와이어 `128:2875`). PC 상단 바의 글자 메뉴도 이 둘 */
  shortcuts: ShellLink[];
  /** 주문내역 · 관심 호스트 …(로그인이면 티켓 · 아카이빙까지) */
  items: ShellLink[];
  hostRow: ShellHostRow;
  /** 새 호스트 만들기 · 새 공연 만들기 */
  create: ShellLink[];
};

export type ShellMenu =
  | (MenuBase & { kind: 'anonymous'; login: ShellLink })
  | (MenuBase & {
      kind: 'session';
      profile: Pick<Me, 'name' | 'email' | 'profileImageUrl'> & { edit: ShellLink };
    });

/**
 * 세션 결과(GM-1 — `Me` 또는 익명 `null`)에서 메뉴를 만든다. 확인 중·실패는 메뉴가 없다(훅이 상태로 돌려준다).
 * 미로그인 항목은 GUI `331:11679`대로 주문내역 · 관심 호스트만(티켓 · 아카이빙 · 로그아웃 없음).
 */
export function shellMenu(me: Me | null): ShellMenu {
  const loggedIn = me !== null;
  const link = (key: ShellLinkKey) => shellLink(key, loggedIn);
  const base: MenuBase = {
    bell: link('bell'),
    shortcuts: [link('browse'), link('hosting')],
    items: loggedIn
      ? [link('tickets'), link('orders'), link('following'), link('archive')]
      : [link('orders'), link('following')],
    hostRow: shellHostRow(me),
    create: [link('newHost'), link('newEvent')],
  };
  if (!me) return { ...base, kind: 'anonymous', login: link('login') };
  return {
    ...base,
    kind: 'session',
    profile: {
      name: me.name,
      email: me.email,
      profileImageUrl: me.profileImageUrl,
      edit: link('profile'),
    },
  };
}
