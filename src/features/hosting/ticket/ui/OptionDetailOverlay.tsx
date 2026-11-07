'use client';

import { useState } from 'react';

import { NoticeBox } from '@/features/hosting/shared/ui/NoticeBox';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { toast } from '@/ui/components/Toast/Toast';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { OptionFormErrors } from '../model/option-form';
import { useOptionEditor } from '../model/useOptionEditor';
import { confirmDiscard, OPTION_EDITED } from './option-sheet-parts';
import { OptionFields } from './OptionFields';
import * as s from './OptionSheets.css';

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
  const editor = useOptionEditor(eventId, optionId);
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const finish = () => {
    editor.reset();
    setMode('view');
    onClose();
  };
  const requestClose = async () => {
    if (editor.busy) return;
    if (mode === 'edit' && editor.dirty && !(await confirmDiscard('edit'))) return;
    finish();
  };
  const save = async () => {
    if (await editor.save()) {
      toast(OPTION_EDITED);
      finish();
    }
  };
  const remove = async () => {
    const name = editor.option?.name ?? '';
    // 확인 창 계약(patterns §6): 실패(`false`)면 열린 채
    const done = await openConfirm({
      // PC 520(GUI `956:6693` — R1f)
      popupSize: 'lg',
      title: `[${name}] 옵션을 삭제할까요?`,
      description: '이 옵션이 붙은 모든 티켓에서 빠지고, 삭제한 옵션은 되돌릴 수 없어요.',
      confirmLabel: '삭제',
      onConfirm: () => editor.remove(),
    });
    if (done) {
      toast('옵션을 삭제했어요.');
      finish();
    }
  };

  const fields = editor.fields;
  const shown: OptionFormErrors = fields
    ? {
        name: fields.attempted ? fields.errors.name : undefined,
        description:
          fields.serverErrors.description ??
          (fields.attempted ? fields.errors.description : undefined),
        yesAdditionalPrice:
          fields.serverErrors.yesAdditionalPrice ??
          (fields.attempted ? fields.errors.yesAdditionalPrice : undefined),
      }
    : {};
  const editing = mode === 'edit';

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(next) => !next && void requestClose()}
      // PC 모달 520 · 안쪽 24 · 간격 24(GUI 956:* 티켓 옵션 모달, I-h1)
      modalSize="lg"
      sheetVariant="flat"
      title={editing ? '옵션 수정하기' : '옵션 상세'}
      hideTitle={!editing}
      // 상세 머리 한 줄 = [✎ 수정] 왼쪽 + ✕ 오른쪽(GUI `943:2221` · `956:5913` — O5)
      headerStart={
        !editing && fields && !editor.missing && editor.canEdit && allowEdit ? (
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="edit" />}
            onClick={() => setMode('edit')}
          >
            수정
          </Button>
        ) : undefined
      }
      footer={
        editing ? (
          <Button
            size="lg"
            fullWidth
            disabled={!editor.canSave}
            loading={editor.busy}
            onClick={() => void save()}
          >
            저장
          </Button>
        ) : undefined
      }
    >
      {editor.missing ? (
        <Txt as="p" typography="bodyMd" color={colors.textSecondaryLabel}>
          옵션을 찾을 수 없어요
        </Txt>
      ) : fields ? (
        <div className={s.body} data-testid="option-detail">
          {editing && editor.priceLocked && (
            <NoticeBox icon="important">
              판매가 시작돼서 옵션 이름과 설명만 바꿀 수 있어요.
            </NoticeBox>
          )}
          {editor.error && (
            <p role="alert">
              <Txt typography="bodyMd" color={colors.textDangerLabel}>
                {editor.error}
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
              values={fields.values}
              errors={editing ? shown : {}}
              readOnly={!editing}
              typeOverride={editor.type}
              setName={editing ? fields.set.name : undefined}
              setDescription={editing ? fields.set.description : undefined}
              setPrice={editing && !editor.priceLocked ? fields.set.yesAdditionalPrice : undefined}
              dimLocked={editing && editor.priceLocked}
            />
          </form>
          {!editing && editor.canDelete && allowEdit && (
            <Flex justify="center">
              <Button
                variant="secondary"
                size="sm"
                disabled={editor.busy}
                onClick={() => void remove()}
              >
                옵션 삭제
              </Button>
            </Flex>
          )}
        </div>
      ) : null}
    </ResponsiveOverlay>
  );
}
