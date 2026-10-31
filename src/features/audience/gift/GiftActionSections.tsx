'use client';

import { useEffect, useRef, useState } from 'react';

import { GIFT_MEMO_MAX } from '@/api/gift/schema';
import type { MyTicketDetail } from '@/api/my-ticket/schema';
import { shareKakaoFeed } from '@/features/shared/kakao-share/model/kakao-sdk';
import { BottomSheet } from '@/ui/components/BottomSheet/BottomSheet';
import { Button } from '@/ui/components/Button/Button';
import { button } from '@/ui/components/Button/Button.css';
import { Checkbox } from '@/ui/components/Checkbox/Checkbox';
import { Input } from '@/ui/components/Input/Input';
import { toast } from '@/ui/components/Toast/Toast';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';
import { copyText } from '@/utils/copy-text';

import { type GiftLink, useGiftLink, useSendGift } from './model/useGiftActions';
import { GiftResult } from './ui/GiftResult';
import * as s from './ui/GiftSend.css';

const COPIED = '링크가 클립보드에 복사되었습니다!';

/**
 * 선물하기 확인 시트 — GUI `908:12032` "티켓 - 선물하기"(#19: 문구 + 유의사항 확인 체크).
 * 체크해야 [티켓 선물하기]가 눌린다(클라이언트 판정 — PG-1 본문은 그대로, 메모는 링크 생성 뒤 PG-8).
 * 링크가 생기면(`Gift_400_2` 기존 링크 포함) `onLinked`로 넘기고, 연 쪽이 링크 생성 완료 화면을 띄운다.
 */
export function SendGiftSheet({
  open,
  onOpenChange,
  ticketUuid,
  onLinked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketUuid: string;
  onLinked: (link: GiftLink) => void;
}) {
  const send = useSendGift(ticketUuid);
  const [agreed, setAgreed] = useState(false);
  const linked = useRef(false);
  useEffect(() => {
    if (send.link && !linked.current) {
      linked.current = true;
      onLinked(send.link);
    }
  }, [send.link, onLinked]);

  // FIGMA-CUSTOM: 선물하기 시트(gui 908:12096 "Frame 1707480354") 커스텀 → DS BottomSheet. Figma 코멘트 2026-11-01
  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => !send.pending && onOpenChange(next)}
      dismissible={!send.pending}
      title="티켓을 선물할까요?"
      description="링크 공유를 통해 티켓을 선물할 수 있어요."
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!agreed}
          loading={send.pending}
          onClick={() => void send.send()}
        >
          티켓 선물하기
        </Button>
      }
    >
      <Flex direction="column" gap={3}>
        {/* FIGMA-CUSTOM: 유의사항 확인 상자(gui 908:12227 "Frame 1707480446") 커스텀 → 커스텀 GiftSend.css.ts. DS 후보(design-system §3) */}
        <div className={s.notice}>
          <Checkbox
            checked={agreed}
            onCheckedChange={setAgreed}
            label={
              <Txt typography="labelMdEmphasized" color={colors.textPrimaryLabel}>
                티켓 선물하기 관련 유의사항을 확인했습니다.
              </Txt>
            }
          />
          <ul className={s.noticeList}>
            <li>
              <Txt typography="bodySm" color={colors.textSecondaryLabel}>
                * 티켓 선물하기를 누르면 해당 티켓은 ‘선물 대기’ 상태로 변경됩니다. 선물 대기 상태의
                티켓은 사용할 수 없습니다.
              </Txt>
            </li>
            <li>
              <Txt typography="bodySm" color={colors.textSecondaryLabel}>
                * 상대방이 선물을 수락하기 전까지 선물 취소가 가능하며, 선물이 수락된 후에는 취소할
                수 없습니다.
              </Txt>
            </li>
          </ul>
        </div>
        {send.error && (
          <p role="alert">
            <Txt typography="bodyMd" color={colors.textDangerLabel}>
              {send.error.message}
            </Txt>
          </p>
        )}
      </Flex>
    </BottomSheet>
  );
}

/**
 * 링크 생성 완료 — GUI `908:13105`(복사 토스트 `908:21508`). 메모(PG-8, 선택) · [메세지] `sms:` · [카카오톡] · [링크복사] · [티켓 페이지로].
 * 메모는 칸을 떠날 때(또는 Enter) 바뀌었으면 저장한다 — Figma에 저장 버튼이 없다.
 * 카카오 공유가 안 되면 링크를 복사한다(P5b 공유와 같다).
 */
export function GiftLinkView({
  link,
  detail,
  onDone,
}: {
  link: GiftLink;
  detail: MyTicketDetail;
  onDone: () => void;
}) {
  const gift = useGiftLink({
    giftId: link.giftId,
    linkPath: link.linkPath,
    memo: link.memo,
    eventName: detail.event?.name ?? null,
    posterImageUrl: detail.event?.posterImageUrl ?? null,
    ticketName: detail.ticketName,
    ticketUuid: detail.ticketUuid,
  });
  const [draft, setDraft] = useState(link.memo ?? '');

  const saveIfChanged = async () => {
    if (draft.trim() === (gift.memo ?? '').trim()) return;
    if (await gift.saveMemo(draft)) toast('메모를 저장했어요');
  };
  const copy = async () => {
    toast((await copyText(gift.share.url)) ? COPIED : '링크를 복사하지 못했어요');
  };
  const shareKakao = async () => {
    if ((await shareKakaoFeed(gift.share.kakao)) === 'shared') return;
    await copy();
  };

  return (
    <GiftResult
      as="section"
      aria-label="선물 링크 생성 완료"
      tall
      illustration="gift"
      title="선물 링크 생성 완료!"
      description="버튼을 이용해 상대방에게 빠른 선물이 가능합니다."
      data-testid="gift-link-view"
      actions={
        <Button variant="primary" size="lg" fullWidth onClick={onDone}>
          티켓 페이지로
        </Button>
      }
    >
      <Input
        aria-label="선물 대상 메모"
        placeholder="선물 대상 기록하기(선택사항)"
        value={draft}
        maxLength={GIFT_MEMO_MAX}
        showCount={false}
        disabled={gift.closed}
        error={gift.error?.message}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void saveIfChanged()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void saveIfChanged();
          }
        }}
      />
      <div className={s.shareRow} data-testid="gift-link" data-value={gift.share.url}>
        <a href={gift.share.smsHref} className={button({ variant: 'secondary', size: 'md' })}>
          <Icon name="mail" variant="filled" className={s.shareIcon} />
          메세지
        </a>
        <Button
          variant="secondary"
          size="md"
          icon={<Icon name="open-chat" variant="filled" className={s.shareIcon} />}
          onClick={() => void shareKakao()}
        >
          카카오톡
        </Button>
        <Button
          variant="secondary"
          size="md"
          icon={<Icon name="link" className={s.shareIcon} />}
          onClick={() => void copy()}
        >
          링크복사
        </Button>
      </div>
    </GiftResult>
  );
}
