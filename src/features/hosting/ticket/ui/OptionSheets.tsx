'use client';

import { useState } from 'react';

import { OPTION_DESCRIPTION_MAX, OPTION_NAME_MAX } from '@/api/option/schema';
import type { TicketOptionType } from '@/api/ticket-item/schema';
import { FieldError, FormSection } from '@/features/hosting/event/ui/EditorParts';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { Checkbox } from '@/ui/components/Checkbox/Checkbox';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { Input } from '@/ui/components/Input/Input';
import { Radio, RadioGroup } from '@/ui/components/Radio/Radio';
import { toast } from '@/ui/components/Toast/Toast';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { OptionFormErrors, OptionFormValues } from '../model/option-form';
import { useOptionEditor } from '../model/useOptionEditor';
import { useTicketOptions } from '../model/useTicketOptions';
import * as s from './OptionSheets.css';
import { NoticeBox, OptionChips, ToggleSection } from './TicketParts';
import { dimmed as partsDimmed } from './TicketParts.css';

/** 옵션 추가·수정 완료 토스트(GUI `940:12677` · `940:12844`) */
const ADDED = '옵션을 추가했어요.';
const EDITED = '옵션을 수정했어요.';

/** 닫기 확인(GUI `940:8060` · `944:2455`, DS 다이얼로그) — `true`면 닫는다 */
const confirmDiscard = async (kind: 'create' | 'edit') =>
  !(await openConfirm(
    kind === 'create'
      ? {
          title: '옵션 만들기를 그만둘까요?',
          description: '지금 닫으면 입력한 내용은 저장되지 않아요.',
          confirmLabel: '계속 수정하기',
          cancelLabel: '닫기',
        }
      : {
          title: '수정을 그만둘까요?',
          description: '지금 닫으면 수정한 내용이 저장되지 않아요.',
          confirmLabel: '계속 수정하기',
          cancelLabel: '닫기',
        },
  ));

