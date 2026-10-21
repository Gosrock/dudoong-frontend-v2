import { Container } from '@/ui/primitives/Container';
import { Txt } from '@/ui/primitives/Txt';

/** 자리표시(P4a). 세션 만료 안내는 P4b에서 만든다. 세션 상실(`onSessionLost`)이 보호 화면에서 `/login/expired?redirect=…`로 보낸다 */
export default function LoginExpiredPage() {
  return (
    <Container as="main">
      <Txt as="h1" typography="headingMdEmphasized">
        로그인이 만료됐어요
      </Txt>
      <Txt as="p" typography="bodyMd">
        다시 로그인해 주세요.
      </Txt>
    </Container>
  );
}
