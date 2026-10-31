'use client';

import { overlay } from 'overlay-kit';
import { useEffect, useId, useRef } from 'react';

import { EVENT_CONTACT_VALUE_MAX, EVENT_NAME_MAX, EVENT_TAGS_MAX } from '@/api/event/schema';
import type { HostContactType } from '@/api/host/schema';
import { contactPlaceholder } from '@/features/hosting/host/model/host-fields';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { DatePicker } from '@/ui/components/DatePicker/DatePicker';
import { Dropdown } from '@/ui/components/Dropdown/Dropdown';
import { Input } from '@/ui/components/Input/Input';
import { Popup } from '@/ui/components/Popup/Popup';
import { Radio, RadioGroup } from '@/ui/components/Radio/Radio';
import { TagButtonGroup } from '@/ui/components/TagButton/TagButton';
import { TimePicker } from '@/ui/components/TimePicker/TimePicker';
import { toast } from '@/ui/components/Toast/Toast';
import { Icon } from '@/ui/icons/Icon';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './EventInfoView.css';
import { useEventBasicInfo } from './model/useEventBasicInfo';
import { EditorBottomBar, FieldError, FormSection, useLeaveGuard } from './ui/EditorParts';
import { KakaoMapPreview, openAddressSearch } from './ui/PlaceParts';

type Form = ReturnType<typeof useEventBasicInfo>;

/** 등록된 공연을 저장했을 때 안내(서버는 예매자에게 알리지 않는다 — plan P11). 디자인 없음 → DS `Popup` */
export const REGISTERED_SAVED_TITLE = '저장했어요';
export const REGISTERED_SAVED_DESCRIPTION =
  '이미 예매한 관객에게는 바뀐 내용이 따로 알려지지 않아요. 꼭 알려야 하는 변경이면 직접 안내해 주세요.';

/**
 * `/hosting/events/[eventId]/info` 기본 정보 — GUI Ready 모바일 `748:33351`(입력 전)·`748:33451`(입력 후) · PC `748:34006`(1440).
 * 모바일 한 열, PC 1280~ 두 열(왼쪽 342 포스터 | 간격 48 | 오른쪽 칸 최대 600), 1024~1279는 한 열(Q39 7번 — 2열 접힘 폭이 Figma에 없다).
 * 하단 고정 바 [미리보기][저장하기]. 주소는 Daum 우편번호 창 → 카카오 Geocoder 좌표 → 지도 미리보기(카카오맵 SDK).
 */
