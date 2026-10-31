'use client';

import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import { formatKstDotDateWeekdayTime } from '@/api/shared/date';
import { LoginRequiredLink } from '@/features/shared/auth/LoginRequiredLink';
import { BottomSheet } from '@/ui/components/BottomSheet/BottomSheet';
import { Button } from '@/ui/components/Button/Button';
import { button } from '@/ui/components/Button/Button.css';
import { NotFoundView } from '@/ui/components/NotFoundView/NotFoundView';
import { Skeleton, SkeletonText } from '@/ui/components/Skeleton/Skeleton';
import type { IllustrationName } from '@/ui/illustrations/Illustration';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { GiftLandingScreen } from './model/gift-landing-state';
import { useGiftLanding } from './model/useGiftLanding';
import * as s from './ui/GiftLanding.css';
import { GiftResult } from './ui/GiftResult';

type Landing = ReturnType<typeof useGiftLanding>;

/**
 * 선물 랜딩(`/gifts/[giftToken]`) — GUI `939:27148` 티켓 선물 받기/거절하기(2026-11-01 Ready).
 * - 받을 수 있음(AVAILABLE) + 로그인 → 포스터 · 공연 · [거절하기] [선물받기](`939:26721`), [거절하기] → 확인 시트(`939:26858`)
 * - 받을 수 있음 + 익명 → 로그인 안내(`939:26412`) — [카카오 로그인하기]는 `/login?redirect=<랜딩>`(복귀 뒤 다시 눌러 수락)
 * - 방금 거절함 → 거절 완료(`939:26992`) · 취소된 선물(CANCELED) → `939:27058` · 보낸 사람이 방금 취소함 → 취소 완료(`908:21359`)
 * - 나머지 상태(이미 받음 · 반환됨 · 내 링크 · 만료 · 모름)는 디자인이 없다 — 같은 틀에 L 문구(design-requests §1 기본안)
 * 상태 영역은 사용자별 값이 확정된 뒤에만 그린다(그 전에는 자리표시) — 보낸 본인에게 수락 버튼이 잠깐도 보이지 않는다.
 */
