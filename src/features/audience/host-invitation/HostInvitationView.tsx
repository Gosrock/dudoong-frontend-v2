'use client';

import Link from 'next/link';

import { formatKstKoreanDate } from '@/api/shared/date';
import { hostHref } from '@/features/shared/routes';
import { Avatar } from '@/ui/components/Avatar/Avatar';
import { Button } from '@/ui/components/Button/Button';
import { button } from '@/ui/components/Button/Button.css';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { Skeleton, SkeletonText } from '@/ui/components/Skeleton/Skeleton';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';

import * as s from './HostInvitation.css';
import { invitedRoleLabel } from './model/invite-token';
import { type InvalidInvitation, useHostInvitation } from './model/useHostInvitation';

/** 쓸 수 없는 초대 — 만료 `1427:4701` · 이미 사용 `1427:4746` · 없음 `1427:4791`(설명 두 줄) */
const INVALID_COPY: Record<InvalidInvitation, { title: string; description: string[] }> = {
  expired: {
    title: '만료된 초대장이에요',
    description: ['호스트에게 새 초대 링크를 요청해 주세요.'],
  },
  used: { title: '이미 사용된 초대장이에요', description: ['다시 호스트에게 요청해 주세요.'] },
  missing: {
    title: '초대장을 찾을 수 없어요',
    description: ['취소됐거나 새 링크로 바뀌었을 수 있어요.', '호스트에게 확인해 주세요.'],
  },
};

const HOME_LABEL = '두둥 홈으로 가기';
const HOST_HOME_LABEL = '호스트 홈으로 가기';

/**
 * 호스트 초대 수락(`/host-invitations/{token}`, H-19 · H-20 — B33② · 백엔드 #933). **GUI 근거**(모바일 Ready, Design Sync #267):
 * 초대 `1427:4596` · 수락 완료 `1427:4638` · 만료 `1427:4701` · 이미 사용 `1427:4746` · 없는 초대 `1427:4791` · 이미 멤버 `1427:4836`.
 * 결과 화면은 DS `Empty state size=medium` + DS `img_초대장` · `img_초대장_error`(#239) · `img_초대장_decline`.
 * **거절**(H-21 — Api 2.5.16, #348 B72): [거절하기](Secondary) · [수락하기](Primary) 나란히(`1427:4596`) → 확인 창 `1470:5877` →
 * 거절 완료 `1470:5905`(호스트 홈으로).
 * PC(1024~)는 Ready가 없어 같은 묶음을 342 폭 가운데로(🤖). 로그인 필요, 토큰은 진입 직후 주소에서 지운다.
 */
