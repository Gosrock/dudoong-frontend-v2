import { eventTagsQuery } from '@/api/event/queries';
import { Prefetch } from '@/api/server/Prefetch';
import { TagList } from '@/features/audience/home/TagList';

/** 서버 조회 페이지는 페이지마다 instant=false를 둔다(레이아웃만으로는 같은 그룹 안 이동이 검증된다 — tech-decisions §2). */
export const instant = false;

/** P0 수직 슬라이스. 공연홈(GP-1)은 P5a에서 이 자리를 채운다. */
export default function HomePage() {
  return (
    <main>
      <h1>두둥</h1>
      <Prefetch queries={[eventTagsQuery()]}>
        <TagList />
      </Prefetch>
    </main>
  );
}
