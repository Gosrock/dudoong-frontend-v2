'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { HostingBoundary } from '@/features/hosting/access/HostingBoundary';
import { NoticeBox } from '@/features/hosting/shared/ui/NoticeBox';
import { button } from '@/ui/components/Button/Button.css';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { Fab } from '@/ui/components/Fab/Fab';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { Icon } from '@/ui/icons/Icon';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { useTicketList } from './model/useTicketList';
import * as s from './TicketListView.css';
import { TicketCard } from './ui/TicketCard';
import { openOptionGuide } from './ui/TicketGuides';
import * as parts from './ui/TicketParts.css';

/**
 * `/hosting/events/[eventId]/tickets` 티켓 관리 — GUI 빈 목록 `767:46535`·PC `821:26240`, 목록 `767:50048`·`913:949`(옵션 있음)·
 * PC `767:46943`·`955:2980`, 옵션 가이드 `924:1281`·`956:3157`. 모바일 머리는 공연 헤더("티켓 관리 ▾")가 맡는다(P11-V).
 * 티켓 없음 공연은 추가 버튼이 없고 안내만(plan P12 완료 기준 V). 새 티켓은 빈 상태의 버튼 · 목록이 있으면 FAB.
 */
export function TicketListView({ eventId }: { eventId: string }) {
  return (
    <HostingBoundary resetKeys={[eventId]}>
      <TicketList eventId={eventId} />
    </HostingBoundary>
  );
}

function TicketList({ eventId }: { eventId: string }) {
  const list = useTicketList(eventId);
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

      {list.noTicketEvent && (
        <p data-testid="no-ticket-event">
          <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
            티켓 없는 공연이라 티켓을 만들 수 없어요. 기본 정보에서 티켓 여부를 바꿀 수 있어요.
          </Txt>
        </p>
      )}
      {list.actionError && (
        <p role="alert">
          <Txt typography="bodyMd" color={colors.textDangerLabel}>
            {list.actionError}
          </Txt>
        </p>
      )}
      {list.status === 'error' && (
        <InlineError layout="row" message="티켓을 불러오지 못했어요" onRetry={list.retry} />
      )}

      {list.empty ? (
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
            list.canAdd ? (
              <Link
                href={list.newHref}
                className={`${button({ variant: 'primary', size: 'lg' })} ${s.emptyAction}`}
              >
                <Icon name="add" />새 티켓 만들기
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className={s.cards} aria-label="티켓 목록">
          {list.cards.map((c) => (
            <TicketCard
              key={c.ticket.ticketItemId}
              eventId={eventId}
              card={c}
              pending={list.pendingId !== null}
              onAction={(action) =>
                action === 'delete'
                  ? list.remove(c.ticket.ticketItemId)
                  : action === 'suspend'
                    ? list.suspend(c.ticket.ticketItemId)
                    : list.resume(c.ticket.ticketItemId)
              }
            />
          ))}
        </ul>
      )}

      {list.canAdd && !list.empty && list.status === 'success' && (
        // FIGMA-CUSTOM: 새 티켓 FAB(gui 793:2469 "Button" round Primary, 채움을 보라로 덮어씀) 커스텀 → DS Fab(round Primary 검정). Figma 코멘트 2026-11-01
        <Fab
          className={s.fab}
          icon={<Icon name="add" />}
          aria-label="새 티켓 만들기"
          onClick={() => router.push(list.newHref)}
        />
      )}
    </section>
  );
}
