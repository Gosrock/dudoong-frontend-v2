'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { meQuery } from '@/api/me/queries';
import { Button } from '@/ui/components/Button/Button';
import { Container } from '@/ui/primitives/Container';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { useLogout } from './useLogout';

/**
 * 임시 보호 화면(P4a `/gate-check`). 게이트를 통과하면 보이고, 로그아웃 버튼이 있다.
 * 게이트가 세션을 확정한 뒤에만 그려지므로 GM-1은 캐시에서 읽는다(요청이 다시 나가지 않는다).
 * 실제 보호 화면이 생기면 라우트와 함께 지운다.
 */
export function GateCheckView() {
  const { data: me } = useSuspenseQuery(meQuery());
  const { logout, disabled, pending } = useLogout();
  return (
    <Container as="main">
      <Flex direction="column" gap={4} paddingY={6}>
        <Txt as="h1" typography="headingMdEmphasized">
          보호 화면 확인
        </Txt>
        <Txt as="p" typography="bodyMd" color={colors.textSecondary}>
          {me?.name ?? '이름 없음'}님으로 로그인했어요.
        </Txt>
        <Button
          variant="secondary"
          onClick={() => void logout()}
          disabled={disabled}
          loading={pending}
        >
          로그아웃
        </Button>
      </Flex>
    </Container>
  );
}