export function HostInvitationView({ token }: { token: string | null }) {
  const { state, accept, accepting, reject, rejecting } = useHostInvitation(token);

  switch (state.status) {
    case 'checking':
      return (
        <Page busy>
          <Flex direction="column" align="center" gap={4} fullWidth>
            <Skeleton shape="circle" width={100} height={100} />
            <Skeleton shape="text" height={26} width="80%" />
            <SkeletonText lines={2} />
          </Flex>
        </Page>
      );
    case 'noToken':
      // 디자인 없음 — 오류 결과 화면과 같은 틀로(🤖)
      return (
        <Page>
          <Result
            illustration="invitation-error"
            title="초대 링크를 다시 열어 주세요"
            description={[
              '보안을 위해 링크 주소는 화면에 남기지 않아요.',
              '받은 초대 링크를 다시 눌러 주세요.',
            ]}
            href="/"
            actionLabel={HOME_LABEL}
          />
        </Page>
      );
    case 'invalid': {
      const copy = INVALID_COPY[state.reason];
      return (
        <Page>
          <Result
            illustration="invitation-error"
            title={copy.title}
            description={copy.description}
            href="/"
            actionLabel={HOME_LABEL}
          />
        </Page>
      );
    }
    case 'error':
      return (
        <Page>
          <InlineError
            message="초대를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
            onRetry={state.retry}
          />
        </Page>
      );
    case 'rejected':
      return (
        <Page>
          <Result
            illustration="invitation-decline"
            title="초대를 거절했어요"
            description={['다시 참여하려면 호스트에게 새 초대를 요청해 주세요.']}
            href={hostHref(state.result.hostId)}
            actionLabel={HOST_HOME_LABEL}
          />
        </Page>
      );
    case 'accepted': {
      const { result, hostName } = state;
      const name = hostName ?? '호스트';
      return (
        <Page>
          {result.alreadyMember ? (
            <AlreadyMember name={name} hostId={result.hostId} />
          ) : (
            <Result
              illustration="invitation"
              title={`‘${name}’의 멤버가 됐어요!`}
              description={['이제 호스트 홈에서 공연을 함께 준비할 수 있어요.']}
              href={hostHref(result.hostId)}
              actionLabel={HOST_HOME_LABEL}
            />
          )}
        </Page>
      );
    }
    case 'ready': {
      const { landing } = state;
      const name = landing.hostName ?? '이름 없는 호스트';
      // 이미 멤버면 수락할 것이 없다 — 바로 "이미 멤버" 결과(`1427:4836`, 수락해도 역할은 그대로 — 백엔드 #928)
      if (landing.alreadyMember) {
        return (
          <Page>
            <AlreadyMember name={name} hostId={landing.hostId} />
          </Page>
        );
      }
      // 확인 창 계약(patterns §6) — 성공 · 쓸 수 없는 초대면 닫고 결과 화면, 그 밖 실패(공용 토스트)는 열린 채. 확인 버튼 보라(Primary) — `1470:5877`
      const confirmReject = () =>
        void openConfirm({
          title: '초대를 거절할까요?',
          description: '거절하면 이 초대 링크는 다시 쓸 수 없어요.',
          confirmLabel: '거절하기',
          onConfirm: () => reject(),
        });
      return (
        <Page
          actions={
            <>
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                disabled={accepting}
                loading={rejecting}
                onClick={confirmReject}
              >
                거절하기
              </Button>
              <Button
                size="lg"
                fullWidth
                loading={accepting}
                disabled={rejecting}
                onClick={() => void accept()}
              >
                수락하기
              </Button>
            </>
          }
        >
          <div className={s.invite}>
            {/* 프로필 이미지 기본(#269 `1452:40909`)은 병렬 세션 몫 — 지금은 Avatar 캐릭터 · 사진 */}
            <Avatar size={100} src={landing.hostProfileImageUrl ?? null} />
            <Txt as="h1" typography="headingMdEmphasized">
              ‘{name}’에서 {invitedRoleLabel(landing.role)}로 초대했어요
            </Txt>
            <dl className={s.infoBox} aria-label="초대 정보">
              <div className={s.infoRow}>
                <dt className={s.infoLabel}>
                  <Txt typography="bodyMd">이메일</Txt>
                </dt>
                <dd className={s.infoValue}>
                  <Txt typography="bodyMd">{landing.maskedEmail}</Txt>
                </dd>
              </div>
              <div className={s.infoRow}>
                <dt className={s.infoLabel}>
                  <Txt typography="bodyMd">만료일</Txt>
                </dt>
                <dd className={s.infoValue}>
                  <Txt typography="bodyMd">
                    {formatKstKoreanDate(landing.expiresAt, { weekday: false })}
                  </Txt>
                </dd>
              </div>
            </dl>
          </div>
        </Page>
      );
    }
  }
}

function AlreadyMember({ name, hostId }: { name: string; hostId: number }) {
  return (
    <Result
      illustration="invitation"
      title={`이미 ‘${name}’의 멤버예요`}
      description={['같은 호스트에는 한 번만 참여할 수 있어요.']}
      href={hostHref(hostId)}
      actionLabel={HOST_HOME_LABEL}
    />
  );
}

/** 결과 화면 — DS `Empty state size=medium, button=true`(그림 150 · [Primary Large] 링크) */
function Result({
  illustration,
  title,
  description,
  href,
  actionLabel,
}: {
  illustration: 'invitation' | 'invitation-error' | 'invitation-decline';
  title: string;
  description: string[];
  href: string;
  actionLabel: string;
}) {
  return (
    <EmptyState
      size="md"
      illustration={<Illustration name={illustration} width={150} />}
      title={
        <span role="heading" aria-level={1}>
          {title}
        </span>
      }
      description={description.map((line, i) => (
        <span key={line}>
          {i > 0 && <br />}
          {line}
        </span>
      ))}
      action={
        <Link
          href={href}
          className={`${button({ variant: 'primary', size: 'lg' })} ${s.actionLink}`}
        >
          {actionLabel}
        </Link>
      }
    />
  );
}

function Page({
  children,
  actions,
  busy,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  busy?: boolean;
}) {
  return (
    <main aria-busy={busy || undefined} className={s.page}>
      <div className={s.center}>{children}</div>
      {actions && <div className={s.actions}>{actions}</div>}
    </main>
  );
}
