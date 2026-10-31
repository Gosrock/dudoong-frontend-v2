'use client';

import Link from 'next/link';
import { useId } from 'react';

import { isSessionLost } from '@/api/errors';
import {
  HOST_CONTACT_VALUE_MAX,
  HOST_INTRODUCE_MAX,
  HOST_NAME_MAX,
  HOST_PHONE_VALUE_MAX,
  type HostContactType,
} from '@/api/host/schema';
import {
  HostingAccessRejected,
  HostingForbidden,
  HostingNotFound,
} from '@/features/hosting/access/HostingAccessRejected';
import { EditorBottomBar, useLeaveGuard } from '@/features/hosting/event/ui/EditorParts';
import { parseHostIdParam } from '@/features/shared/host-home/model/host-home-rules';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { Button } from '@/ui/components/Button/Button';
import { Dropdown } from '@/ui/components/Dropdown/Dropdown';
import { DropZone } from '@/ui/components/DropZone/DropZone';
import { Header } from '@/ui/components/Header/Header';
import { Input } from '@/ui/components/Input/Input';
import * as field from '@/ui/components/Input/Input.css';
import { TextArea } from '@/ui/components/TextArea/TextArea';
import { toast } from '@/ui/components/Toast/Toast';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as c from './CreateHostView.css';
import * as s from './HostManage.css';
import { contactPlaceholder } from './model/host-fields';
import { HOST_IMAGE_SLOTS, type HostImageSlot } from './model/host-settings-form';
import { useHostSettings } from './model/useHostSettings';

const IMAGE_LABEL: Record<HostImageSlot, string> = {
  PROFILE: '프로필 이미지',
  COVER: '커버 이미지',
};

const hostHomeHref = (hostId: string) => `/hosts/${hostId}`;

/**
 * `/hosting/hosts/[hostId]/settings` 호스트 설정(plan P10b V) — **와이어 근거** `503:32374`(호스트_매니저v1.0 "호스트 설정").
 * GUI `741:31172`는 Ready for dev가 아니라 모양을 가져오지 않는다. GUI의 "호스트 삭제하기"는 서버에 없어 그리지 않는다.
 * 이미지 칸(PH-15)은 와이어·GUI 어디에도 없어 폼 맨 아래 "호스트 이미지" 묶음으로 둔다(🤖 — 지우기 쉬운 자리, 디자인 대기).
 * 주소의 id가 숫자가 아니면 요청 없이 공용 404, 비멤버는 공용 403(호스팅 센터는 서버 조회가 없어 상태 코드는 200).
 */
export function HostSettingsView({ hostId }: { hostId: string }) {
  const id = parseHostIdParam(hostId);
  if (id === null) return <HostingNotFound />;
  return (
    <AsyncBoundary holdOn={isSessionLost} rejected={HostingAccessRejected} resetKeys={[id]}>
      <HostSettings hostId={id} />
    </AsyncBoundary>
  );
}

