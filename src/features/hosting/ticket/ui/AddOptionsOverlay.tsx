'use client';

import { useState } from 'react';

import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { toast } from '@/ui/components/Toast/Toast';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { OptionFormErrors } from '../model/option-form';
import { useTicketOptions } from '../model/useTicketOptions';
import { confirmDiscard, OPTION_ADDED } from './option-sheet-parts';
import { OptionFields } from './OptionFields';
import { OptionPickItem } from './OptionPickItem';
import * as s from './OptionSheets.css';

// FIGMA-CUSTOM: 옵션 시트(gui 931:1314 "바텀시트_티켓 옵션 추가" · PC 956:3281) Figma대로 — ResponsiveOverlay(시트 flat · Modal lg),
// 설명 Label/sm 보조색 · 제목 아래 8, 목록 → [새 옵션 직접 만들기] 8(2026-11-08 fm-ds-overlays O4 · O6~O11 · O14 · O24). Figma 코멘트 2026-11-01 · 고침 2026-11-08
/**
 * 티켓 옵션 추가 시트 — GUI `931:1291` 기본 · `931:1356` 선택됨("n개 추가하기") · `940:13011` 이미 추가된 경우, PC `956:3281`·`956:3403`·`956:3525`(#50).
 * [새 옵션 직접 만들기]는 같은 시트 안에서 만들기 화면으로(`932:1544` 주관식 · `932:1621` 네/아니오 + 가격, #51) — 만들면 생성 + 지정 두 번 호출(L).
 * 무료 티켓에는 유료 옵션을 목록에서 뺀다(L `attachable`).
 */
export function AddOptionsOverlay({
  eventId,
  ticketItemId,
  open,
  onClose,
}: {
  eventId: string;
  ticketItemId: number;
  open: boolean;
  onClose: () => void;
}) {
  const options = useTicketOptions(eventId, ticketItemId);
  const form = options.newOption;
  const [view, setView] = useState<'pick' | 'create'>('pick');
  const [picked, setPicked] = useState<number[]>([]);
  // 붙이기·만들기 중(훅의 mutation `isPending` — throw해도 굳지 않는다, 코드 패턴 점검 A13)
  const busy = options.pending;

  const finish = () => {
    setPicked([]);
    setView('pick');
    form.reset();
    options.dismissError();
    onClose();
  };
  const requestClose = async () => {
    if (busy) return;
    if (view === 'create' && form.dirty && !(await confirmDiscard('create'))) return;
    finish();
  };

  const attachedIds = new Set(options.attached.map((a) => a.optionId));
  const full = picked.length >= options.remainingSlots;
  const toggle = (id: number) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const addPicked = async () => {
    if (await options.attachMany(picked)) {
      toast(OPTION_ADDED);
      finish();
    }
  };
  const create = async () => {
    if ((await options.createAndAttach()) === 'attached') {
      toast(OPTION_ADDED);
      finish();
    }
  };

  const createErrors = form.attempted ? form.errors : {};
  const shownErrors: OptionFormErrors = {
    name: createErrors.name,
    description: form.serverErrors.description ?? createErrors.description,
    yesAdditionalPrice: form.serverErrors.yesAdditionalPrice ?? createErrors.yesAdditionalPrice,
  };
  const freeTicket = options.ticket?.payType === 'FREE';

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(next) => !next && void requestClose()}
      // PC 모달 520 · 안쪽 24 · 간격 24(GUI 956:* 티켓 옵션 모달, I-h1)
      modalSize="lg"
      sheetVariant="flat"
      descriptionStyle="caption"
      title={
        view === 'pick' ? (
          '티켓 옵션 추가하기'
        ) : (
          <span className={s.titleRow}>
            <button
              type="button"
              className={s.backButton}
              aria-label="옵션 고르기로 돌아가기"
              onClick={() => setView('pick')}
            >
              <Icon name="chevron-left" />
            </button>
            새 옵션 직접 만들기
          </span>
        )
      }
      description={view === 'pick' ? '추가할 옵션을 선택해 주세요.' : undefined}
      footer={
        view === 'pick' ? (
          <Button
            size="lg"
            fullWidth
            disabled={picked.length === 0 || !options.canChange}
            loading={busy}
            onClick={() => void addPicked()}
          >
            {picked.length > 0 ? `${picked.length}개 추가하기` : '추가하기'}
          </Button>
        ) : (
          <Button
            size="lg"
            fullWidth
            // 이름 · 설명이 비면 비활성(GUI `932:1544` · `956:3753`, Figma 전수조사 2026-11-07). 그 밖의 칸 오류는 눌러서 보인다
            disabled={
              !options.canChange ||
              !options.canAttachMore ||
              !form.values.name.trim() ||
              !form.values.description.trim()
            }
            loading={busy}
            onClick={() => void create()}
          >
            옵션 추가하기
          </Button>
        )
      }
    >
      {options.error && (
        <p role="alert">
          <Txt typography="bodyMd" color={colors.textDangerLabel}>
            {options.error}
          </Txt>
          {options.partial && (
            <>
              {' '}
              <Button variant="secondary" size="sm" onClick={() => void options.retryAttach()}>
                다시 붙이기
              </Button>
            </>
          )}
        </p>
      )}
      {view === 'pick' ? (
        <div className={s.pickBody} data-testid="option-pick">
          {options.poolStatus === 'error' ? (
            <InlineError
              layout="row"
              message="옵션을 불러오지 못했어요"
              onRetry={options.retryPool}
            />
          ) : (
            <ul className={s.pickList} aria-label="옵션 목록">
              {options.attached.map((a) => (
                <OptionPickItem
                  key={a.optionId}
                  name={a.name ?? '이름 없는 옵션'}
                  type={a.type}
                  yesAdditionalPrice={a.yesAdditionalPrice}
                  checked
                  attached
                />
              ))}
              {options.attachable
                .filter((p) => !attachedIds.has(p.optionId))
                .map((p) => {
                  const checked = picked.includes(p.optionId);
                  return (
                    <OptionPickItem
                      key={p.optionId}
                      name={p.name ?? '이름 없는 옵션'}
                      type={p.type}
                      yesAdditionalPrice={p.yesAdditionalPrice}
                      checked={checked}
                      disabled={!options.canChange || (!checked && full)}
                      onToggle={() => toggle(p.optionId)}
                    />
                  );
                })}
            </ul>
          )}
          <Button
            variant="secondary"
            fullWidth
            icon={<Icon name="add" />}
            disabled={!options.canChange || !options.canAttachMore}
            onClick={() => setView('create')}
          >
            새 옵션 직접 만들기
          </Button>
        </div>
      ) : (
        <form
          noValidate
          aria-label="새 옵션"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <OptionFields
            values={form.values}
            errors={shownErrors}
            setName={form.set.name}
            setDescription={form.set.description}
            setType={form.set.type}
            setPrice={form.set.yesAdditionalPrice}
            priceDisabled={freeTicket}
          />
        </form>
      )}
    </ResponsiveOverlay>
  );
}
