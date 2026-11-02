'use client';

import { useId } from 'react';

import { EVENT_NAME_MAX } from '@/api/event/schema';
import {
  EditorBottomBar,
  FormSection,
  useLeaveGuard,
} from '@/features/hosting/shared/ui/EditorParts';
import { Input } from '@/ui/components/Input/Input';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './EventInfoView.css';
import { useEventBasicInfo } from './model/useEventBasicInfo';
import {
  ContactsSection,
  HasTicketSection,
  PlaceSection,
  PosterSection,
  ScheduleSection,
  TagsSection,
} from './ui/BasicInfoSections';
import { openInfoPreview } from './ui/InfoPreview';
import { SavedNotice } from './ui/SavedNotice';

/**
 * `/hosting/events/[eventId]/info` 기본 정보 — GUI Ready 모바일 `748:33351`(입력 전)·`748:33451`(입력 후) · PC `748:34006`(1440).
 * 모바일 한 열, PC 1280~ 두 열(왼쪽 342 포스터 | 간격 48 | 오른쪽 칸 최대 600), 1024~1279는 한 열(Q39 7번 — 2열 접힘 폭이 Figma에 없다).
 * 하단 고정 바 [미리보기][저장하기]. 주소는 Daum 우편번호 창 → 카카오 Geocoder 좌표 → 지도 미리보기(카카오맵 SDK).
 * 칸 묶음은 `ui/BasicInfoSections.tsx` — 묶음마다 훅 결과에서 자기 몫만 받는다.
 */
export function EventInfoView({ eventId }: { eventId: string }) {
  const info = useEventBasicInfo(eventId);
  const { form, values, errors, serverErrors, status } = info;
  const formId = useId();
  const readOnly = !info.canEdit;
  useLeaveGuard(info.canEdit && status.dirty);
  const show = (error: string | null | undefined) =>
    status.attempted && error ? error : undefined;

  return (
    <section aria-labelledby="info-title" className={s.page}>
      <div className={s.body}>
        <h1 id="info-title" className={s.desktopTitle}>
          <Txt typography="headingLgEmphasized">기본 정보</Txt>
        </h1>
        {info.formError && (
          <p role="alert">
            <Txt typography="bodyMd" color={colors.textDangerLabel}>
              {info.formError}
            </Txt>
          </p>
        )}
        <form
          id={formId}
          noValidate
          className={s.columns}
          onSubmit={(e) => {
            e.preventDefault();
            void info.save();
          }}
        >
          <PosterSection poster={info.poster} readOnly={readOnly} />
          <div className={s.fields}>
            <FormSection title="공연 이름" required>
              <Input
                aria-label="공연 이름"
                placeholder={`최대 ${EVENT_NAME_MAX}자까지 쓸 수 있어요.`}
                maxLength={EVENT_NAME_MAX}
                showCount={false}
                readOnly={readOnly}
                error={show(errors.name)}
                {...form.register('name')}
              />
            </FormSection>
            <ScheduleSection
              register={form.register}
              schedule={info.schedule}
              error={show(errors.schedule)}
              serverError={serverErrors.schedule}
              readOnly={readOnly}
            />
            <PlaceSection
              register={form.register}
              value={values.place}
              place={info.place}
              error={status.attempted ? errors.place : null}
              readOnly={readOnly}
            />
            <HasTicketSection
              value={values.hasTicket}
              hasTicket={info.hasTicket}
              serverError={serverErrors.hasTicket}
              readOnly={readOnly}
            />
            <ContactsSection
              register={form.register}
              values={values.contacts}
              contacts={info.contacts}
              errors={errors.contacts}
              serverError={serverErrors.contacts}
              show={show}
              readOnly={readOnly}
            />
            <TagsSection
              value={values.tagIds}
              tags={info.tags}
              serverError={serverErrors.tags}
              readOnly={readOnly}
            />
          </div>
        </form>
      </div>
      {info.canEdit && (
        <EditorBottomBar
          formId={formId}
          canPreview={status.canPreview}
          onPreview={() => openInfoPreview(values, info.tags.groups)}
          canSave={status.canSave}
          saving={status.saving}
        />
      )}
      <SavedNotice notice={info.savedNotice} />
    </section>
  );
}
