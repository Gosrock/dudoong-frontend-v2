'use client';

import Link from 'next/link';
import { overlay } from 'overlay-kit';

import { useLoginHref } from '@/features/shared/auth/LoginRequiredLink';
import { browserLocation } from '@/features/shared/auth/model/browser-location';
import { loginHref } from '@/features/shared/auth/model/login-href';
import type { ContactType } from '@/features/shared/contact/model/contact-link';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { KakaoLoginLabel, kakaoLoginLinkClass } from '@/ui/components/Button/KakaoSymbol';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { Skeleton } from '@/ui/components/Skeleton/Skeleton';
import { Icon, type IconProps } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { useHostHome } from '../model/useHostHome';
import * as s from './HostContactsOverlay.css';

/**
 * 연락처 유형 → 아이콘(GUI 로컬 컴포넌트 "호스트홈_연락처" `1478:7210`, Design Sync #269). 유튜브는 DS `ic_youtube`(11-15 판 —
 * 이슈 없이 생긴 새 세트, 사용자 허락), 기타는 `ic_link`. 모르는 유형은 링크. ⋯(전체 보기)는 `etc` filled.
 * 공연 상세 연락처(`ContactList`, 와이어)는 아직 옛 대응을 쓴다 — 이 화면 밖이라 고치지 않았다.
 */
export const HOST_CONTACT_ICON: Record<ContactType, IconProps> = {
  PHONE: { name: 'phone', variant: 'filled' },
  EMAIL: { name: 'mail', variant: 'filled' },
  INSTAGRAM: { name: 'instagram' },
  OPEN_CHAT: { name: 'open-chat', variant: 'filled' },
  YOUTUBE: { name: 'youtube', variant: 'filled' },
  ETC: { name: 'link' },
  UNKNOWN: { name: 'link' },
};

/** 연락처 행 위 작은 글자(GUI `1481:7194` — "이메일" · "전화번호" · "인스타그램" · "오픈채팅" · "유튜브" · "기타") */
const ROW_LABEL: Record<ContactType, string> = {
  PHONE: '전화번호',
  EMAIL: '이메일',
  INSTAGRAM: '인스타그램',
  OPEN_CHAT: '오픈채팅',
  YOUTUBE: '유튜브',
  ETC: '기타',
  UNKNOWN: '연락처',
};

/** 로그인 전 가린 값 안내(GUI `1481:7910` 시트 · `1484:8168` 팝업) */
export const MASKED_CONTACTS_NOTE = '로그인하면 전화번호와 이메일을 볼 수 있어요';

/**
 * 연락처 전체 보기 — 모바일 바텀시트 · PC 모달(`ResponsiveOverlay`). GUI `1481:7194`(로그인) · `1481:7672`(로그인 전):
 * 제목 "연락처" + ✕, 행(GUI 로컬 "연락처 행" `1481:7193` — 원 36 아이콘 · 유형 Label/sm · 값 Heading/sm · 열 수 있으면 >).
 * 로그인 전 가린 값은 회색 글자 · > 없음(상태=가림), 그 아래 회색 안내 상자 + [카카오 로그인](카카오 로그인 버튼 — 2026-11-16, GUI의 [로그인 하기] 자리).
 * 링크로 열 수 없는 값(기타의 글자 등)은 > 없이 글자만(상태=텍스트).
 */
export function openHostContacts(hostId: string) {
  overlay.open(({ isOpen, close, unmount }) => (
    <ResponsiveOverlay
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      onExited={unmount}
      title="연락처"
      // 호스팅형 시트 모양(막대 손잡이 · 머리 오른쪽 ✕ · 위 모서리 16 — GUI `1481:7734` "바텀시트_연락처")
      sheetVariant="flat"
    >
      <HostContactsBody hostId={hostId} />
    </ResponsiveOverlay>
  ));
}

