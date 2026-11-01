'use client';

import Link from 'next/link';

import { GiftLinkView } from '@/features/audience/gift/GiftActionSections';
import { GIFT_CANCELED_DESCRIPTION } from '@/features/audience/gift/model/gift-landing-state';
import { GiftResult } from '@/features/audience/gift/ui/GiftResult';
import { Button } from '@/ui/components/Button/Button';
import { button } from '@/ui/components/Button/Button.css';
import { useCloseOnBack } from '@/ui/hooks/useCloseOnBack';

import type { GiftDone } from './TicketGiftButton';

/**
 * 티켓탭에서 선물 동작이 끝난 뒤의 화면 — 티켓탭 자리를 대신한다(셸 헤더는 그대로).
 * - 링크 생성 완료 `908:13105` · 취소 완료 `908:21359` · 반송 완료 `908:23165`
 * - [티켓 페이지로]·뒤로가기 → 티켓탭으로 돌아온다. [다른 공연 둘러보기] → 공연홈 `/`
 */
export function TicketGiftDone({ done, onClose }: { done: GiftDone; onClose: () => void }) {
  useCloseOnBack(true, onClose);
  const toTickets = (
    <Button variant="primary" size="lg" fullWidth onClick={onClose}>
      티켓 페이지로
    </Button>
  );
  switch (done.kind) {
    case 'linked':
      return <GiftLinkView link={done.link} detail={done.detail} onDone={onClose} />;
    case 'canceled':
      return (
        <GiftResult
          as="section"
          aria-label={`선물 ${done.verb} 완료`}
          illustration="gift-return"
          title={`선물 ${done.verb} 완료`}
          // GUI 908:21359 "선물 받는분에게 선물 취소 알림이 전달됩니다" — 선물 취소·회수 알림은 기획상 없다(이슈 #106 운영자 답,
          // 11 문서 8-2). 사실과 다른 안내라 실제 결과로 바꿨다(🤖, Figma 코멘트). 문구는 선물 랜딩 취소 완료와 같다
          description={GIFT_CANCELED_DESCRIPTION}
          actions={toTickets}
        />
      );
    case 'returned':
      return (
        <GiftResult
          as="section"
          aria-label="선물 반송 완료"
          illustration="gift-return"
          title="선물 반송 완료"
          description="선물 보낸분에게 선물 반송 알림이 전달됩니다."
          actions={
            <>
              {toTickets}
              <Link href="/" className={button({ variant: 'tonal', size: 'lg', fullWidth: true })}>
                다른 공연 둘러보기
              </Link>
            </>
          }
        />
      );
  }
}