export function GiftLandingView({ giftToken }: { giftToken: string }) {
  const landing = useGiftLanding(giftToken);
  const { state } = landing;
  /** 열린 확인 시트 */
  const [asked, setAsked] = useState<'reject' | 'cancel' | null>(null);
  /** 이 화면에서 거절·취소를 확인했는지 — 다시 읽은 상태가 REJECTED·CANCELED이고 에러가 없으면 "완료" 화면으로 */
  const [did, setDid] = useState<'reject' | 'cancel' | null>(null);

  if (state.status === 'notFound') {
    return <NotFoundView title="선물을 찾을 수 없어요" href="/" actionLabel="다른 공연 둘러보기" />;
  }
  if (state.status === 'error') {
    return (
      <main className={s.page}>
        <Flex direction="column" align="center" gap={3} paddingY={8}>
          <Txt typography="bodyMd" color={colors.textSecondary} align="center">
            <span role="alert">불러오지 못했어요. 잠시 후 다시 시도해 주세요.</span>
          </Txt>
          <Button variant="secondary" size="md" onClick={state.retry}>
            다시 시도
          </Button>
        </Flex>
      </main>
    );
  }
  if (state.status === 'pending') {
    return (
      <main className={s.page} aria-busy="true">
        <Flex direction="column" align="center" gap={5} className={s.content}>
          <Skeleton className={s.poster} />
          <SkeletonText lines={2} width="60%" />
        </Flex>
      </main>
    );
  }

  const { screen } = state;
  const region = { 'aria-label': '선물 상태', 'data-view-state': screen.viewState } as const;
  const error = landing.actionError && (
    <p role="alert">
      <Txt typography="bodyMd" color={colors.textDangerLabel} align="center">
        {landing.actionError}
      </Txt>
    </p>
  );

  if (screen.viewState === 'AVAILABLE' && landing.receiveMode === 'login') {
    return (
      <main className={s.fill}>
        <GiftResult
          as="section"
          {...region}
          illustration="login"
          description="두둥에 로그인하고 다양한 공연을 즐겨보세요!"
          actions={
            <LoginRequiredLink
              className={button({ variant: 'primary', size: 'lg', fullWidth: true })}
            >
              카카오 로그인하기
            </LoginRequiredLink>
          }
        />
      </main>
    );
  }

  if (screen.viewState === 'AVAILABLE') {
    return (
      <main className={s.page}>
        <section {...region} className={s.content}>
          <Flex direction="column" align="center" gap={5}>
            <Summary landing={landing} />
            {error}
            <div className={s.actions}>
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                disabled={landing.receiveMode !== 'enabled'}
                onClick={() => setAsked('reject')}
              >
                거절하기
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={landing.receiveMode !== 'enabled'}
                onClick={() => void landing.accept()}
              >
                선물받기
              </Button>
            </div>
          </Flex>
        </section>
        <RejectSheet
          open={asked === 'reject'}
          onClose={() => setAsked(null)}
          pending={landing.pending}
          onConfirm={async () => {
            setDid('reject');
            await landing.reject();
          }}
        />
      </main>
    );
  }

  if (screen.showSummary) {
    // OWN_LINK · EXPIRED — 디자인 없음. 받기 화면 틀에 안내 문구와 [선물 취소/회수] · [티켓 페이지로]
    const verb = screen.viewState === 'EXPIRED' ? '회수' : '취소';
    return (
      <main className={s.page}>
        <section {...region} className={s.content}>
          <Flex direction="column" align="center" gap={5}>
            <Summary landing={landing} heading="h2" />
            <Flex direction="column" align="center" gap={2}>
              <Txt
                as="h1"
                typography="headingSmEmphasized"
                color={colors.textPrimaryLabel}
                align="center"
              >
                {screen.title}
              </Txt>
              {screen.description && (
                <Txt as="p" typography="labelMd" color={colors.textSecondaryLabel} align="center">
                  {screen.description}
                </Txt>
              )}
            </Flex>
            {error}
            <div className={s.actions}>
              {screen.actions.includes('CANCEL_GIFT') && (
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  disabled={landing.cancelMode !== 'enabled'}
                  onClick={() => setAsked('cancel')}
                >
                  {`선물 ${verb}`}
                </Button>
              )}
              <Link
                href={landing.ticketsHref}
                className={button({ variant: 'primary', size: 'lg', fullWidth: true })}
              >
                티켓 페이지로
              </Link>
            </div>
          </Flex>
        </section>
        <CancelSheet
          open={asked === 'cancel'}
          onClose={() => setAsked(null)}
          verb={verb}
          pending={landing.pending}
          onConfirm={async () => {
            setDid('cancel');
            await landing.cancelGift();
          }}
        />
      </main>
    );
  }

  const result = resultScreen(screen, landing.actionError ? null : did);
  return (
    <main className={s.fill}>
      <GiftResult
        as="section"
        {...region}
        illustration={result.illustration}
        title={result.title}
        description={result.description}
        actions={
          <>
            <Link
              href={landing.ticketsHref}
              className={button({ variant: 'primary', size: 'lg', fullWidth: true })}
            >
              티켓 페이지로
            </Link>
            {result.browse && (
              <Link href="/" className={button({ variant: 'tonal', size: 'lg', fullWidth: true })}>
                다른 공연 둘러보기
              </Link>
            )}
          </>
        }
      >
        {error}
      </GiftResult>
    </main>
  );
}