// FIGMA-CUSTOM: 옵션 시트(gui 931:1291 "바텀시트_티켓 옵션 추가" · PC 956:3281) 직접 그린 시트 → DS ResponsiveOverlay(BottomSheet · Modal). Figma 코멘트 2026-11-01
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
  const o = useTicketOptions(eventId, ticketItemId);
  const [view, setView] = useState<'pick' | 'create'>('pick');
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const finish = () => {
    setPicked([]);
    setView('pick');
    o.resetForm();
    o.dismissError();
    onClose();
  };
  const requestClose = async () => {
    if (busy) return;
    if (view === 'create' && o.dirty && !(await confirmDiscard('create'))) return;
    finish();
  };

  const attachedIds = new Set(o.attached.map((a) => a.optionId));
  const full = picked.length >= o.remainingSlots;
  const toggle = (id: number) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const addPicked = async () => {
    setBusy(true);
    const ok = await o.attachMany(picked);
    setBusy(false);
    if (ok) {
      toast(ADDED);
      finish();
    }
  };
  const create = async () => {
    setBusy(true);
    const result = await o.createAndAttach();
    setBusy(false);
    if (result === 'attached') {
      toast(ADDED);
      finish();
    }
  };

  const createErrors = o.attempted ? o.errors : {};
  const shownErrors: OptionFormErrors = {
    name: createErrors.name,
    description: o.serverErrors.description ?? createErrors.description,
    yesAdditionalPrice: o.serverErrors.yesAdditionalPrice ?? createErrors.yesAdditionalPrice,
  };
  const freeTicket = o.ticket?.payType === 'FREE';

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(next) => !next && void requestClose()}
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
            disabled={picked.length === 0 || !o.canChange}
            loading={busy}
            onClick={() => void addPicked()}
          >
            {picked.length > 0 ? `${picked.length}개 추가하기` : '추가하기'}
          </Button>
        ) : (
          <Button
            size="lg"
            fullWidth
            disabled={!o.canChange || !o.canAttachMore}
            loading={busy}
            onClick={() => void create()}
          >
            옵션 추가하기
          </Button>
        )
      }
    >
      {o.error && (
        <p role="alert">
          <Txt typography="bodyMd" color={colors.textDangerLabel}>
            {o.error}
          </Txt>
          {o.partial && (
            <>
              {' '}
              <Button variant="secondary" size="sm" onClick={() => void o.retryAttach()}>
                다시 붙이기
              </Button>
            </>
          )}
        </p>
      )}
      {view === 'pick' ? (
        <div className={s.body} data-testid="option-pick">
          {o.poolStatus === 'error' ? (
            <Txt as="p" typography="bodyMd" color={colors.textSecondaryLabel}>
              옵션을 불러오지 못했어요{' '}
              <Button variant="secondary" size="sm" onClick={o.retryPool}>
                다시 시도
              </Button>
            </Txt>
          ) : (
            <ul className={s.pickList} aria-label="옵션 목록">
              {o.attached.map((a) => (
                <PickItem
                  key={a.optionId}
                  name={a.name ?? '이름 없는 옵션'}
                  type={a.type}
                  yesAdditionalPrice={a.yesAdditionalPrice}
                  checked
                  attached
                />
              ))}
              {o.attachable
                .filter((p) => !attachedIds.has(p.optionId))
                .map((p) => {
                  const checked = picked.includes(p.optionId);
                  return (
                    <PickItem
                      key={p.optionId}
                      name={p.name ?? '이름 없는 옵션'}
                      type={p.type}
                      yesAdditionalPrice={p.yesAdditionalPrice}
                      checked={checked}
                      disabled={!o.canChange || (!checked && full)}
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
            disabled={!o.canChange || !o.canAttachMore}
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
            values={o.values}
            errors={shownErrors}
            setName={o.setName}
            setDescription={o.setDescription}
            setType={o.setType}
            setPrice={o.setYesAdditionalPrice}
            priceDisabled={freeTicket}
          />
        </form>
      )}
    </ResponsiveOverlay>
  );
}

// FIGMA-CUSTOM: 옵션 고르기 항목(gui 931:1323 "옵션 선택 항목" 로컬 컴포넌트) 커스텀 → 커스텀 OptionSheets.css.ts. DS 후보(design-system §3)
function PickItem({
  name,
  type,
  yesAdditionalPrice,
  checked,
  attached,
  disabled,
  onToggle,
}: {
  name: string;
  type: TicketOptionType | null;
  yesAdditionalPrice: number | null;
  checked: boolean;
  attached?: boolean;
  disabled?: boolean;
  onToggle?: () => void;
}) {
  return (
    <li>
      <label
        className={s.pickItem}
        data-selected={checked ? 'true' : undefined}
        data-attached={attached ? 'true' : undefined}
        data-disabled={attached || disabled ? 'true' : undefined}
      >
        <Checkbox
          shape="square"
          aria-label={attached ? `${name}(이미 추가됨)` : name}
          checked={checked}
          disabled={attached || disabled}
          onCheckedChange={() => onToggle?.()}
        />
        <span className={s.pickText}>
          <Txt typography="bodyMd">{name}</Txt>
          <OptionChips type={type} yesAdditionalPrice={yesAdditionalPrice} />
        </span>
      </label>
    </li>
  );
}

/**
 * 옵션 칸(새 옵션 `932:1544` · 수정 `933:1822` · 상세 `943:2200`) — 이름 20 · 설명 50 · 응답 형식 · '네' 가격 토글 + 금액.
 * `readOnly`면 상세 보기(칸 비활성). 형식은 만들 때만 고른다(`setType` 없으면 비활성).
 */
function OptionFields({
  values,
  errors,
  setName,
  setDescription,
  setType,
  setPrice,
  readOnly = false,
  priceDisabled = false,
  typeOverride,
  dimLocked = false,
}: {
  values: OptionFormValues;
  errors: OptionFormErrors;
  setName?: (v: string) => void;
  setDescription?: (v: string) => void;
  setType?: (v: OptionFormValues['type']) => void;
  setPrice?: (v: string) => void;
  readOnly?: boolean;
  priceDisabled?: boolean;
  /** 서버 형식(객관식 v1 옵션 등) — 상세·수정에서 보여 주기만 */
  typeOverride?: TicketOptionType | null;
  /** 수정 중 잠긴 칸(형식·가격)을 흐리게(GUI `933:2015`) */
  dimLocked?: boolean;
}) {
  const dimmedPrice = dimLocked;
  const type = typeOverride ?? values.type;
  const [priceOn, setPriceOn] = useState(
    () => values.yesAdditionalPrice.trim() !== '' && values.yesAdditionalPrice !== '0',
  );
  const showPriceInput =
    priceOn || (readOnly && values.yesAdditionalPrice !== '' && values.yesAdditionalPrice !== '0');
  const priceLocked = readOnly || priceDisabled || !setPrice;
  return (
    <div>
      <FormSection
        title="옵션 이름"
        required={!readOnly}
        description={readOnly ? undefined : '관객에게 보여줄 질문이나 항목 이름을 써 주세요.'}
      >
        <Input
          aria-label="옵션 이름"
          placeholder="예) 좋은 자리 선점"
          maxLength={OPTION_NAME_MAX}
          showCount={!readOnly}
          value={values.name}
          disabled={readOnly || !setName}
          onChange={(e) => setName?.(e.target.value)}
          error={errors.name}
        />
      </FormSection>
      <FormSection
        title="옵션 설명"
        required={!readOnly}
        description={readOnly ? undefined : '옵션에 대한 추가 정보를 써 주세요.'}
      >
        <Input
          aria-label="옵션 설명"
          placeholder="예) 무대와 가까운 자리를 먼저 배정해 드려요."
          maxLength={OPTION_DESCRIPTION_MAX}
          showCount={!readOnly}
          value={values.description}
          disabled={readOnly || !setDescription}
          onChange={(e) => setDescription?.(e.target.value)}
          error={errors.description}
        />
      </FormSection>
      <div className={dimLocked ? partsDimmed : undefined}>
        <FormSection title="옵션 응답 형식">
          {type === 'MULTIPLE_CHOICE' ? (
            <Txt as="p" typography="bodyLg">
              객관식(이전 버전 옵션)
            </Txt>
          ) : (
            <RadioGroup
              aria-label="옵션 응답 형식"
              className={s.radios}
              value={type ?? 'SUBJECTIVE'}
              disabled={readOnly || !setType}
              onValueChange={(v) => setType?.(v as OptionFormValues['type'])}
            >
              <Radio value="SUBJECTIVE" label="주관식" />
              <Radio value="YES_NO" label="네/아니오" />
            </RadioGroup>
          )}
        </FormSection>
      </div>
      {type === 'YES_NO' && (
        <ToggleSection
          title="'네' 선택 시 가격 추가하기"
          description="'네'를 고른 관객에게 금액이 더해져요."
          checked={showPriceInput}
          disabled={priceLocked}
          dimmed={dimmedPrice}
          onCheckedChange={(on) => {
            setPriceOn(on);
            if (!on) setPrice?.('');
          }}
        >
          {showPriceInput && (
            <Input
              aria-label="'네' 추가 금액"
              className={s.price}
              inputMode="numeric"
              placeholder="1,000"
              trailing="원"
              value={values.yesAdditionalPrice}
              disabled={priceLocked}
              onChange={(e) => setPrice?.(e.target.value.replace(/[^\d]/g, ''))}
              error={errors.yesAdditionalPrice}
            />
          )}
          {!showPriceInput && <FieldError>{errors.yesAdditionalPrice}</FieldError>}
        </ToggleSection>
      )}
    </div>
  );
}

/**
 * 옵션 상세 보기 · 수정 — GUI 상세 `943:2200`(수정 가능 — [✎ 수정]) · `943:2398`(판매 종료 — [수정] 없음), 수정 `933:1822`(기본) ·
 * `933:2015`(판매 발생 — 이름·설명만 + 안내), 닫기 확인 `944:2455`, 완료 토스트 `940:12844`. PC `956:5804`~`956:6587`.
 * 형식은 늘 읽기 전용(서버가 막는다). 옵션 자체 삭제는 GUI에 없어 상세 하단 [옵션 삭제](plan P12 기본안 — 잠긴 옵션이면 없음).
 */
export function OptionDetailOverlay({
  eventId,
  optionId,
  open,
  onClose,
  allowEdit,
}: {
  eventId: string;
  optionId: number;
  open: boolean;
  onClose: () => void;
  /** 이 카드에서 [수정]을 보일지(판매 종료 티켓이면 false — GUI `943:2398`) */
  allowEdit: boolean;
}) {
  const e = useOptionEditor(eventId, optionId);
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const finish = () => {
    e.reset();
    setMode('view');
    onClose();
  };
  const requestClose = async () => {
    if (e.busy) return;
    if (mode === 'edit' && e.dirty && !(await confirmDiscard('edit'))) return;
    finish();
  };
  const save = async () => {
    if (await e.save()) {
      toast(EDITED);
      finish();
    }
  };
  const remove = async () => {
    const name = e.option?.name ?? '';
    const ok = await openConfirm({
      title: `[${name}] 옵션을 삭제할까요?`,
      description: '이 옵션이 붙은 모든 티켓에서 빠지고, 삭제한 옵션은 되돌릴 수 없어요.',
      confirmLabel: '삭제',
    });
    if (ok && (await e.remove())) {
      toast('옵션을 삭제했어요.');
      finish();
    }
  };

  const shown: OptionFormErrors = {
    name: e.attempted ? e.errors.name : undefined,
    description: e.serverErrors.description ?? (e.attempted ? e.errors.description : undefined),
    yesAdditionalPrice:
      e.serverErrors.yesAdditionalPrice ?? (e.attempted ? e.errors.yesAdditionalPrice : undefined),
  };
  const editing = mode === 'edit';

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(next) => !next && void requestClose()}
      title={editing ? '옵션 수정하기' : '옵션 상세'}
      hideTitle={!editing}
      footer={
        editing ? (
          <Button
            size="lg"
            fullWidth
            disabled={!e.canSave}
            loading={e.busy}
            onClick={() => void save()}
          >
            저장
          </Button>
        ) : undefined
      }
    >
      {e.missing ? (
        <Txt as="p" typography="bodyMd" color={colors.textSecondaryLabel}>
          옵션을 찾을 수 없어요
        </Txt>
      ) : e.values ? (
        <div className={s.body} data-testid="option-detail">
          {!editing && e.canEdit && allowEdit && (
            <div className={s.detailTop}>
              <Button
                variant="secondary"
                size="sm"
                icon={<Icon name="edit" />}
                onClick={() => setMode('edit')}
              >
                수정
              </Button>
            </div>
          )}
          {editing && e.priceLocked && (
            <NoticeBox icon="important">
              판매가 시작돼서 옵션 이름과 설명만 바꿀 수 있어요.
            </NoticeBox>
          )}
          {e.error && (
            <p role="alert">
              <Txt typography="bodyMd" color={colors.textDangerLabel}>
                {e.error}
              </Txt>
            </p>
          )}
          <form
            noValidate
            aria-label="옵션 수정"
            onSubmit={(ev) => {
              ev.preventDefault();
              void save();
            }}
          >
            <OptionFields
              key={mode}
              values={e.values}
              errors={editing ? shown : {}}
              readOnly={!editing}
              typeOverride={e.type}
              setName={editing ? e.setName : undefined}
              setDescription={editing ? e.setDescription : undefined}
              setPrice={editing && !e.priceLocked ? e.setYesAdditionalPrice : undefined}
              dimLocked={editing && e.priceLocked}
            />
          </form>
          {!editing && e.canDelete && allowEdit && (
            <div className={s.deleteRow}>
              <Button variant="secondary" size="sm" disabled={e.busy} onClick={() => void remove()}>
                옵션 삭제
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </ResponsiveOverlay>
  );
}
