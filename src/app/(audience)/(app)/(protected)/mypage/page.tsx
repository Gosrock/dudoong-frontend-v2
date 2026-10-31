import { MyPageView } from '@/features/audience/mypage/MyPageView';

/** 마이페이지(P9, 보호). 프로필(GM-1 · PM-2 · PM-3)·바로가기·로그아웃·탈퇴. 조회는 브라우저에서 — 게이트가 세션을 확정한 뒤 */
export default function MyPage() {
  return <MyPageView />;
}
