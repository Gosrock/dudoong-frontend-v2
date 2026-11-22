'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { overlay } from 'overlay-kit';

import type { EventDetail } from '@/api/event/schema';
import { hostDetailQuery } from '@/api/host/queries';
import { useSession } from '@/features/shared/auth/model/useSession';
import { hostContactTapOf } from '@/features/shared/host-home/model/host-home-rules';
import {
  HOST_CONTACT_ICON,
  openHostContactPopup,
  openLoginForContacts,
} from '@/features/shared/host-home/ui/HostContactsOverlay';
import { hostHref } from '@/features/shared/routes';
import { Avatar } from '@/ui/components/Avatar/Avatar';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { useEventContacts } from '../model/useEventContacts';
import * as s from './EventContactsOverlay.css';

/**
 * 호스트 연락처(문의) — GUI `759:22611` "호스트 연락처"(시트 `1383:40495`, Design Sync #337 · #338): 팝업 → 바텀시트.
 * 막대 손잡이 → 호스트 사진 100 → 이름(`Title`) → 소개(`Heading/sm`) → 연락처 아이콘 줄(GUI 로컬 "호스트홈_연락처" 원 36, 사이 12) +
 * 맨 끝 호스트 홈 아이콘. 기본으로 호스트 홈 아이콘 + 등록한 연락처 1개 이상.
 * 연락처 아이콘은 호스트 홈(GUI 구현됨 — `1481:*` · `1529:*`)과 같은 부품 · 같은 동작: 전화 · 이메일 · 기타 글자 → 연락처 팝업(`1529:13695`),
 * 인스타그램 · 유튜브 · 오픈채팅 → 새 탭, 로그인 전 가린 값 → "로그인이 필요해요"(`1484:8106`).
 * PC(1024~)는 같은 내용을 모달로(`ResponsiveOverlay` — GUI `1989:28614` "[WEB] 공연상세 - 문의하기"(#366): 310 · 머리 "호스트 연락처" + ✕,
 * 2026-11-22). 모바일 시트는 머리 글자 없이 손잡이(제목은 읽어 주는 이름으로만).
 * 연 동안만 `useEventContacts`가 로그인 사용자의 원문을 읽는다(A안 — 익명은 요청 없이 가린 값). 소개 글은 GH-3 공개 값(`hostDetailQuery`)을 연 동안 읽는다.
 */
export function openEventContacts(eventId: string, host: EventDetail['host']) {
  overlay.open(({ isOpen, close, unmount }) => (
    <ResponsiveOverlay
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      onExited={unmount}
      title="호스트 연락처"
      hideTitle
      showModalTitle
      titleSize="label"
      modalSize="sm"
      sheetVariant="rounded"
    >
      <EventContactsBody eventId={eventId} host={host} open={isOpen} />
    </ResponsiveOverlay>
  ));
}

function EventContactsBody({
  eventId,
  host,
  open,
}: {
  eventId: string;
  host: EventDetail['host'];
  open: boolean;
}) {
  const contacts = useEventContacts(eventId, { open });
  const session = useSession();
  const router = useRouter();
  // 소개 글 — 공연 상세 응답(GP-3 host)에 없어 호스트 홈 공개 값을 읽는다. 실패하면 소개 줄만 뺀다
  const intro = useQuery({
    ...hostDetailQuery(host.hostId),
    enabled: open,
    select: (d) => d.introduce,
  });
  const anonymous = session.status === 'anonymous';

  return (
    <Flex direction="column" align="center" gap={2} fullWidth className={s.body}>
      {/* FIGMA-CUSTOM: 호스트 사진(gui 1948:17946 흰 원 100 + "프로필 이미지 기본") — 호스트 홈과 같이 Avatar 100 · 사진 없으면 기본 그림 */}
      <Avatar size={100} src={host.profileImageUrl} fallback="host" />
      <Flex direction="column" align="center" gap={4} fullWidth className={s.text}>
        <Flex direction="column" align="center" gap={1} fullWidth>
          <Txt typography="title" align="center" color={colors.textPrimaryLabel} lines={2}>
            {host.name ?? '호스트'}
          </Txt>
          {intro.data && (
            <Txt typography="headingSm" align="center" color={colors.textPrimaryLabel} lines={2}>
              {intro.data}
            </Txt>
          )}
        </Flex>

        {contacts.status === 'error' ? (
          // "불러오지 못했어요"는 공용 `InlineError`(patterns §9)
          <InlineError message="연락처를 불러오지 못했어요." onRetry={contacts.retry} />
        ) : (
          <ul
            className={s.icons}
            aria-label="연락처"
            aria-busy={contacts.status === 'pending' || undefined}
          >
            {contacts.items.map((c, i) => {
              const tap = hostContactTapOf(c, anonymous);
              return (
                <li key={`${c.type}-${i}`}>
                  {tap === 'link' && c.href ? (
                    <a
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={s.iconButton}
                      aria-label={`${c.label} 열기`}
                    >
                      <Icon {...HOST_CONTACT_ICON[c.type]} />
                    </a>
                  ) : (
                    <button
                      type="button"
                      className={s.iconButton}
                      aria-label={`연락처 보기 — ${c.label}`}
                      // 확인 중인 가린 값(로그인 사용자의 원문을 읽는 중)은 잠깐 막는다 — 원문이 오면 팝업으로
                      disabled={tap === 'sheet'}
                      onClick={() => {
                        // 오버레이 안에서 다른 경로로 — replace(patterns §6). 이동하면 오버레이는 경로 리셋으로 닫힌다
                        if (tap === 'login') void openLoginForContacts(router.replace);
                        else openHostContactPopup(c);
                      }}
                    >
                      <Icon {...HOST_CONTACT_ICON[c.type]} />
                    </button>
                  )}
                </li>
              );
            })}
            <li>
              {/* 호스트 홈(GUI `1948:17963` 집 아이콘). 오버레이 안 이동이라 replace */}
              <Link
                href={hostHref(host.hostId)}
                replace
                className={s.iconButton}
                aria-label="호스트 홈"
              >
                <Icon name="home" variant="filled" />
              </Link>
            </li>
          </ul>
        )}
      </Flex>
    </Flex>
  );
}