/** 요약이 없는 상태 화면 — GUI가 있는 셋(거절 완료 · 취소 완료 · 취소된 선물)은 GUI 문구, 나머지는 L 문구 */
function resultScreen(
  screen: GiftLandingScreen,
  did: 'reject' | 'cancel' | null,
): { illustration: IllustrationName; title: ReactNode; description: ReactNode; browse: boolean } {
  if (screen.viewState === 'REJECTED' && did === 'reject') {
    return {
      illustration: 'gift-return',
      title: '선물 거절 완료',
      description: '선물 보낸분에게 선물 거절 알림이 전달됩니다.',
      browse: true,
    };
  }
  if (screen.viewState === 'CANCELED' && did === 'cancel') {
    return {
      illustration: 'gift-return',
      title: '선물 취소 완료',
      description: '선물 받는분에게 선물 취소 알림이 전달됩니다.',
      browse: false,
    };
  }
  if (screen.viewState === 'CANCELED') {
    return {
      illustration: 'gift-canceled',
      title: '취소된 선물',
      description: '선물 보낸분이 선물을 취소했습니다.',
      browse: true,
    };
  }
  // 디자인 없음(이미 받음 · 거절됨 · 반환됨 · 모름) — 취소된 선물(`939:27058`)과 같은 틀 · 회색 선물
  return {
    illustration: 'gift-canceled',
    title: screen.title,
    description: screen.description,
    browse: true,
  };
}

/** 받을 선물의 공연 — 포스터 294 · 공연명(`Title`) · 일시와 티켓 이름(`Body/lg`, 회색) */
function Summary({ landing, heading = 'h1' }: { landing: Landing; heading?: 'h1' | 'h2' }) {
  const { event, ticket } = landing.summary;
  const [failed, setFailed] = useState(false);
  const poster = event?.posterImageUrl ?? null;
  const when = event?.startAt ? formatKstDotDateWeekdayTime(event.startAt) : null;
  return (
    <Flex direction="column" align="center" gap={5} fullWidth>
      {/* FIGMA-CUSTOM: 받는 선물 포스터(gui 939:26845 "image 182-1") 커스텀 → 커스텀 GiftLanding.css.ts. DS 후보(design-system §3) */}
      <div className={s.poster}>
        {poster && !failed && (
          // 서버 이미지(자산 도메인). nginx가 `/_next/image`를 막아 next/image를 쓰지 않는다(v1 #378)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={s.posterImage}
            src={poster}
            alt=""
            ref={(img) => {
              if (img && img.complete && img.naturalWidth === 0) setFailed(true);
            }}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <Flex direction="column" align="center" gap={3} fullWidth>
        <Txt as={heading} typography="title" color={colors.textPrimaryLabel} align="center">
          {event?.name ?? '공연 정보 없음'}
        </Txt>
        <Txt as="p" typography="bodyLg" color={colors.textSecondaryLabel} align="center">
          {when}
          {when && ticket?.ticketName && <br />}
          {ticket?.ticketName}
        </Txt>
      </Flex>
    </Flex>
  );
}

/** 거절 확인 — GUI `939:26858`(시트 `939:26914`) "선물을 거절하시겠습니까?" [아니오] [예] */
function RejectSheet({
  open,
  onClose,
  pending,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  pending: boolean;
  onConfirm: () => Promise<void>;
}) {
  // FIGMA-CUSTOM: 거절 확인 시트(gui 939:26914 "Frame 1707480354") 커스텀 → DS BottomSheet. Figma 코멘트 2026-11-01
  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      dismissible={!pending}
      title="선물을 거절하시겠습니까?"
      description="확인을 누르시면 해당 티켓 선물이 반환됩니다."
      footer={
        <div className={s.actions}>
          <Button variant="secondary" size="lg" fullWidth disabled={pending} onClick={onClose}>
            아니오
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={pending}
            onClick={() => void onConfirm().then(onClose)}
          >
            예
          </Button>
        </div>
      }
    />
  );
}

/** 보낸 사람의 취소·회수 확인 — 디자인 없음. 티켓탭 선물 취소 시트(`908:21252`)와 같은 문구 */
function CancelSheet({
  open,
  onClose,
  verb,
  pending,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  verb: string;
  pending: boolean;
  onConfirm: () => Promise<void>;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      dismissible={!pending}
      title={`선물을 ${verb}하시겠습니까?`}
      description={`확인을 누르시면 해당 티켓 선물이 ${verb}됩니다.`}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={pending}
          onClick={() => void onConfirm().then(onClose)}
        >
          {`선물 ${verb}하기`}
        </Button>
      }
    />
  );
}
