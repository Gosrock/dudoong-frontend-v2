import type { Metadata } from 'next';

import { HostInvitationView } from '@/features/audience/host-invitation/HostInvitationView';

/**
 * 호스트 초대 링크(H-19 · H-20, 백엔드 #933 — B33②). 로그인 필요지만 `(protected)` 밖이다 — 게이트는 지금 주소(토큰 포함)를
 * 로그인 `redirect`에 넣는다. 화면이 진입 직후 주소에서 토큰을 지우고(`/host-invitations`), 익명이면 토큰을 탭 저장소에 잠깐 두고
 * 로그인으로 보낸다(`invite-token.ts`). `referrer: no-referrer` — 토큰이 주소에 있는 동안 나가는 요청에도 Referer가 없다.
 * 분석 · 광고 스크립트(지금 없음 — plan P14 GA · 애드핏)를 넣을 때는 이 경로의 page_view를 토큰 없는 경로로만 보낸다.
 */
export const metadata: Metadata = {
  title: '호스트 초대',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default async function HostInvitationTokenPage({
  params,
}: PageProps<'/host-invitations/[token]'>) {
  const { token } = await params;
  return <HostInvitationView token={token} />;
}
