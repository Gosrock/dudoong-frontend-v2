'use client';

import type { UseFormRegisterReturn } from 'react-hook-form';

import type { HostContactType } from '@/api/host/schema';
import {
  contactPlaceholder,
  HOST_CONTACT_OPTIONS,
  type HostContactInput,
} from '@/features/hosting/shared/model/host-fields';
import { Dropdown } from '@/ui/components/Dropdown/Dropdown';
import { Input } from '@/ui/components/Input/Input';
import { Icon } from '@/ui/icons/Icon';

const OPTIONS = HOST_CONTACT_OPTIONS.map((o) => ({ value: o.type, label: o.label }));

/**
 * 연락처(호스트) · 문의처(공연) 줄 — 유형 드롭다운 + 값 + ✕. 호스트 만들기 · 간편 공연 만들기 Step1 · 호스트 설정 · 공연 기본 정보가 같이 쓴다.
 * 줄 키는 `useFieldArray`의 `id`, 값 칸은 RHF `register`, 유형은 훅의 `setType`(바뀐 칸 표시까지). 모양(클래스)은 화면마다 다르다
 */
export function ContactRows({
  noun,
  rows,
  values,
  register,
  setType,
  errorOf,
  maxLengthOf,
  canRemove,
  onRemove,
  readOnly = false,
  classes,
}: {
  /** 라벨 이름 — "연락처"(호스트) · "문의처"(공연) */
  noun: '연락처' | '문의처';
  /** `useFieldArray` 줄(키) */
  rows: readonly { id: string }[];
  /** 지금 값(유형별 placeholder · 길이) */
  values: readonly HostContactInput[];
  register: (index: number) => UseFormRegisterReturn;
  setType: (index: number, type: HostContactType) => void;
  /** 보일 칸 오류(언제 보일지는 화면이 정한다) */
  errorOf: (index: number) => string | undefined;
  maxLengthOf: (type: HostContactType | null) => number;
  canRemove: boolean;
  onRemove: (index: number) => void;
  readOnly?: boolean;
  classes: { row: string; type: string; value: string; remove: string };
}) {
  return rows.map((row, i) => {
    const type = values[i]?.type ?? null;
    return (
      <div key={row.id} className={classes.row} data-testid="contact-row">
        <Dropdown
          className={classes.type}
          aria-label={`${noun} 유형 ${i + 1}`}
          placeholder="유형 선택"
          options={OPTIONS}
          disabled={readOnly}
          value={type ?? ''}
          onValueChange={(v) => v && setType(i, v as HostContactType)}
        />
        <Input
          className={classes.value}
          aria-label={`${noun} ${i + 1}`}
          placeholder={contactPlaceholder(type) ?? undefined}
          maxLength={maxLengthOf(type)}
          showCount={false}
          readOnly={readOnly}
          error={errorOf(i)}
          {...register(i)}
        />
        {canRemove && (
          <button
            type="button"
            className={classes.remove}
            aria-label={`${noun} ${i + 1} 삭제`}
            onClick={() => onRemove(i)}
          >
            <Icon name="close" />
          </button>
        )}
      </div>
    );
  });
}
