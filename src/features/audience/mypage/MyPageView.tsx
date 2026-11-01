'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';

import { NICKNAME_MAX, NICKNAME_MIN } from '@/api/me/schema';
import { useLogout } from '@/features/shared/auth/useLogout';
import { Avatar } from '@/ui/components/Avatar/Avatar';
import { Button } from '@/ui/components/Button/Button';
import { Input } from '@/ui/components/Input/Input';
import { Icon } from '@/ui/icons/Icon';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { useProfileEdit } from './model/useProfileEdit';
import * as s from './ui/mypage.css';
import { openWithdraw } from './ui/WithdrawPopup';

/** 마이페이지 바로가기(와이어 햄버거 `128:2875`의 세 줄 — 아이콘·문구 같음) */
const SHORTCUTS = [
  { href: '/orders', label: '주문내역', icon: 'order-detail' },
  { href: '/mypage/following', label: '관심 호스트', icon: 'favorite' },
  { href: '/mypage/archive', label: '지난 공연 아카이빙', icon: 'archiving' },
] as const;

/**
 * `/mypage` — 프로필(사진 · 닉네임 · 이메일) · 바로가기 · 로그아웃 · 회원 탈퇴(P9-V).
 * 근거: 와이어 햄버거 `128:2875`의 프로필 줄(아바타 + 연필 배지 · 닉네임 · 이메일)과 메뉴. 프로필 편집 화면 · 탈퇴는 GUI·와이어에 없어
 * DS 컴포넌트로만 만들었다(Figma 코멘트 — 디자인 없음). 사진을 바꾸면 세션 키가 바뀌어 헤더 · 햄버거 아바타도 같이 바뀐다.
 * 보호 레이아웃(게이트)이 세션을 확정한 뒤에만 그려진다.
 */
export function MyPageView() {
  const { profile, name, image } = useProfileEdit();
  const logout = useLogout();
  const [draft, setDraft] = useState(profile?.name ?? '');

  const onSubmitName = (e: FormEvent) => {
    e.preventDefault();
    void name.save(draft);
  };

  return (
    <main className={s.narrowPage}>
      <Txt as="h1" typography="headingMdEmphasized" className={s.title}>
        마이페이지
      </Txt>

      <section aria-label="프로필">
        <Flex align="center" gap={4} paddingX={5} paddingY={5}>
          <span className={s.avatarWrap}>
            <Avatar size={80} src={profile?.profileImageUrl} alt="프로필 이미지" />
            {/* 연필 배지 = 사진 고르기(와이어 `128:2875`). 파일 칸은 숨기고 label로 연다 */}
            <label className={s.editBadge} aria-disabled={image.pending || undefined}>
              <Icon name="edit" className={s.editIcon} />
              <span className={s.visuallyHidden}>프로필 이미지 바꾸기</span>
              <input
                type="file"
                accept="image/jpeg,image/png"
                className={s.visuallyHidden}
                disabled={image.pending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void image.change(file);
                }}
              />
            </label>
          </span>
          <Flex direction="column" gap={1} className={s.grow}>
            <Txt typography="headingSmEmphasized" lines={1}>
              <span data-testid="profile-name">{profile?.name}</span>
            </Txt>
            <Txt typography="bodyMd" color={colors.textSecondaryLabel} lines={1}>
              {profile?.email}
            </Txt>
            {profile?.profileImageUrl && (
              <span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void image.reset()}
                  disabled={image.pending}
                >
                  기본 이미지로
                </Button>
              </span>
            )}
          </Flex>
        </Flex>
        {image.pending && (
          <div role="status">
            <Flex paddingX={5}>
              <Txt typography="labelSm" color={colors.textTertiaryLabel}>
                사진을 바꾸는 중이에요
              </Txt>
            </Flex>
          </div>
        )}
        {image.error && (
          <div className={s.warningNotice} role="alert">
            <Txt typography="labelMd" color={colors.textDangerLabel}>
              {image.error}
            </Txt>
            <span>
              <Button variant="secondary" size="sm" onClick={() => void image.retry()}>
                다시 올리기
              </Button>
            </span>
          </div>
        )}

        <form onSubmit={onSubmitName} aria-label="닉네임 바꾸기">
          <Flex direction="column" gap={3} paddingX={5} paddingY={4}>
            <Input
              label="닉네임"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={NICKNAME_MAX}
              showCount
              error={name.error ?? undefined}
              // 닉네임 = 예매자명·입금자명(서비스 운영자 결정, 이슈 #106 §4 — 화면 안내만 보강)
              helper={`${NICKNAME_MIN}~${NICKNAME_MAX}자로 지어 주세요. 예매자명·입금자명으로 호스트에게 보여요`}
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              loading={name.pending}
              disabled={name.pending || draft.trim() === profile?.name}
            >
              저장
            </Button>
          </Flex>
        </form>
      </section>

      <div className={s.sectionGap} />

      <nav aria-label="마이페이지 메뉴">
        <ul className={s.list}>
          {SHORTCUTS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={s.menuRow}>
                <Icon name={l.icon} />
                <Txt typography="labelLg">{l.label}</Txt>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Divider />

      <Flex direction="column">
        <button
          type="button"
          className={s.menuRow}
          onClick={() => void logout.logout()}
          disabled={logout.disabled}
        >
          <Icon name="log-out" />
          <Txt typography="labelLg">로그아웃</Txt>
        </button>
        <button type="button" className={s.menuRow} onClick={openWithdraw}>
          <Txt typography="labelMd" color={colors.textTertiaryLabel}>
            회원 탈퇴
          </Txt>
        </button>
      </Flex>
    </main>
  );
}
