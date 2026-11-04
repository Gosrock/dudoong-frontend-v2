'use client';

import { Avatar } from '@/ui/components/Avatar/Avatar';
import { Button } from '@/ui/components/Button/Button';
import { EmptyState, EmptyStateAction } from '@/ui/components/EmptyState/EmptyState';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { Skeleton, SkeletonText } from '@/ui/components/Skeleton/Skeleton';
import { Container } from '@/ui/primitives/Container';
import { Flex } from '@/ui/primitives/Flex';
import { Spacing } from '@/ui/primitives/Spacing';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { invitedRoleLabel } from './model/invite-token';
import { type InvalidInvitation, useHostInvitation } from './model/useHostInvitation';

const INVALID_COPY: Record<InvalidInvitation, { title: string; description: string }> = {
  expired: {
    title: '만료된 초대 링크예요',
    description: '초대 링크는 7일 동안 쓸 수 있어요. 초대한 사람에게 새 링크를 요청해 주세요.',
  },
  used: {
    title: '이미 사용된 초대 링크예요',
    description:
      '초대 링크는 한 번만 쓸 수 있어요. 필요하면 초대한 사람에게 새 링크를 요청해 주세요.',
  },
  missing: {
    title: '초대를 찾을 수 없어요',
    description: '취소됐거나 새 링크로 바뀐 초대예요. 초대한 사람에게 다시 확인해 주세요.',
  },
};

/**
 * 호스트 초대 수락(`/host-invitations/{token}`, H-19 · H-20 — B33② · 백엔드 #933). **디자인 없음** — 와이어도 없어 DS
 * `Avatar` · `InfoRow` · `Button` · `EmptyState`로만 단순하게 그렸다(design-requests Q121 🤖). 로그인 필요, 토큰은 진입 직후 주소에서 지운다.
 */
export function HostInvitationView({ token }: { token: string | null }) {
  const { state, accept, accepting } = useHostInvitation(token);

  switch (state.status) {
    case 'checking':
      return (
        <Page busy>
          <Flex direction="column" gap={4} paddingY={6} fullWidth>
            <Skeleton shape="text" height={24} width="40%" />
            <SkeletonText lines={3} />
          </Flex>
        </Page>
      );
    case 'noToken':
      return (
        <Page>
          <EmptyState
            title="초대 링크를 다시 열어 주세요"
            description="보안을 위해 링크 주소는 화면에 남기지 않아요. 받은 초대 링크를 다시 눌러 주세요."
            action={<EmptyStateAction href="/">홈으로</EmptyStateAction>}
          />
        </Page>
      );
    case 'invalid':
      return (
        <Page>
          <EmptyState
            title={INVALID_COPY[state.reason].title}
            description={INVALID_COPY[state.reason].description}
            action={<EmptyStateAction href="/">홈으로</EmptyStateAction>}
          />
        </Page>
      );
    case 'error':
      return (
        <Page>
          <Flex paddingY={6} justify="center">
            <InlineError
              message="초대를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
              onRetry={state.retry}
            />
          </Flex>
        </Page>
      );
    case 'accepted': {
      const { result, hostName } = state;
      const name = hostName ?? '호스트';
      const role = invitedRoleLabel(result.role);
      return (
        <Page>
          <EmptyState
            title={result.alreadyMember ? `이미 ${name}의 멤버예요` : `${name}에 합류했어요`}
            description={`내 역할: ${role}`}
            action={<EmptyStateAction href="/hosting">공연준비로 가기</EmptyStateAction>}
          />
        </Page>
      );
    }
    case 'ready': {
      const { landing } = state;
      const name = landing.hostName ?? '이름 없는 호스트';
      return (
        <Page>
          <Flex direction="column" align="center" gap={3} paddingY={6} fullWidth>
            <Avatar size={64} src={landing.hostProfileImageUrl ?? null} />
            <Txt as="h1" typography="headingMdEmphasized" align="center">
              {name}에서 {invitedRoleLabel(landing.role)}로 초대했어요
            </Txt>
            <Txt typography="bodyMd" color={colors.textSecondary} align="center">
              수락하면 이 호스트의 공연을 함께 관리할 수 있어요.
            </Txt>
          </Flex>
          <section aria-label="초대 정보">
            <InfoRow label="초대받은 이메일" value={landing.maskedEmail} />
            <InfoRow label="링크 만료" value={landing.expiresAt} />
          </section>
          {landing.alreadyMember && (
            <>
              <Spacing size={3} />
              <Txt as="p" typography="bodySm" color={colors.textSecondaryLabel}>
                이미 이 호스트의 멤버예요. 수락해도 지금 역할은 바뀌지 않아요.
              </Txt>
            </>
          )}
          <Spacing size={6} />
          <Button size="lg" fullWidth loading={accepting} onClick={() => void accept()}>
            수락하기
          </Button>
        </Page>
      );
    }
  }
}

function Page({ children, busy }: { children: React.ReactNode; busy?: boolean }) {
  return (
    <main aria-busy={busy || undefined}>
      <Container>
        <Flex direction="column" paddingY={6} fullWidth>
          {children}
        </Flex>
      </Container>
    </main>
  );
}
