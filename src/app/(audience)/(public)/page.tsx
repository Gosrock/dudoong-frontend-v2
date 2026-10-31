import { homeQuery } from '@/api/event/queries';
import { Prefetch } from '@/api/server/Prefetch';
import { HomeView } from '@/features/audience/home/HomeView';

/** 서버 조회 페이지는 페이지마다 instant=false를 둔다(레이아웃만으로는 같은 그룹 안 이동이 검증된다 — tech-decisions §2). */
export const instant = false;

/**
 * 공연홈(GP-1). 서버가 토큰 없이 조회해 HTML에 넣고(`<Prefetch>`), 화면은 브라우저 캐시에서 읽는다.
 * 5xx는 throw → 크롤러 500(잘못된 미리보기를 캐시하지 않게).
 */
export default function HomePage() {
  return (
    <Prefetch queries={[homeQuery()]}>
      <HomeView />
    </Prefetch>
  );
}