function HostSettings({ hostId }: { hostId: string }) {
  const f = useHostSettings(hostId);
  const formId = useId();
  useLeaveGuard(f.canEdit && f.dirty);
  if (f.access === 'forbidden') return <HostingForbidden />;

  const show = (error: string | null) => (f.attempted && error ? error : undefined);
  const readOnly = !f.canEdit;
  const options = f.contactOptions.map((o) => ({ value: o.type, label: o.label }));
  const uploading = HOST_IMAGE_SLOTS.some((slot) => f.images[slot].uploading);

  return (
    <main className={s.page}>
      <Header title="호스트 설정" backHref={hostHomeHref(hostId)} linkAs={Link} />
      <form
        id={formId}
        noValidate
        className={`${c.form} ${s.body}`}
        onSubmit={(e) => {
          e.preventDefault();
          void f.save().then((ok) => ok && toast('저장했어요', { id: 'host-saved' }));
        }}
      >
        {readOnly && (
          // Q53 기본안 — 일반 멤버는 읽기 전용(design-requests). 문구는 잠정
          <p className={s.note} data-testid="read-only">
            <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
              일반 멤버는 볼 수만 있어요
            </Txt>
          </p>
        )}

        <Input
          label="호스트 이름"
          required
          placeholder={`최대 ${HOST_NAME_MAX}자까지 쓸 수 있어요.`}
          maxLength={HOST_NAME_MAX}
          readOnly={readOnly}
          value={f.values.name}
          onChange={(e) => f.setName(e.target.value)}
          error={show(f.errors.name)}
        />

        <TextArea
          label="소개글"
          placeholder={`최대 ${HOST_INTRODUCE_MAX}자까지 쓸 수 있어요.`}
          maxLength={HOST_INTRODUCE_MAX}
          readOnly={readOnly}
          value={f.values.introduce}
          onChange={(e) => f.setIntroduce(e.target.value)}
          error={show(f.errors.introduce)}
        />

        <fieldset className={c.contacts}>
          <legend className={`${field.label} ${c.legend}`}>
            호스트 대표 연락처
            <span aria-hidden className={field.requiredMark}>
              *
            </span>
          </legend>
          <span className={field.helper}>호스트 홈에 보여지는 정보예요.</span>
          {f.values.contacts.map((contact, i) => (
            <div key={i} className={c.contactRow} data-testid="contact-row">
              <Dropdown
                className={c.contactType}
                aria-label={`연락처 유형 ${i + 1}`}
                placeholder="유형 선택"
                options={options}
                disabled={readOnly}
                value={contact.type ?? ''}
                onValueChange={(v) => v && f.setContactType(i, v as HostContactType)}
              />
              <Input
                className={c.contactValue}
                aria-label={`연락처 ${i + 1}`}
                placeholder={contactPlaceholder(contact.type) ?? undefined}
                maxLength={contact.type === 'PHONE' ? HOST_PHONE_VALUE_MAX : HOST_CONTACT_VALUE_MAX}
                showCount={false}
                readOnly={readOnly}
                value={contact.value}
                onChange={(e) => f.setContactValue(i, e.target.value)}
                error={show(f.errors.contacts[i] ?? null)}
              />
              {f.canRemoveContact && (
                <button
                  type="button"
                  className={c.removeButton}
                  aria-label={`연락처 ${i + 1} 삭제`}
                  onClick={() => f.removeContact(i)}
                >
                  <Icon name="close" />
                </button>
              )}
            </div>
          ))}
          {f.contactsServerError && (
            <span role="alert" className={field.errorText}>
              {f.contactsServerError}
            </span>
          )}
          {f.canAddContact && (
            <Button
              variant="secondary"
              size="sm"
              className={c.addButton}
              icon={<Icon name="add" />}
              onClick={f.addContact}
            >
              문의처 추가
            </Button>
          )}
        </fieldset>

        {/* 이미지 칸 — 와이어·GUI에 없다(PH-15는 계획대로). 위치·모양은 디자인 대기(🤖 폼 맨 아래, DS DropZone) */}
        <fieldset className={c.contacts}>
          <legend className={`${field.label} ${c.legend}`}>호스트 이미지</legend>
          <span className={field.helper}>호스트 홈의 프로필과 배경에 보여요.</span>
          <div className={s.images}>
            {HOST_IMAGE_SLOTS.map((slot) => {
              const image = f.images[slot];
              return (
                <div key={slot} className={s.imageSlot} data-testid={`image-${slot}`}>
                  <Txt typography="labelMd" color={colors.textSecondaryLabel}>
                    {IMAGE_LABEL[slot]}
                  </Txt>
                  <DropZone
                    className={slot === 'PROFILE' ? s.profileZone : s.coverZone}
                    previewUrl={image.url ?? undefined}
                    previewAlt={IMAGE_LABEL[slot]}
                    buttonLabel={`${IMAGE_LABEL[slot]} 올리기`}
                    disabled={readOnly || image.uploading}
                    // 형식 오류도 훅이 그 자리 문구를 정한다(UPLOAD_INVALID_EXTENSION)
                    onFile={(file) => void image.change(file)}
                    onReject={(_, file) => void image.change(file)}
                    error={image.error ?? undefined}
                  />
                  {image.uploading && (
                    <p className={s.note} role="status">
                      <Txt typography="bodySm" color={colors.textSecondaryLabel}>
                        올리는 중이에요
                      </Txt>
                    </p>
                  )}
                  {!readOnly && (
                    <Flex gap={2}>
                      {image.url && (
                        <Button variant="secondary" size="sm" onClick={image.reset}>
                          기본 이미지로
                        </Button>
                      )}
                      {image.error && (
                        <Button variant="secondary" size="sm" onClick={() => void image.retry()}>
                          다시 올리기
                        </Button>
                      )}
                    </Flex>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      </form>
      {f.canEdit && (
        <EditorBottomBar
          formId={formId}
          saveLabel="저장"
          // 칸 오류는 [저장]을 누른 뒤 보인다(attempted) — 바뀐 것이 있으면 누를 수 있게 둔다
          canSave={f.dirty && !uploading && !f.saving}
          saving={f.saving}
        />
      )}
    </main>
  );
}
