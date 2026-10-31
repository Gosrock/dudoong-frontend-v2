'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/ui/components/Button/Button';
import { Chip, type ChipColor } from '@/ui/components/Chip/Chip';
import { DropdownMenu } from '@/ui/components/DropdownMenu/DropdownMenu';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { toast } from '@/ui/components/Toast/Toast';
import { Icon } from '@/ui/icons/Icon';

import type { TicketSaleChip } from '../model/ticket-rules';
import type { TicketCard as Card } from '../model/useTicketList';
import { useTicketOptions } from '../model/useTicketOptions';
import { AddOptionsOverlay, OptionDetailOverlay } from './OptionSheets';
import * as s from './TicketCard.css';
import { OptionRow } from './TicketParts';

/** 판매 상태 칩 색(GUI tag_v2 round border — 판매 중 green · 판매 예정 cyan · 판매 종료 grey). 판매 중단은 GUI에 없어 red(🤖) */
const CHIP_COLOR: Record<TicketSaleChip, ChipColor> = {
  onSale: 'green',
  upcoming: 'cyan',
  ended: 'grey',
  suspended: 'red',
};

/** `yyyy.MM.dd HH:mm` → `yy.MM.dd HH:mm`(GUI "26.10.28 12:00 ~ 26.11.08 23:59") */
const short = (v: string) => v.slice(2);

/** 판매 기간 줄. 둘 다 없으면(등록 즉시 ~ 공연 시작까지) 줄을 두지 않는다(🤖) */
export function salePeriodText(start: string | null, end: string | null) {
  if (start === null && end === null) return null;
  return `${start ? short(start) : '등록 즉시'} ~ ${end ? short(end) : '공연 시작까지'}`;
}

/** 재고 칩 — "무제한 (공개)" · 수량이면 "남은/전체매 (공개)"(🤖 GUI는 무제한만) */
export function stockText(t: Card['ticket']) {
  const open = t.isQuantityPublic ? '공개' : '비공개';
  return t.supplyCount === null
    ? `무제한 (${open})`
    : `${(t.remaining ?? 0).toLocaleString('ko-KR')}/${t.supplyCount.toLocaleString('ko-KR')}매 (${open})`;
}

// FIGMA-CUSTOM: 티켓 카드(gui 910:3335 "티켓 행_모바일" · 910:3433 "티켓 행_데스크탑" 로컬 컴포넌트) 커스텀 → 커스텀 TicketCard.css.ts. DS 후보(design-system §3)
/**
 * 티켓 카드 — GUI `767:50048`·`913:949`(모바일) · `767:46943`·`955:2980`(PC). 이름 + 판매 상태 칩, 설명, "인당 n매 제한 / 호스트 승인 후 확정",
 * 판매 기간 | 가격 + 재고 칩, ⋮ 메뉴(수정·삭제·판매 중단·재개 — L), 붙은 옵션 행, [티켓 옵션 추가].
 * #46: 판매가 일어난(잠긴) 티켓과 판매 종료 티켓에는 [티켓 옵션 추가]가 없다. #48: 바꿀 수 있는 티켓의 옵션은 ✕(이 티켓에서 빼기), 아니면 ›(상세)
 */