/**
 * 로그인 전에 가린 연락처(전화 · 이메일) 아이콘을 누르면 — "로그인이 필요해요"(GUI `1484:8106` DS 다이얼로그 · [취소] [로그인하기] — 그 자리를 카카오 로그인 버튼 [카카오 로그인]으로, 2026-11-16).
 * [카카오 로그인]이면 창이 닫히고(기록 항목을 돌려놓은 뒤) 지금 주소로 돌아오는 로그인으로 간다 — 닫히기 전에 이동하면 창이 기록을
 * 되돌리며 이동이 취소된다(`useCloseOnBack` release). 이동은 `push`(창은 이미 닫혀 뒤로가기는 호스트 홈).
 */
export async function openLoginForContacts(navigate: (href: string) => void) {
  const ok = await openConfirm({
    title: '로그인이 필요해요',
    description: '로그인하면 호스트의 전화번호와 이메일을 볼 수 있어요.',
    cancelLabel: '취소',
    confirmLabel: '카카오 로그인',
    // 로그인으로 가는 버튼은 카카오 로그인 버튼(디자이너 요청 — GUI 코멘트 `2008666517`, 2026-11-15 "가이드대로")
    intent: 'kakaoLogin',
  });
  if (ok) navigate(loginHref(browserLocation.currentPath()));
}

/** 화면과 같은 훅을 읽는다 — 캐시를 같이 써서 요청이 늘지 않고, 시트가 열린 동안 viewer가 확정되면 원문으로 바뀐다 */
function HostContactsBody({ hostId }: { hostId: string }) {
  const home = useHostHome(hostId);
  const login = useLoginHref();
  const { contacts } = home;

  if (contacts.status === 'pending' || contacts.status === 'idle') {
    return (
      <div className={s.list} aria-busy="true">
        {contacts.items.map((_, i) => (
          <Skeleton key={i} height={64} />
        ))}
      </div>
    );
  }
  if (contacts.status === 'error') {
    return (
      <div role="alert">
        <Flex direction="column" align="center" gap={3} fullWidth>
          <Txt typography="bodyMd" color={colors.textSecondary}>
            연락처를 불러오지 못했어요.
          </Txt>
          <Button variant="secondary" size="sm" onClick={home.retryViewer}>
            다시 시도
          </Button>
        </Flex>
      </div>
    );
  }
  if (contacts.items.length === 0) {
    return (
      <Txt as="p" typography="bodyMd" color={colors.textTertiary} align="center">
        등록된 연락처가 없어요
      </Txt>
    );
  }

  return (
    <Flex direction="column" gap={5} fullWidth>
      <ul className={s.list} aria-label="연락처">
        {contacts.items.map((c, i) => {
          const body = (
            <>
              <span className={s.icon}>
                <Icon {...HOST_CONTACT_ICON[c.type]} />
              </span>
              <span className={s.text}>
                <Txt typography="labelSm" color={colors.textSecondaryLabel}>
                  {ROW_LABEL[c.type]}
                </Txt>
                <Txt
                  typography="headingSm"
                  lines={1}
                  color={c.masked ? colors.textTertiary : colors.textPrimaryLabel}
                >
                  {c.value}
                </Txt>
              </span>
            </>
          );
          return (
            <li key={`${c.type}-${i}`}>
              {c.href ? (
                <a
                  className={`${s.row} ${s.rowLink}`}
                  href={c.href}
                  {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {body}
                  <Icon name="chevron-right" className={s.chevron} />
                </a>
              ) : (
                <div className={s.row}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {contacts.masked && (
        <Flex direction="column" gap={5} fullWidth>
          <p className={s.note}>
            <Txt typography="labelSm" color={colors.textSecondaryLabel}>
              {MASKED_CONTACTS_NOTE}
            </Txt>
          </p>
          {/* 오버레이 안에서 다른 경로로 — replace(patterns §6) */}
          <Link
            href={login}
            replace
            // 카카오 로그인 버튼(가이드 — 심볼 필수). 디자이너 요청 GUI 코멘트 `2008666517`(2026-11-15)
            className={kakaoLoginLinkClass()}
          >
            <KakaoLoginLabel />
          </Link>
        </Flex>
      )}
    </Flex>
  );
}
