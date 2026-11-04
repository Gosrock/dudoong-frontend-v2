import type { Metadata } from 'next';

import { HostInvitationView } from '@/features/audience/host-invitation/HostInvitationView';

/**
 * 토큰을 지운 뒤의 주소(`/host-invitations`) — 로그인에서 돌아오거나 새로고침했을 때. 토큰은 로그인으로 갈 때 둔 탭 저장소에서만
 * 꺼낸다(없으면 "초대 링크를 다시 열어 주세요"). `[token]/page.tsx` 주석 참고
 */
export const metadata: Metadata = {
  title: '호스트 초대',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default function HostInvitationPage() {
  return <HostInvitationView token={null} />;
}
