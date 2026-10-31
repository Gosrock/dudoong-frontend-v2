'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { isSessionLost } from '@/api/errors';
import { HostingAccessRejected } from '@/features/hosting/access/HostingAccessRejected';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { Button } from '@/ui/components/Button/Button';
import { button } from '@/ui/components/Button/Button.css';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { Fab } from '@/ui/components/Fab/Fab';
import { Icon } from '@/ui/icons/Icon';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { useTicketList } from './model/useTicketList';
import * as s from './TicketListView.css';
import { TicketCard } from './ui/TicketCard';
import { openOptionGuide } from './ui/TicketGuides';
import { NoticeBox } from './ui/TicketParts';
import * as parts from './ui/TicketParts.css';

/**
 * `/hosting/events/[eventId]/tickets` 티켓 관리 — GUI 빈 목록 `767:46535`·PC `821:26240`, 목록 `767:50048`·`913:949`(옵션 있음)·
 * PC `767:46943`·`955:2980`, 옵션 가이드 `924:1281`·`956:3157`. 모바일 머리는 공연 헤더("티켓 관리 ▾")가 맡는다(P11-V).
 * 티켓 없음 공연은 추가 버튼이 없고 안내만(plan P12 완료 기준 V). 새 티켓은 빈 상태의 버튼 · 목록이 있으면 FAB.
 */
export function TicketListView({ eventId }: { eventId: string }) {
  return (
    <AsyncBoundary holdOn={isSessionLost} rejected={HostingAccessRejected} resetKeys={[eventId]}>
      <TicketList eventId={eventId} />
    </AsyncBoundary>
  );
}

function TicketList({ eventId }: { eventId: string }) {
  const l = useTicketList(eventId);
  const router = useRouter();
  return (
    <section aria-labelledby="tickets-title" className={s.page}>
      <div className={s.head}>
        <div className={s.intro}>
          <h1 id="tickets-title" className={s.desktopTitle}>
            <Txt typography="headingLgEmphasized">티켓 관리</Txt>
          </h1>
          <Txt as="p" typography="bodyMd">
            관객들을 위한 티켓을 만들어 주세요. 최소 1개의 티켓이 필요해요.
          </Txt>
          <Txt as="p" typography="bodyMd" color={colors.textDangerLabel}>
            *예매가 발생한 티켓은 삭제할 수 없어요. 필요하면 판매 중단 기능을 이용해 주세요.
          </Txt>
        </div>
        <NoticeBox icon="lightbulb" onClick={openOptionGuide} className={parts.noticeInline}>
          티켓 옵션이란?
        </NoticeBox>
      </div>

      {l.noTicketEvent && (
        <p data-testid="no-ticket-event">
          <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
            티켓 없는 공연이라 티켓을 만들 수 없어요. 기본 정보에서 티켓 여부를 바꿀 수 있어요.
          </Txt>
        </p>
      )}
      {l.actionError && (
        <p role="alert">
          <Txt typography="bodyMd" color={colors.textDangerLabel}>
            {l.actionError}
          </Txt>
        </p>
      )}
      {l.status === 'error' && (
        <p role="alert">
          <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
            티켓을 불러오지 못했어요{' '}
          </Txt>
          <Button variant="secondary" size="sm" onClick={l.retry}>
            다시 시도
          </Button>
        </p>
      )}

      {l.empty ? (
        <EmptyState
          className={s.empty}
          illustration={<Illustration name="no-ticket" className={s.emptyIllustration} />}
          description={
            <span data-testid="tickets-empty">
              <Txt typography="bodyLg" color={colors.textTertiaryLabel}>
                만든 티켓이 없어요
              </Txt>
            </span>
          }
          action={
            l.canAdd ? (
              <Link
                href={l.newHref}
                className={`${button({ variant: 'primary', size: 'lg' })} ${s.emptyAction}`}
              >
                <Icon name="add" />새 티켓 만들기
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className={s.cards} aria-label="티켓 목록">
          {l.cards.map((c) => (
            <TicketCard
              key={c.ticket.ticketItemId}
              eventId={eventId}
              card={c}
              pending={l.pendingId !== null}
              onAction={(action) =>
                action === 'delete'
                  ? l.remove(c.ticket.ticketItemId)
                  : action === 'suspend'
                    ? l.suspend(c.ticket.ticketItemId)
                    : l.resume(c.ticket.ticketItemId)
              }
            />
          ))}
        </ul>
      )}

      {l.canAdd && !l.empty && l.status === 'success' && (
        // FIGMA-CUSTOM: 새 티켓 FAB(gui 793:2469 "Button" round Primary, 채움을 보라로 덮어씀) 커스텀 → DS Fab(round Primary 검정). Figma 코멘트 2026-11-01
        <Fab
          className={s.fab}
          icon={<Icon name="add" />}
          aria-label="새 티켓 만들기"
          onClick={() => router.push(l.newHref)}
        />
      )}
    </section>
  );
}
