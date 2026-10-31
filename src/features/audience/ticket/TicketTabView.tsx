'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import Link from 'next/link';
import { useCallback, useState } from 'react';

import { isSessionLost } from '@/api/errors';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { button } from '@/ui/components/Button/Button.css';
import { Chip } from '@/ui/components/Chip/Chip';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { useTicketTab } from './model/useTicketTab';
import { EventInfo } from './ui/EventInfo';
import { PosterCard } from './ui/PosterCard';
import { TicketQrLayer } from './ui/TicketQrLayer';
import * as s from './ui/TicketTab.css';
import { useSnapCarousel } from './ui/useSnapCarousel';

/**
 * 티켓탭(`/tickets`) — GUI 섹션 `908:3276` 티켓페이지 GUI 적용(모바일 390).
 * 공지 바 → "탭하여 입장 QR 보기" → 묶음(주문) 카드 가로 캐러셀 → 지금 카드의 공연명·일시·티켓 이름·[주문상세].
 * 카드를 누르면 입장 QR 층(`TicketQrLayer`)이 뜬다. 정렬 라벨은 두지 않는다(#29 — "티켓 정렬 순서 삭제").
 */
export function TicketTabView() {
  return (
    <main className={s.page}>
      <VisuallyHidden asChild>
        <h1>내 티켓</h1>
      </VisuallyHidden>
      <AsyncBoundary holdOn={isSessionLost}>
        <TicketTabContent />
      </AsyncBoundary>
    </main>
  );
}

/** 입장 QR 층의 위 여백 = 카드 위치 − (선물 버튼 줄 46 + 위 여백 12) */
const LAYER_HEAD = 46 + 12;

function TicketTabContent() {
  const tab = useTicketTab();
  const {
    ref: carouselRef,
    active: activeIndex,
    scrollTo,
  } = useSnapCarousel({ count: tab.groups.length });
  const [open, setOpen] = useState<{ key: string; top: number | null } | null>(null);
  const close = useCallback(() => setOpen(null), []);

  const active = tab.groups[activeIndex] ?? null;
  const openGroup = open ? (tab.groups.find((g) => g.key === open.key) ?? null) : null;
  const canOpen = (i: number) => {
    const g = tab.groups[i];
    if (!g || g.orderOnly) return false;
    const t = tab.selectedTicket(g.key);
    return t !== null && tab.targetOf(t) !== null;
  };

  const showTarget = () => {
    const i = tab.groups.findIndex((g) => g.key === tab.notice.targetGroupKey);
    if (i >= 0) scrollTo(i);
  };

  return (
    <>
      <div className={s.noticeWrap}>
        {/* FIGMA-CUSTOM: 공지 바(gui 939:29784 "Frame 1707480432") 커스텀 → 커스텀 TicketTab.css.ts. DS 후보(design-system §3) */}
        {tab.notice.show ? (
          <div role="status" className={s.noticeBar}>
            <Chip size="lg" color="red" theme="fill">
              NEW
            </Chip>{' '}
            <span className={s.noticeText}>
              <Txt typography="labelMd" color={colors.white} lines={1}>
                티켓 주문이 승인되었습니다!
              </Txt>
            </span>
            {tab.notice.targetGroupKey && (
              <a
                href={`#group-${tab.notice.targetGroupKey}`}
                className={s.noticeLink}
                onClick={(e) => {
                  e.preventDefault();
                  showTarget();
                }}
              >
                <Txt typography="labelMd">티켓보기 →</Txt>
              </a>
            )}
          </div>
        ) : (
          <div className={s.noticeBar} data-testid="notice-default">
            <Chip size="lg" color="grey" theme="fill">
              Notice
            </Chip>{' '}
            <span className={s.noticeText}>
              <Txt typography="labelMd" color={colors.white} lines={1}>
                두둥에서 다양한 공연을 예매해보세요
              </Txt>
            </span>
          </div>
        )}
      </div>

      {tab.empty ? (
        <div className={s.empty}>
          <EmptyState
            illustration={<Illustration name="no-ticket" />}
            description="이용 가능한 티켓이 없어요"
          />
          <Link href="/" className={button({ variant: 'primary', size: 'lg', fullWidth: true })}>
            공연 둘러보기
          </Link>
        </div>
      ) : (
        <>
          <div className={s.hint} aria-hidden={!canOpen(activeIndex)}>
            {/* 입장 QR 층이 열리면 층의 "바깥을 탭하여 QR 끄기"가 이 자리에 온다 */}
            {canOpen(activeIndex) && !openGroup && (
              <Txt typography="labelMd" color={colors.textSecondary}>
                탭하여 입장 QR 보기
              </Txt>
            )}
          </div>
          <div ref={carouselRef} className={s.carousel} aria-label="내 티켓 묶음">
            {tab.groups.map((g, i) => {
              const isActive = i === activeIndex;
              return (
                <div
                  key={g.key}
                  id={`group-${g.key}`}
                  className={s.item}
                  data-carousel-item
                  data-active={isActive}
                  data-testid="ticket-group"
                >
                  <PosterCard
                    group={g}
                    label={
                      !isActive
                        ? `${g.group.event?.name ?? '삭제된 공연'} 카드로`
                        : canOpen(i)
                          ? '입장 QR 보기'
                          : `${g.group.event?.name ?? '삭제된 공연'} 티켓`
                    }
                    onPress={(el) => {
                      if (!isActive) return scrollTo(i);
                      if (!canOpen(i)) return;
                      const top = el.getBoundingClientRect().top - LAYER_HEAD;
                      setOpen({ key: g.key, top: top > 0 ? top : null });
                    }}
                  />
                </div>
              );
            })}
          </div>
          {active && (
            <div className={s.info} data-testid="ticket-info">
              <EventInfo group={active} />
            </div>
          )}
        </>
      )}

      {openGroup && (
        <TicketQrLayer
          group={openGroup}
          index={tab.selectedIndex(openGroup.key)}
          onIndexChange={(i) => tab.select(openGroup.key, i)}
          onClose={close}
          top={open?.top ?? null}
        />
      )}
    </>
  );
}
