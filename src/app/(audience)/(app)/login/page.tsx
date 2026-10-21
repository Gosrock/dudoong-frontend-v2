import { Container } from '@/ui/primitives/Container';
import { Txt } from '@/ui/primitives/Txt';

/** 자리표시(P4a). 로그인 화면(카카오 로그인, GUI `331:11720`)은 P4b에서 만든다. 게이트가 `/login?redirect=…`로 보낸다 */
export default function LoginPage() {
  return (
    <Container as="main">
      <Txt as="h1" typography="headingMdEmphasized">
        로그인
      </Txt>
      <Txt as="p" typography="bodyMd">
        로그인 화면은 준비 중이에요.
      </Txt>
    </Container>
  );
}
