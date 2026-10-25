'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';

import { useLogout } from '@/features/shared/auth/useLogout';

import { useProfileEdit } from './model/useProfileEdit';
import { useWithdraw } from './model/useWithdraw';

/**
 * `/mypage` — 프로필 편집 · 바로가기 · 로그아웃 · 탈퇴의 스타일 없는 최소 마크업(P9-L). 화면 모양은 P9-V에서 바꾼다.
 * 보호 레이아웃(게이트)이 세션을 확정한 뒤에만 그려진다.
 */
export function MyPageView() {
  const { profile, name, image } = useProfileEdit();
  const logout = useLogout();
  const withdraw = useWithdraw();
  const [draft, setDraft] = useState(profile?.name ?? '');
  const [confirming, setConfirming] = useState(false);

  const onSubmitName = (e: FormEvent) => {
    e.preventDefault();
    void name.save(draft);
  };

  return (
    <main>
      <h1>마이페이지</h1>
      <section aria-label="프로필">
        {profile?.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 최소 마크업(V에서 Avatar로 바꾼다)
          <img src={profile.profileImageUrl} alt="프로필 이미지" width={64} height={64} />
        ) : (
          <p>기본 프로필 이미지</p>
        )}
        <p data-testid="profile-name">{profile?.name}</p>
        <p>{profile?.email}</p>
        <label>
          프로필 이미지 바꾸기
          <input
            type="file"
            accept="image/jpeg,image/png"
            disabled={image.pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void image.change(file);
            }}
          />
        </label>
        <button type="button" onClick={() => void image.reset()} disabled={image.pending}>
          기본 이미지로
        </button>
        {image.error && (
          <p role="alert">
            {image.error}{' '}
            <button type="button" onClick={() => void image.retry()}>
              다시 올리기
            </button>
          </p>
        )}
        <form onSubmit={onSubmitName}>
          <label>
            닉네임
            <input value={draft} onChange={(e) => setDraft(e.target.value)} />
          </label>
          <button type="submit" disabled={name.pending}>
            저장
          </button>
          {name.error && <p role="alert">{name.error}</p>}
        </form>
      </section>
      <nav aria-label="마이페이지 메뉴">
        <ul>
          <li>
            <Link href="/orders">주문내역</Link>
          </li>
          <li>
            <Link href="/mypage/following">관심 호스트</Link>
          </li>
          <li>
            <Link href="/mypage/archive">관람 공연 아카이빙</Link>
          </li>
        </ul>
      </nav>
      <button type="button" onClick={() => void logout.logout()} disabled={logout.disabled}>
        로그아웃
      </button>
      <section aria-label="회원 탈퇴">
        {!confirming ? (
          <button type="button" onClick={() => setConfirming(true)}>
            회원 탈퇴
          </button>
        ) : (
          <div role="group" aria-label="탈퇴 확인">
            <p>탈퇴하면 보낸 선물 중 대기 중인 것은 취소돼요.</p>
            <button
              type="button"
              onClick={() => void withdraw.withdraw()}
              disabled={withdraw.pending}
            >
              탈퇴하기
            </button>
            <button type="button" onClick={() => setConfirming(false)}>
              취소
            </button>
          </div>
        )}
        {withdraw.error && <p role="alert">{withdraw.error}</p>}
      </section>
    </main>
  );
}