export function EventInfoView({ eventId }: { eventId: string }) {
  const f = useEventBasicInfo(eventId);
  const formId = useId();
  const readOnly = !f.canEdit;
  useLeaveGuard(f.canEdit && f.dirty);
  useSavedNotice(f);
  const show = (error: string | null | undefined) => (f.attempted && error ? error : undefined);

  return (
    <section aria-labelledby="info-title" className={s.page}>
      <div className={s.body}>
        <h1 id="info-title" className={s.desktopTitle}>
          <Txt typography="headingLgEmphasized">기본 정보</Txt>
        </h1>
        {f.formError && (
          <p role="alert">
            <Txt typography="bodyMd" color={colors.textDangerLabel}>
              {f.formError}
            </Txt>
          </p>
        )}
        <form
          id={formId}
          noValidate
          className={s.columns}
          onSubmit={(e) => {
            e.preventDefault();
            void f.save();
          }}
        >
          <PosterSection f={f} readOnly={readOnly} />
          <div className={s.fields}>
            <FormSection title="공연 이름" required>
              <Input
                aria-label="공연 이름"
                placeholder={`최대 ${EVENT_NAME_MAX}자까지 쓸 수 있어요.`}
                maxLength={EVENT_NAME_MAX}
                showCount={false}
                value={f.values.name}
                readOnly={readOnly}
                onChange={(e) => f.setName(e.target.value)}
                error={show(f.errors.name)}
              />
            </FormSection>

            <FormSection title="공연 일정" required>
              <div className={s.schedule}>
                <DatePicker
                  aria-label="날짜"
                  className={s.date}
                  placeholder="날짜 선택"
                  value={f.values.schedule.date}
                  readOnly={readOnly}
                  onChange={(e) => f.setSchedule({ date: e.target.value })}
                />
                <div className={s.times}>
                  <TimePicker
                    aria-label="시작 시각"
                    className={s.time}
                    placeholder="시작 시간"
                    value={f.values.schedule.startTime}
                    readOnly={readOnly}
                    onChange={(e) => f.setSchedule({ startTime: e.target.value })}
                  />
                  <Txt typography="bodyLg" aria-hidden>
                    ~
                  </Txt>
                  <TimePicker
                    aria-label="종료 시각"
                    className={s.time}
                    placeholder="종료 시간"
                    value={f.values.schedule.endTime}
                    readOnly={readOnly}
                    onChange={(e) => f.setSchedule({ endTime: e.target.value })}
                  />
                </div>
              </div>
              {f.scheduleRange?.overnight && (
                <p data-testid="overnight" className={s.note}>
                  <Txt typography="bodySm" color={colors.textSecondaryLabel}>
                    종료 시각이 시작보다 빨라 다음 날 끝나는 공연으로 저장돼요.
                  </Txt>
                </p>
              )}
              <FieldError>{show(f.errors.schedule) ?? f.serverErrors.schedule}</FieldError>
            </FormSection>

            <PlaceSection f={f} readOnly={readOnly} />

            <FormSection
              title="티켓 여부"
              required
              description={
                '버스킹처럼 티켓 없이 진행되는 공연은 티켓 없음을 선택하세요.\n무료 티켓을 발급하는 경우에도 티켓 있음을 선택해야 해요.'
              }
            >
              <RadioGroup
                aria-label="티켓 여부"
                className={s.radios}
                value={f.values.hasTicket ? 'yes' : 'no'}
                disabled={readOnly || f.hasTicketLocked}
                onValueChange={(v) => f.setHasTicket(v === 'yes')}
              >
                <Radio value="yes" label="티켓 있음" />
                <Radio value="no" label="티켓 없음" />
              </RadioGroup>
              {f.hasTicketLocked && (
                <p data-testid="has-ticket-locked" className={s.note}>
                  <Txt typography="bodySm" color={colors.textSecondaryLabel}>
                    등록 후에는 바꿀 수 없어요
                  </Txt>
                </p>
              )}
              <FieldError>{f.serverErrors.hasTicket}</FieldError>
            </FormSection>

            <ContactsSection f={f} readOnly={readOnly} show={show} />

            <FormSection
              title="태그"
              description="공연과 관련된 태그를 선택해주세요. (다중선택 가능)"
            >
              <TagButtonGroup
                aria-label="태그"
                className={s.tags}
                columns={4}
                max={EVENT_TAGS_MAX}
                disabled={readOnly}
                options={f.tagGroups.flatMap((g) =>
                  g.tags.map((t) => ({ value: String(t.tagId), label: t.name })),
                )}
                value={f.values.tagIds.map(String)}
                onChange={(next) => {
                  const now = new Set(f.values.tagIds.map(String));
                  const changed =
                    next.find((v) => !now.has(v)) ??
                    [...now].find((v) => !next.includes(v)) ??
                    null;
                  if (changed !== null) f.toggleTag(Number(changed));
                }}
              />
              <FieldError>{f.serverErrors.tags}</FieldError>
            </FormSection>
          </div>
        </form>
      </div>
      {f.canEdit && (
        <EditorBottomBar
          formId={formId}
          canPreview={f.canPreview}
          onPreview={() => openInfoPreview(f)}
          canSave={f.canSave}
          saving={f.saving}
        />
      )}
      <Popup
        open={f.savedNotice === 'registeredChanged'}
        onOpenChange={(o) => !o && f.dismissSavedNotice()}
        title={REGISTERED_SAVED_TITLE}
        description={REGISTERED_SAVED_DESCRIPTION}
        cancelLabel={null}
        onConfirm={f.dismissSavedNotice}
      />
    </section>
  );
}

