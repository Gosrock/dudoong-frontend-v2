'use client';

import { useRef } from 'react';
import type { UseFormRegister } from 'react-hook-form';

import { EVENT_CONTACT_VALUE_MAX, EVENT_TAGS_MAX } from '@/api/event/schema';
import type { HostContactInput } from '@/features/hosting/shared/model/host-fields';
import { ContactRows } from '@/features/hosting/shared/ui/ContactRows';
import { FieldError, FormSection } from '@/features/hosting/shared/ui/EditorParts';
import { Button } from '@/ui/components/Button/Button';
import { DatePicker } from '@/ui/components/DatePicker/DatePicker';
import { Input } from '@/ui/components/Input/Input';
import { Radio, RadioGroup } from '@/ui/components/Radio/Radio';
import { TagButtonGroup } from '@/ui/components/TagButton/TagButton';
import { TimePicker } from '@/ui/components/TimePicker/TimePicker';
import { Icon } from '@/ui/icons/Icon';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { BasicInfoValues } from '../model/basic-info-form';
import type { useEventBasicInfo } from '../model/useEventBasicInfo';
import * as s from './BasicInfoSections.css';
import { KakaoMapPreview, openAddressSearch } from './PlaceParts';

/**
 * 기본 정보(`EventInfoView`)의 칸 묶음들. 묶음마다 훅 결과에서 자기 몫만 받는다(코드 패턴 점검 A24 · A25).
 * 글자 칸은 RHF `register` + `readOnly`, 그 밖은 훅의 동작(읽기 전용이면 훅이 무시한다).
 */
type BasicInfo = ReturnType<typeof useEventBasicInfo>;
type Register = UseFormRegister<BasicInfoValues>;
/** 보일 칸 오류(언제 보일지는 화면이 `attempted`로 정한다) */
type Show = (error: string | null | undefined) => string | undefined;

/**
 * 포스터 — 제목 + 안내 + 포스터(모바일 180×255 · PC 270×381, 모서리 8) + [이미지 업로드]/[이미지 수정](Secondary medium, `image-add`).
 * 업로드는 PE-10 발급 → S3 → key(L). 형식 검사는 서버 발급 단계(`UPLOAD_INVALID_EXTENSION`)
 */
export function PosterSection({
  poster,
  readOnly,
}: {
  poster: BasicInfo['poster'];
  readOnly: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={s.posterColumn} data-testid="poster">
      <FormSection
        loose
        title="공연 포스터"
        description={
          '포스터 이미지는 표준 종이규격 (A,B)에 최적화되어 있어요.\n사진형식은 JPG, JPEG, PNG만 가능해요.'
        }
      >
        <div className={s.posterBody}>
          {poster.url ? (
            // 올린 포스터 미리보기(서버·S3 주소 그대로 — v1 #378 `/_next/image` 차단)
            // eslint-disable-next-line @next/next/no-img-element
            <img className={s.poster} src={poster.url} alt="포스터 미리보기" />
          ) : (
            <Illustration name="poster-placeholder" width={180} className={s.poster} />
          )}
          {!readOnly && (
            <>
              <input
                ref={input}
                type="file"
                accept="image/jpeg,image/png"
                aria-label="포스터 올리기"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void poster.change(file);
                }}
              />
              <Button
                variant="secondary"
                className={s.posterButton}
                icon={<Icon name="image-add" />}
                loading={poster.uploading}
                onClick={() => input.current?.click()}
              >
                {poster.url ? '이미지 수정' : '이미지 업로드'}
              </Button>
            </>
          )}
          {poster.error && (
            <div role="alert">
              <Flex gap={2} align="center" wrap>
                <Txt typography="bodySm" color={colors.textDangerLabel}>
                  {poster.error}
                </Txt>
                {!readOnly && (
                  <Button variant="secondary" size="sm" onClick={poster.retry}>
                    다시 시도
                  </Button>
                )}
              </Flex>
            </div>
          )}
        </div>
      </FormSection>
    </div>
  );
}

