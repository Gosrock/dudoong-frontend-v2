'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import { browserLocation } from '@/features/shared/auth/browser-location';
import { loginHref } from '@/features/shared/auth/login-href';
import { Button } from '@/ui/components/Button/Button';
import { Skeleton } from '@/ui/components/Skeleton/Skeleton';
import { Icon, type IconProps } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { ContactType } from '../model/contact-link';
import type { ContactsState } from '../model/viewer-contacts';
import * as s from './ContactList.css';

/**
 * 연락처 유형 → 아이콘(와이어 `500:929`·`121:2026`). 유튜브는 DS에 아이콘이 없어 `link`(Figma 코멘트로 물음).
 * 링크·라벨 매핑은 `model/contact-link.ts`에 있다.
 */
export const CONTACT_ICON: Record<ContactType, IconProps> = {
  PHONE: { name: 'phone', variant: 'filled' },
  EMAIL: { name: 'mail', variant: 'filled' },
  INSTAGRAM: { name: 'instagram' },
  OPEN_CHAT: { name: 'open-chat', variant: 'filled' },
  YOUTUBE: { name: 'link' },
  ETC: { name: 'etc', variant: 'filled' },
  UNKNOWN: { name: 'link' },
};

/** 비로그인에게 가린 값 옆 안내(design-requests Q41 기본안) */
export const MASKED_CONTACT_HINT = '로그인하면 볼 수 있어요';

const noopSubscribe = () => () => {};

/**
 * 연락처 행 목록 — 아이콘 + 값(와이어 `121:2026`). 링크를 만들 수 있으면 누르면 열리고(`tel:`·`mailto:`·새 탭),
 * 가린 값(비로그인 전화·이메일)은 글자로만 두고 "로그인하면 볼 수 있어요" 링크를 붙인다(Q41).
 * 오버레이 안에서 쓰므로 로그인 이동은 `replace`(patterns §6).
 */
export function ContactList({ state, onRetry }: { state: ContactsState; onRetry: () => void }) {
  const login = useSyncExternalStore(
    noopSubscribe,
    () => loginHref(browserLocation.currentPath()),
    () => '/login',
  );

  if (state.status === 'pending' || state.status === 'idle') {
    return (
      <div className={s.list} aria-busy="true">
        {state.items.map((_, i) => (
          <Skeleton key={i} height={48} />
        ))}
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div role="alert">
        <Flex direction="column" align="center" gap={3} fullWidth>
          <Txt typography="bodyMd" color={colors.textSecondary}>
            연락처를 불러오지 못했어요.
          </Txt>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        </Flex>
      </div>
    );
  }
  if (state.items.length === 0) {
    return (
      <Txt as="p" typography="bodyMd" color={colors.textTertiary} align="center">
        등록된 연락처가 없어요
      </Txt>
    );
  }
  return (
    <ul className={s.list} aria-label="연락처">
      {state.items.map((c, i) => {
        const body = (
          <>
            <span className={s.icon}>
              <Icon {...CONTACT_ICON[c.type]} />
            </span>
            <Flex direction="column" gap={1} className={s.text}>
              <Txt typography="labelSm" color={colors.textTertiary}>
                {c.label}
              </Txt>
              <Txt typography="labelLg" lines={1}>
                {c.value}
              </Txt>
            </Flex>
          </>
        );
        return (
          <li key={`${c.type}-${i}`}>
            {c.href ? (
              <a
                className={s.row}
                href={c.href}
                {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {body}
              </a>
            ) : (
              <div className={s.row}>
                {body}
                {c.masked && (
                  <Link href={login} replace className={s.loginHint}>
                    <Txt typography="labelSm" color={colors.textBrandLabel}>
                      {MASKED_CONTACT_HINT}
                    </Txt>
                  </Link>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