/** 준비중 공연 저장 → 토스트 "저장했어요"(디자인 없음). 등록된 공연은 안내 팝업(위) */
function useSavedNotice(f: Form) {
  const { savedNotice, dismissSavedNotice } = f;
  useEffect(() => {
    if (savedNotice !== 'saved') return;
    toast('저장했어요', { id: 'event-saved' });
    dismissSavedNotice();
  }, [savedNotice, dismissSavedNotice]);
}

/**
 * 포스터 — 제목 + 안내 + 포스터(모바일 180×255 · PC 270×381, 모서리 8) + [이미지 업로드]/[이미지 수정](Secondary medium, `image-add`).
 * 업로드는 PE-10 발급 → S3 → key(L). 형식 검사는 서버 발급 단계(`UPLOAD_INVALID_EXTENSION`)
 */
function PosterSection({ f, readOnly }: { f: Form; readOnly: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={s.posterColumn} data-testid="poster">
      <FormSection
        title="공연 포스터"
        description={
          '포스터 이미지는 표준 종이규격 (A,B)에 최적화되어 있어요.\n사진형식은 JPG, JPEG, PNG만 가능해요.'
        }
      >
        <div className={s.posterBody}>
          {f.poster.url ? (
            // 올린 포스터 미리보기(서버·S3 주소 그대로 — v1 #378 `/_next/image` 차단)
            // eslint-disable-next-line @next/next/no-img-element
            <img className={s.poster} src={f.poster.url} alt="포스터 미리보기" />
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
                  if (file) void f.poster.change(file);
                }}
              />
              <Button
                variant="secondary"
                className={s.posterButton}
                icon={<Icon name="image-add" />}
                loading={f.poster.uploading}
                onClick={() => input.current?.click()}
              >
                {f.poster.url ? '이미지 수정' : '이미지 업로드'}
              </Button>
            </>
          )}
          {f.poster.error && (
            <div role="alert">
              <Flex gap={2} align="center" wrap>
                <Txt typography="bodySm" color={colors.textDangerLabel}>
                  {f.poster.error}
                </Txt>
                {!readOnly && (
                  <Button variant="secondary" size="sm" onClick={f.poster.retry}>
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

/** 장소 — 주소(검색 칸 → 우편번호 창) · 공연장 이름 · 상세주소(PC는 둘이 한 줄) · 지도 미리보기 */
function PlaceSection({ f, readOnly }: { f: Form; readOnly: boolean }) {
  const pickAddress = async () => {
    if (readOnly) return;
    const address = await openAddressSearch();
    if (address) void f.selectAddress(address);
  };
  return (
    <FormSection title="공연 장소" required>
      {/* Search Field(DS `73:19`) 모양 — 값은 우편번호 창에서만 받는다(직접 입력 없음, P11-L 결정 8) */}
      <Input
        aria-label="주소 검색"
        placeholder="주소 입력"
        readOnly
        value={f.values.place.address}
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
      {f.geocoding && (
        <Txt typography="bodySm" color={colors.textSecondaryLabel}>
          위치를 찾는 중
        </Txt>
      )}
      <FieldError>{f.placeLookupError}</FieldError>
      <div className={s.placeRow}>
        <Input
          aria-label="공연장 이름"
          placeholder="공연장 이름 (예: 두둥 클럽)"
          value={f.values.place.name}
          readOnly={readOnly}
          showCount={false}
          onChange={(e) => f.setPlaceName(e.target.value)}
        />
        <Input
          aria-label="상세주소"
          placeholder="상세주소 추가 (예: 지하 1층)"
          value={f.values.place.detailAddress}
          readOnly={readOnly}
          showCount={false}
          onChange={(e) => f.setDetailAddress(e.target.value)}
        />
      </div>
      <KakaoMapPreview latitude={f.values.place.latitude} longitude={f.values.place.longitude} />
      <FieldError>{f.attempted ? f.errors.place : null}</FieldError>
    </FormSection>
  );
}

/** 문의처 — 줄마다 유형 드롭다운 + 값 + ✕, [+ 문의처 추가](Secondary medium) */
function ContactsSection({
  f,
  readOnly,
  show,
}: {
  f: Form;
  readOnly: boolean;
  show: (e: string | null | undefined) => string | undefined;
}) {
  const options = f.contactOptions.map((o) => ({ value: o.type, label: o.label }));
  return (
    <FormSection
      title="문의처"
      required
      description="공연관련 문의를 받을 연락처를 입력해 주세요."
      testId="contacts"
    >
      {f.values.contacts.map((c, i) => (
        <div key={i} className={s.contactRow} data-testid="contact-row">
          <Dropdown
            className={s.contactType}
            aria-label={`문의처 유형 ${i + 1}`}
            placeholder="유형 선택"
            options={options}
            value={c.type ?? ''}
            disabled={readOnly}
            onValueChange={(v) => v && f.setContactType(i, v as HostContactType)}
          />
          <Input
            className={s.contactValue}
            aria-label={`문의처 ${i + 1}`}
            placeholder={contactPlaceholder(c.type) ?? undefined}
            maxLength={EVENT_CONTACT_VALUE_MAX}
            showCount={false}
            value={c.value}
            readOnly={readOnly}
            onChange={(e) => f.setContactValue(i, e.target.value)}
            error={show(f.errors.contacts[i])}
          />
          {!readOnly && (
            <button
              type="button"
              className={s.removeButton}
              aria-label={`문의처 ${i + 1} 삭제`}
              onClick={() => f.removeContact(i)}
            >
              <Icon name="close" />
            </button>
          )}
        </div>
      ))}
      <FieldError>{f.serverErrors.contacts}</FieldError>
      {f.canAddContact && (
        <div>
          <Button variant="secondary" icon={<Icon name="add" />} onClick={f.addContact}>
            문의처 추가
          </Button>
        </div>
      )}
    </FormSection>
  );
}

/**
 * [미리보기] — 디자인 없음. 지금 칸 값(저장 전)으로 관객 공연 상세의 머리 정보(포스터 · 이름 · 일시 · 장소 · 태그)를 보여 준다.
 * 저장할 수 있을 때만 열린다(`canPreview`)
 */
function openInfoPreview(f: Form) {
  const v = f.values;
  const tagNames = f.tagGroups
    .flatMap((g) => g.tags)
    .filter((t) => v.tagIds.includes(t.tagId))
    .map((t) => `#${t.name}`)
    .join(' ');
  const rows: [string, string][] = [
    ['일자', v.schedule.date],
    ['시간', v.schedule.startTime ? `${v.schedule.startTime} ~ ${v.schedule.endTime}` : ''],
    ['장소', [v.place.name, v.place.address, v.place.detailAddress].filter(Boolean).join(' · ')],
    ['태그', tagNames],
  ];
  overlay.open(({ isOpen, close, unmount }) => (
    <ResponsiveOverlay
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      onExited={unmount}
      title="미리보기"
    >
      <div className={s.preview} data-testid="info-preview">
        {v.poster.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={s.previewPoster} src={v.poster.url} alt="포스터" />
        ) : (
          <Illustration name="poster-placeholder" width={180} className={s.previewPoster} />
        )}
        <Txt as="p" typography="title">
          {v.name}
        </Txt>
        <dl className={s.previewFacts}>
          {rows
            .filter(([, value]) => value)
            .map(([k, value]) => (
              <div key={k} className={s.previewFact}>
                <Txt as="dt" typography="headingSmEmphasized">
                  {k}
                </Txt>
                <Txt as="dd" typography="headingSm" className={s.previewValue}>
                  {value}
                </Txt>
              </div>
            ))}
        </dl>
      </div>
    </ResponsiveOverlay>
  ));
}
