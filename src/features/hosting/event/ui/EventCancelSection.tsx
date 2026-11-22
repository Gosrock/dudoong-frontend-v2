'use client';

import { useState } from 'react';

import { EVENT_CANCEL_REASON_MAX } from '@/api/event/schema';
import { SUPPORT_CHANNEL_URL } from '@/features/shared/routes';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { button } from '@/ui/components/Button/Button.css';
import { Checkbox } from '@/ui/components/Checkbox/Checkbox';
import { TextArea } from '@/ui/components/TextArea/TextArea';
import { toast } from '@/ui/components/Toast/Toast';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import {
  CANCEL_CONFIRM_CHECK,
  CANCEL_EVENT_DONE_TOAST,
  CANCEL_REASON_PLACEHOLDER,
  CANCEL_SECTION_NOTICE,
  cancelConfirmNotice,
  cancelContactMessage,
  cancelLeftoverMessage,
} from '../model/event-cancel';
import { useEventCancel } from '../model/useEventCancel';
import * as s from './EventCancelSection.css';

type EventCancel = ReturnType<typeof useEventCancel>;

/*
 * 공연 취소 E-11(Api 2.5.8 — 이슈 #136 §7). GUI Ready(Design Sync #326 · #332, 2026-11-21 — 전에는 디자인이 없어 DS로만 그렸다, Q122~Q124):
 * - 대시보드 맨 아래 `공연 취소` 자리(`1912:3126` PC · `1913:37061` 모바일) — 안내 아이콘 + 제목 + 안내 + 빨간 글자 [공연 취소하기]
 * - 확인 창(`1912:3581` · `1913:37541` PC 모달 / `1912:4413` · `1913:37303` 모바일 시트) — 분홍 안내 · 사유(필수 · 100자) · 확인 체크 · 돌아가기 / 취소하기
 * - 취소된 공연 안내(`1912:3661` · `1912:4037` PC / `1912:4466` 모바일) — 머리 아래 분홍 상자 · 날짜 · 사유 · 결과 · [주문 처리하기] 또는 [문의하기]
 */

/**
 * 대시보드 머리 아래 "취소된 공연" 안내(모든 멤버) + 마스터는 결과 · 남은 주문 · [주문 처리하기] / [문의하기]. 취소 안 된 공연이면 이 화면이
 * 처리한 결과(응답을 못 받은 경우)만. GUI `취소 안내`(`1912:3661`) — #FEEDEC · 모서리 20 · 패딩 16 · 간격 8
 */