export function TicketCard({
  eventId,
  card,
  pending,
  onAction,
}: {
  eventId: string;
  card: Card;
  /** 다른 동작이 도는 중 */
  pending: boolean;
  onAction: (action: 'delete' | 'suspend' | 'resume') => Promise<boolean>;
}) {
  const router = useRouter();
  const t = card.ticket;
  const name = t.name ?? '이름 없는 티켓';
  const [adding, setAdding] = useState(false);
  // 상세는 닫힌 뒤에도 잠깐 그 옵션을 그린다(닫히는 전환)
  const [detail, setDetail] = useState<{ id: number; open: boolean } | null>(null);
  const options = useTicketOptions(eventId, t.ticketItemId);
  const changeable = card.canManageOptions && card.chip !== 'ended';
  const period = salePeriodText(t.saleStartAt, t.saleEndAt);
  const meta = [
    t.purchaseLimit !== null ? `인당 ${t.purchaseLimit}매 제한` : null,
    t.approvalRequired ? '호스트 승인 후 확정' : null,
  ].filter(Boolean);

  /** 확인 창 · 완료 토스트 — GUI #55 `958:20537`·`958:20680`, #56 `958:20860`·`958:20841`, #57 `958:21375`·`958:21517` */
  const confirmThen = async (action: 'delete' | 'suspend' | 'resume') => {
    const ok = await openConfirm(
      action === 'delete'
        ? {
            title: `[${name}] 티켓을 삭제할까요?`,
            description: '삭제한 티켓은 복구할 수 없어요.',
            confirmLabel: '삭제',
          }
        : action === 'suspend'
          ? {
              title: `[${name}] 티켓의 판매를 중단할까요?`,
              description: '추후 다시 판매를 재개할 수 있어요.',
              confirmLabel: '중단',
            }
          : { title: `[${name}] 티켓을 다시 판매할까요?`, confirmLabel: '확인' },
    );
    if (!ok || !(await onAction(action))) return;
    toast(
      action === 'delete'
        ? '티켓을 삭제했어요.'
        : action === 'suspend'
          ? '티켓의 판매를 중단했어요.'
          : '티켓을 다시 판매하기 시작했어요.',
    );
  };

  /** 옵션 ✕ — 이 티켓에서 빼기(L detach). 확인 창 · 토스트는 GUI #54 `934:2034`·`934:2127` 문구 그대로 */
  const detachOption = async (optionId: number) => {
    const ok = await openConfirm({
      title: '티켓 옵션을 삭제할까요?',
      description: '삭제한 옵션은 되돌릴 수 없어요.',
      confirmLabel: '삭제',
    });
    if (ok && (await options.detach(optionId))) toast('옵션을 삭제했어요.');
  };

  return (
    <li className={s.card} data-testid="ticket-card" data-locked={card.locked}>
      <div className={s.top}>
        <div className={s.info}>
          <div className={s.nameRow}>
            <h2 className={s.name}>{name}</h2>
            <span data-testid="ticket-chip">
              <Chip shape="round" theme="border" color={CHIP_COLOR[card.chip]} className={s.chipLg}>
                {card.chipLabel}
              </Chip>
            </span>
          </div>
          {t.description && <p className={s.line}>{t.description}</p>}
          {meta.length > 0 && <p className={s.line}>{meta.join(' / ')}</p>}
          {period && (
            <p className={s.line} data-testid="ticket-period">
              {period}
            </p>
          )}
        </div>
        <div className={s.side}>
          <p className={s.price}>
            {t.payType === 'FREE' ? '무료' : `${t.price.toLocaleString('ko-KR')}원`}
          </p>
          <span data-testid="ticket-stock">
            <Chip className={s.chipLg}>{stockText(t)}</Chip>
          </span>
        </div>
      </div>
      {card.menu.length > 0 && (
        <DropdownMenu
          trigger={
            <button
              type="button"
              className={s.menuButton}
              aria-label={`${name} 메뉴`}
              disabled={pending}
            >
              <Icon name="more" size={16} />
            </button>
          }
          items={card.menu.map((m) => ({
            label: m.label,
            onSelect: () =>
              m.action === 'edit' ? router.push(card.editHref) : void confirmThen(m.action),
          }))}
        />
      )}
      {t.options.length > 0 && (
        <ul className={s.options} aria-label={`${name} 옵션`}>
          {t.options.map((o) => (
            <li key={o.optionId}>
              <OptionRow
                name={o.name ?? '이름 없는 옵션'}
                type={o.type}
                yesAdditionalPrice={o.yesAdditionalPrice}
                onOpen={() => setDetail({ id: o.optionId, open: true })}
                onDetach={changeable ? () => void detachOption(o.optionId) : undefined}
                detachDisabled={options.pending}
              />
            </li>
          ))}
        </ul>
      )}
      {changeable && (
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          className={s.addOption}
          onClick={() => setAdding(true)}
        >
          티켓 옵션 추가
        </Button>
      )}
      {options.error && !adding && (
        <p role="alert" className={s.line}>
          {options.error}
        </p>
      )}
      {changeable && (
        <AddOptionsOverlay
          eventId={eventId}
          ticketItemId={t.ticketItemId}
          open={adding}
          onClose={() => setAdding(false)}
        />
      )}
      {detail && (
        <OptionDetailOverlay
          key={detail.id}
          eventId={eventId}
          optionId={detail.id}
          open={detail.open}
          allowEdit={card.chip !== 'ended'}
          onClose={() => setDetail({ ...detail, open: false })}
        />
      )}
    </li>
  );
}