/** 일정 — 날짜 1칸 + 시작 ~ 종료. 종료 ≤ 시작이면 다음 날 안내 */
export function ScheduleSection({
  register,
  schedule,
  error,
  serverError,
  readOnly,
}: {
  register: Register;
  schedule: BasicInfo['schedule'];
  error: string | undefined;
  serverError: string | undefined;
  readOnly: boolean;
}) {
  return (
    <FormSection title="공연 일정" required>
      <div className={s.schedule}>
        <DatePicker
          aria-label="날짜"
          className={s.date}
          placeholder="날짜 선택"
          readOnly={readOnly}
          {...register('schedule.date')}
        />
        <div className={s.times}>
          <TimePicker
            aria-label="시작 시각"
            className={s.time}
            placeholder="시작 시간"
            readOnly={readOnly}
            {...register('schedule.startTime')}
          />
          <Txt typography="bodyLg" aria-hidden className={s.tilde}>
            ~
          </Txt>
          <TimePicker
            aria-label="종료 시각"
            className={s.time}
            placeholder="종료 시간"
            readOnly={readOnly}
            {...register('schedule.endTime')}
          />
        </div>
      </div>
      {schedule.range?.overnight && (
        <p data-testid="overnight" className={s.note}>
          <Txt typography="bodySm" color={colors.textSecondaryLabel}>
            종료 시각이 시작보다 빨라 다음 날 끝나는 공연으로 저장돼요.
          </Txt>
        </p>
      )}
      <FieldError>{error ?? serverError}</FieldError>
    </FormSection>
  );
}

/** 장소 — 주소(검색 칸 → 우편번호 창) · 공연장 이름 · 상세주소(PC는 둘이 한 줄) · 지도 미리보기 */
export function PlaceSection({
  register,
  value,
  place,
  error,
  readOnly,
}: {
  register: Register;
  value: BasicInfoValues['place'];
  place: BasicInfo['place'];
  /** 칸 오류(좌표 찾기 실패 안내가 이미 있으면 겹쳐 띄우지 않는다 — 화면이 거른다) */
  error: string | null | undefined;
  readOnly: boolean;
}) {
  const pickAddress = async () => {
    if (readOnly) return;
    const address = await openAddressSearch();
    if (address) void place.selectAddress(address);
  };
  return (
    <FormSection title="공연 장소" required>
      {/* Search Field(DS `73:19`) 모양 — 값은 우편번호 창에서만 받는다(직접 입력 없음, P11-L 결정 8) */}
      <Input
        aria-label="주소 검색"
        placeholder="주소 입력"
        readOnly
        value={value.address}
        onClick={() => void pickAddress()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            void pickAddress();
          }
        }}
        trailing={
          readOnly ? undefined : (
            <button
              type="button"
              className={s.iconButton}
              aria-label="주소 검색 열기"
              onClick={() => void pickAddress()}
            >
              <Icon name="search" />
            </button>
          )
        }
      />
      {place.geocoding && (
        <Txt typography="bodySm" color={colors.textSecondaryLabel}>
          위치를 찾는 중
        </Txt>
      )}
      <FieldError>{place.lookupError}</FieldError>
      <div className={s.placeRow}>
        <Input
          aria-label="공연장 이름"
          placeholder="공연장 이름 (예: 두둥 클럽)"
          readOnly={readOnly}
          showCount={false}
          {...register('place.name')}
        />
        <Input
          aria-label="상세주소"
          placeholder="상세주소 추가 (예: 지하 1층)"
          readOnly={readOnly}
          showCount={false}
          {...register('place.detailAddress')}
        />
      </div>
      <KakaoMapPreview
        latitude={value.latitude}
        longitude={value.longitude}
        unavailable={place.lookupFailure === 'unavailable'}
      />
      {/* 좌표 찾기 실패 안내가 이미 위에 있으면 같은 칸 오류("다른 주소를 골라 주세요")를 겹쳐 띄우지 않는다(#92-1) */}
      <FieldError>{place.lookupError ? null : error}</FieldError>
    </FormSection>
  );
}