export function CanceledEventNotice({ cancel }: { cancel: EventCancel }) {
  if (!cancel.canceled && !cancel.canRetry) return null;
  const { summary, contactCount } = cancel;
  const lines: string[] = [];
  if (summary && summary.processed) lines.push(summary.processed);
  if (contactCount !== null) lines.push(cancelContactMessage(contactCount));
  else if (cancel.canRetry) lines.push(cancelLeftoverMessage(cancel.retryCount));
  return (
    <div className={s.canceledBox} data-testid="event-canceled">
      {cancel.canceled && (
        <Txt as="p" typography="headingSmEmphasized">
          취소된 공연이에요.
        </Txt>
      )}
      {cancel.canceled && (cancel.canceledAt || cancel.cancelReason) && (
        <Txt as="p" typography="labelMd" color={colors.textSecondaryLabel} className={s.lines}>
          {cancel.canceledAt && <>날짜: {cancel.canceledAt}</>}
          {cancel.canceledAt && cancel.cancelReason && <br />}
          {cancel.cancelReason && <>사유: {cancel.cancelReason}</>}
        </Txt>
      )}
      {lines.length > 0 && (
        <Txt
          as="p"
          typography="labelMdEmphasized"
          color={colors.textDangerLabel}
          className={s.lines}
          data-testid="event-cancel-result"
        >
          {lines.map((line, i) => (
            <span key={line} className={s.line}>
              {i > 0 && <br />}
              {line}
            </span>
          ))}
        </Txt>
      )}
      {cancel.error && (
        <p role="alert">
          <Txt typography="bodySm" color={colors.textDangerLabel}>
            {cancel.error}
          </Txt>
        </p>
      )}
      {contactCount !== null ? (
        <div data-testid="event-cancel-contact">
          {/* FIGMA-CUSTOM: [문의하기] 목적지(gui 1912:4037 "Button") — Figma에 없어 두둥 카카오톡 채널(공연홈 푸터와 같은 곳) 🤖 Q166 */}
          <a
            href={SUPPORT_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${button({ variant: 'secondary', size: 'md' })} ${s.boxButton}`}
          >
            문의하기
          </a>
        </div>
      ) : (
        cancel.canRetry && (
          <div>
            <Button
              variant="secondary"
              size="md"
              className={s.boxButton}
              loading={cancel.pending}
              disabled={cancel.pending}
              onClick={() => void cancel.retry()}
            >
              주문 처리하기
            </Button>
          </div>
        )
      )}
    </div>
  );
}

/**
 * 대시보드 맨 아래 `공연 취소`(마스터 · 시작 전 등록 공연만). [공연 취소하기]를 누르면 확인 창(PC 모달 · 모바일 시트 — 뒤로가기로 닫힘).
 * `orders` = 대시보드 통계의 주문 수(확인 창 안내의 "남은 주문 n건 · 결제한 주문 m건"). 없으면 수 없이 안내한다
 */
export function EventCancelSection({
  cancel,
  orders,
}: {
  cancel: EventCancel;
  orders: { pendingApprove: number; approved: number } | null;
}) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  // 취소에 성공하면 GE-3이 먼저 바뀌어 `canCancel`이 false가 된다 — 오버레이가 닫힐 때까지는 붙여 둔다(뒤로가기 기록 정리)
  if (!cancel.canCancel && !open) return null;
  const close = () => {
    cancel.setReason('');
    setChecked(false);
    setOpen(false);
  };
  const submit = async () => {
    const outcome = await cancel.cancel();
    if (outcome === 'canceled') toast(CANCEL_EVENT_DONE_TOAST, { id: 'event-canceled' });
    if (outcome) {
      setChecked(false);
      setOpen(false);
    }
  };
  // 🤖 확인 체크 + 사유가 있어야 누를 수 있다(GUI 체크 전 `1912:4413` 비활성 · 체크됨 `1913:37303` 빨강)
  const ready = checked && cancel.reason.trim() !== '' && !cancel.pending;
  return (
    <section className={s.section} aria-labelledby="event-cancel-title" data-testid="event-cancel">
      <span className={s.sectionIcon} aria-hidden>
        <Icon name="circle-request" />
      </span>
      <Flex direction="column" gap={2} style={{ minWidth: 0 }}>
        <Txt as="h2" typography="labelMdEmphasized">
          <span id="event-cancel-title">공연 취소</span>
        </Txt>
        <Txt as="p" typography="bodySm">
          {CANCEL_SECTION_NOTICE}
        </Txt>
        <div className={s.textButtonRow}>
          {/* 화면이 직접 그린 빨간 글자 버튼(gui 1912:3126 "공연 취소하기") — 화면대로(R1) */}
          <button type="button" className={s.textButton} onClick={() => setOpen(true)}>
            <Txt typography="labelMdEmphasized" color={colors.textDangerLabel}>
              공연 취소하기
            </Txt>
          </button>
        </div>
      </Flex>
      <ResponsiveOverlay
        open={open}
        onOpenChange={(v) => (v ? setOpen(true) : close())}
        title="공연을 취소할까요?"
        footer={
          <Flex gap={2} fullWidth>
            <Button variant="secondary" size="lg" fullWidth onClick={close}>
              돌아가기
            </Button>
            <Button
              variant="warning"
              size="lg"
              fullWidth
              loading={cancel.pending}
              disabled={!ready}
              onClick={() => void submit()}
            >
              취소하기
            </Button>
          </Flex>
        }
      >
        <Flex direction="column" gap={5} data-testid="event-cancel-overlay">
          <p className={s.warnBox}>
            <Txt typography="bodyMd" color={colors.textDangerLabel}>
              {cancelConfirmNotice(orders)}
            </Txt>
          </p>
          <TextArea
            label="취소 사유"
            required
            placeholder={CANCEL_REASON_PLACEHOLDER}
            value={cancel.reason}
            onChange={(e) => cancel.setReason(e.target.value)}
            maxLength={EVENT_CANCEL_REASON_MAX}
            showCount
            rows={2}
            error={cancel.reasonError ?? undefined}
          />
          <Checkbox
            tone="brand"
            checked={checked}
            onCheckedChange={setChecked}
            label={<Txt typography="labelMd">{CANCEL_CONFIRM_CHECK}</Txt>}
          />
          {cancel.error && (
            <p role="alert">
              <Txt typography="bodySm" color={colors.textDangerLabel}>
                {cancel.error}
              </Txt>
            </p>
          )}
        </Flex>
      </ResponsiveOverlay>
    </section>
  );
}
