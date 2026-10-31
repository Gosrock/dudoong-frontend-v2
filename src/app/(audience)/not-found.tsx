import { NotFoundView } from '@/ui/components/NotFoundView/NotFoundView';
import { Container } from '@/ui/primitives/Container';

/** 관객 화면의 `notFound()`(서버 조회 404) — 셸 안에서 공용 404를 그린다(P4s-V). 상태 코드는 404 그대로 */
export default function AudienceNotFound() {
  return (
    <Container as="main">
      <NotFoundView />
    </Container>
  );
}
