'use client';

import { useState } from 'react';

import { EVENT_CANCEL_REASON_MAX } from '@/api/event/schema';
import { formatKstDotDateWeekday, formatKstTime } from '@/api/shared/date';
import { NoticeBox } from '@/features/hosting/shared/ui/NoticeBox';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { TextArea } from '@/ui/components/TextArea/TextArea';
import { toast } from '@/ui/components/Toast/Toast';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import {
  CANCEL_EVENT_DONE_TOAST,
  CANCEL_EVENT_NOTICE,
  CANCEL_REASON_HELPER,
  cancelContactMessage,
} from '../model/event-cancel';
import { useEventCancel } from '../model/useEventCancel';
import * as s from './EventCancelSection.css';

type EventCancel = ReturnType<typeof useEventCancel>;

/*
 * 공연 취소 E-11(Api 2.5.8 — 이슈 #136 §7). **디자인 · 와이어 모두 없음**(GUI · 와이어 텍스트 검색 0건, 2026-11-07) — DS 컴포넌트로만
 * 단순하게(design-requests Q122 · Q123). 자리는 공연 대시보드(등록 후) — 공연 하나를 다루는 관리 첫 화면이라.
 */

/** 취소일시 "2026.11.07 (토) 14:30" */
const canceledAtLabel = (at: string) => `${formatKstDotDateWeekday(at)} ${formatKstTime(at)}`;

/**
 * 대시보드 머리 아래 "취소된 공연" 안내(모든 멤버) + 마스터는 결과 · [남은 주문 다시 처리]. 취소 안 된 공연이면 이 화면이 처리한
 * 결과(응답을 못 받은 경우)만. 디자인 없음 — DS 노란 안내 상자(Q122)
 */
export function CanceledEventNotice({ cancel }: { cancel: EventCancel }) {
  if (!cancel.canceled && !cancel.canRetry) return null;
  return (
    <div className={s.canceledBox} data-testid="event-canceled">
      {cancel.canceled && (
        <NoticeBox icon="important">
          <span className={s.noticeText}>
            <Txt typography="labelMdEmphasized">취소된 공연이에요.</Txt>
            {cancel.canceledAt && <> {canceledAtLabel(cancel.canceledAt)}에 취소했어요.</>}
            {cancel.cancelReason && (
              <>
                <br />
                취소 사유: {cancel.cancelReason}
              </>
            )}
          </span>
        </NoticeBox>
      )}
      <CancelProgress cancel={cancel} />
    </div>
  );
}

/**
 * 처리 결과 줄 + 오류 + [남은 주문 다시 처리](마스터) 또는 다시 처리할 수 없는 남은 주문 안내(마스터, Api 2.5.9 `cancelRetryable`
 * false). 안내는 디자인 없음 — 결과 줄과 같은 빨간 글자(Q165 · Q166)
 */
function CancelProgress({ cancel }: { cancel: EventCancel }) {
  const { summary, contactCount } = cancel;
  return (
    <>
      {summary && (
        <Flex direction="column" gap={1} data-testid="event-cancel-result">
          <Txt as="p" typography="bodyMd">
            {summary.processed}
          </Txt>
          {/* 다시 처리할 수 없으면 "[다시 처리]를 눌러 주세요"는 맞지 않다 — 아래 고객센터 안내로 */}
          {summary.leftover && contactCount === null && (
            <Txt as="p" typography="bodyMd" color={colors.textDangerLabel}>
              {summary.leftover}
            </Txt>
          )}
        </Flex>
      )}
      {cancel.error && (
        <p role="alert">
          <Txt typography="bodySm" color={colors.textDangerLabel}>
            {cancel.error}
          </Txt>
        </p>
      )}
      {contactCount !== null && (
        <p data-testid="event-cancel-contact">
          <Txt typography="bodyMd" color={colors.textDangerLabel}>
            {cancelContactMessage(contactCount)}
          </Txt>
        </p>
      )}
      {cancel.canRetry && (
        <div>
          <Button
            variant="secondary"
            size="md"
            loading={cancel.pending}
            disabled={cancel.pending}
            onClick={() => void cancel.retry()}
          >
            남은 주문 다시 처리
          </Button>
        </div>
      )}
    </>
  );
}

/**
 * 대시보드 맨 아래 [공연 취소](마스터 · 시작 전 등록 공연만). 누르면 사유 입력 오버레이(PC 모달 · 모바일 시트 — 뒤로가기로 닫힘).
 * 디자인 없음 — DS `Button` · `ResponsiveOverlay` · `TextArea`(Q123)
 */
export function EventCancelSection({ cancel }: { cancel: EventCancel }) {
  const [open, setOpen] = useState(false);
  // 취소에 성공하면 GE-3이 먼저 바뀌어 `canCancel`이 false가 된다 — 오버레이가 닫힐 때까지는 붙여 둔다(뒤로가기 기록 정리)
  if (!cancel.canCancel && !open) return null;
  const close = () => {
    cancel.setReason('');
    setOpen(false);
  };
  const submit = async () => {
    const outcome = await cancel.cancel();
    if (outcome === 'canceled') toast(CANCEL_EVENT_DONE_TOAST, { id: 'event-canceled' });
    if (outcome) setOpen(false);
  };
  return (
    <section className={s.section} aria-labelledby="event-cancel-title" data-testid="event-cancel">
      <Txt as="h2" typography="labelMdEmphasized">
        <span id="event-cancel-title">공연 취소</span>
      </Txt>
      <Txt as="p" typography="bodySm" color={colors.textSecondary}>
        공연을 취소하면 판매가 멈추고 공연 목록에서 빠져요. {CANCEL_EVENT_NOTICE}
      </Txt>
      <div>
        <Button variant="secondary" size="md" onClick={() => setOpen(true)}>
          공연 취소하기
        </Button>
      </div>
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
              size="lg"
              fullWidth
              loading={cancel.pending}
              disabled={cancel.pending}
              onClick={() => void submit()}
            >
              공연 취소
            </Button>
          </Flex>
        }
      >
        <Flex direction="column" gap={3} data-testid="event-cancel-overlay">
          <NoticeBox icon="important">{CANCEL_EVENT_NOTICE}</NoticeBox>
          <TextArea
            label="취소 사유"
            helper={CANCEL_REASON_HELPER}
            value={cancel.reason}
            onChange={(e) => cancel.setReason(e.target.value)}
            maxLength={EVENT_CANCEL_REASON_MAX}
            showCount
            rows={3}
            error={cancel.reasonError ?? undefined}
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