/** 티켓 여부 — 라디오 2개. 등록 뒤에는 잠긴다 */
export function HasTicketSection({
  value,
  hasTicket,
  serverError,
  readOnly,
}: {
  value: boolean;
  hasTicket: BasicInfo['hasTicket'];
  serverError: string | undefined;
  readOnly: boolean;
}) {
  return (
    <FormSection
      loose
      title="티켓 여부"
      required
      description={
        '버스킹처럼 티켓 없이 진행되는 공연은 티켓 없음을 선택하세요.\n무료 티켓을 발급하는 경우에도 티켓 있음을 선택해야 해요.'
      }
    >
      <RadioGroup
        aria-label="티켓 여부"
        className={s.radios}
        value={value ? 'yes' : 'no'}
        disabled={readOnly || hasTicket.locked}
        onValueChange={(v) => hasTicket.set(v === 'yes')}
      >
        <Radio value="yes" label="티켓 있음" />
        <Radio value="no" label="티켓 없음" />
      </RadioGroup>
      {hasTicket.locked && (
        <p data-testid="has-ticket-locked" className={s.note}>
          <Txt typography="bodySm" color={colors.textSecondaryLabel}>
            등록 후에는 바꿀 수 없어요
          </Txt>
        </p>
      )}
      <FieldError>{serverError}</FieldError>
    </FormSection>
  );
}

/** 문의처 — 줄마다 유형 드롭다운 + 값 + ✕, [+ 문의처 추가](Secondary medium) */
export function ContactsSection({
  register,
  values,
  contacts,
  errors,
  serverError,
  show,
  readOnly,
}: {
  register: Register;
  values: readonly HostContactInput[];
  contacts: BasicInfo['contacts'];
  errors: readonly (string | null)[];
  serverError: string | undefined;
  show: Show;
  readOnly: boolean;
}) {
  return (
    <FormSection
      title="문의처"
      required
      description="공연관련 문의를 받을 연락처를 입력해 주세요."
      testId="contacts"
    >
      <ContactRows
        noun="문의처"
        rows={contacts.rows}
        values={values}
        register={(i) => register(`contacts.${i}.value`)}
        setType={contacts.setType}
        errorOf={(i) => show(errors[i])}
        maxLengthOf={() => EVENT_CONTACT_VALUE_MAX}
        canRemove={!readOnly}
        onRemove={contacts.remove}
        readOnly={readOnly}
        classes={CONTACT_CLASSES}
      />
      <FieldError>{serverError}</FieldError>
      {contacts.canAdd && (
        <div>
          <Button variant="secondary" icon={<Icon name="add" />} onClick={contacts.add}>
            문의처 추가
          </Button>
        </div>
      )}
    </FormSection>
  );
}

const CONTACT_CLASSES = {
  row: s.contactRow,
  type: s.contactType,
  value: s.contactValue,
  remove: s.removeButton,
};

/** 태그 — 4열(PC 7열), 10개까지 */
export function TagsSection({
  value,
  tags,
  serverError,
  readOnly,
}: {
  value: readonly number[];
  tags: BasicInfo['tags'];
  serverError: string | undefined;
  readOnly: boolean;
}) {
  return (
    <FormSection title="태그" description="공연과 관련된 태그를 선택해주세요. (다중선택 가능)">
      <TagButtonGroup
        aria-label="태그"
        className={s.tags}
        columns={4}
        max={EVENT_TAGS_MAX}
        disabled={readOnly}
        options={tags.groups.flatMap((g) =>
          g.tags.map((t) => ({ value: String(t.tagId), label: t.name })),
        )}
        value={value.map(String)}
        onChange={(next) => {
          const now = new Set(value.map(String));
          const changed =
            next.find((v) => !now.has(v)) ?? [...now].find((v) => !next.includes(v)) ?? null;
          if (changed !== null) tags.toggle(Number(changed));
        }}
      />
      <FieldError>{serverError}</FieldError>
    </FormSection>
  );
}
