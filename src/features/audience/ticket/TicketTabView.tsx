'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { isSessionLost } from '@/api/errors';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { button } from '@/ui/components/Button/Button.css';
import { Chip } from '@/ui/components/Chip/Chip';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { TicketNoticeBar } from './model/ticket-groups';
import { useTicketTab } from './model/useTicketTab';
import { EventInfo } from './ui/EventInfo';
import { PosterCard } from './ui/PosterCard';
import type { GiftDone } from './ui/TicketGiftButton';
import { TicketGiftDone } from './ui/TicketGiftDone';
import * as doneCss from './ui/TicketGiftDone.css';
import { TicketQrLayer } from './ui/TicketQrLayer';
import * as s from './ui/TicketTab.css';
import { useSnapCarousel } from './ui/useSnapCarousel';

/**
 * 티켓탭(`/tickets`) — GUI 섹션 `908:3276` 티켓페이지 GUI 적용(모바일 390).
 * 공지 바(승인거절 · 승인 · 공연 중 · 기본 — Q55) → "탭하여 입장 QR 보기" → 묶음(주문) 카드 가로 캐러셀 → 지금 카드의 공연명·일시·티켓 이름·[주문상세].
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

/** 공지 바 한 줄(`noticeBar` — 거절 > 승인 > 공연 중 > 기본). 새 소식(NEW)만 `role="status"` */
function NoticeBar({ bar, onShowTarget }: { bar: TicketNoticeBar; onShowTarget: () => void }) {
  if (bar.kind === 'DEFAULT') {
    return (
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
    );
  }
  const text =
    bar.kind === 'REFUSED'
      ? '티켓 주문 승인이 거절되었습니다.'
      : bar.kind === 'APPROVED'
        ? '티켓 주문이 승인되었습니다!'
        : '공연이 시작되었습니다!';
  return (
    <div role="status" className={s.noticeBar} data-notice={bar.kind}>
      <Chip size="lg" color="red" theme="fill">
        NEW
      </Chip>{' '}
      <span className={s.noticeText}>
        <Txt typography="labelMd" color={colors.white} lines={1}>
          {text}
        </Txt>
      </span>
      {bar.kind === 'REFUSED' && (
        // O-3 주문 상세로 — 열어야 서버가 거절 공지를 푼다(백엔드 #905 §2-2)
        <Link href={bar.orderHref} className={s.noticeLink}>
          <Txt typography="labelMd">티켓보기 →</Txt>
        </Link>
      )}
      {bar.kind === 'APPROVED' && bar.targetGroupKey && (
        <a
          href={`#group-${bar.targetGroupKey}`}
          className={s.noticeLink}
          onClick={(e) => {
            e.preventDefault();
            onShowTarget();
          }}
        >
          <Txt typography="labelMd">티켓보기 →</Txt>
        </a>
      )}
    </div>
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
  /** 선물 보내기·취소·반환이 끝난 뒤의 결과 화면(P8b-V) — 층을 닫고 티켓탭 자리에 띄운다 */
  const [giftDone, setGiftDone] = useState<GiftDone | null>(null);
  const onGiftDone = useCallback((done: GiftDone) => {
    setOpen(null);
    setGiftDone(done);
  }, []);
  const closeGiftDone = useCallback(() => setGiftDone(null), []);
  // 결과 화면을 닫으면 숨어 있던 캐러셀의 지금 칸을 다시 가운데로(숨은 동안 스크롤 위치가 0이 된다)
  const shownDone = giftDone !== null;
  useEffect(() => {
    if (!shownDone) scrollTo(activeIndex, 'instant');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 결과 화면이 닫힐 때만
  }, [shownDone]);

  const active = tab.groups[activeIndex] ?? null;
  const openGroup = open ? (tab.groups.find((g) => g.key === open.key) ?? null) : null;
  const canOpen = (i: number) => {
    const g = tab.groups[i];
    if (!g || g.orderOnly) return false;
    const t = tab.selectedTicket(g.key);
    return t !== null && tab.targetOf(t) !== null;
  };

  const showTarget = () => {
    if (tab.notice.kind !== 'APPROVED') return;
    const target = tab.notice.targetGroupKey;
    const i = tab.groups.findIndex((g) => g.key === target);
    if (i >= 0) scrollTo(i);
  };

  return (
    <>
      {giftDone && <TicketGiftDone done={giftDone} onClose={closeGiftDone} />}
      <div className={doneCss.tabBody} hidden={shownDone}>
        <div className={s.noticeWrap}>
          {/* FIGMA-CUSTOM: 공지 바(gui 939:29784 "Frame 1707480432" · 거절 939:29872 · 공연중 939:29856) 커스텀 → 커스텀 TicketTab.css.ts. DS 후보(design-system §3) */}
          <NoticeBar bar={tab.notice} onShowTarget={showTarget} />
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
            onGiftDone={onGiftDone}
            top={open?.top ?? null}
          />
        )}
      </div>
    </>
  );
}
