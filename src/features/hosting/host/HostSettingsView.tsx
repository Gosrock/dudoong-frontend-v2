'use client';

import Link from 'next/link';
import { useId } from 'react';

import { HOST_INTRODUCE_MAX, HOST_NAME_MAX } from '@/api/host/schema';
import { HostingForbidden, HostingNotFound } from '@/features/hosting/access/HostingAccessRejected';
import { HostingBoundary } from '@/features/hosting/access/HostingBoundary';
import { hostContactMaxLength } from '@/features/hosting/shared/model/host-fields';
import { ContactRows } from '@/features/hosting/shared/ui/ContactRows';
import { EditorBottomBar, useLeaveGuard } from '@/features/hosting/shared/ui/EditorParts';
import { parseHostIdParam } from '@/features/shared/host-home/model/host-home-rules';
import { hostHref } from '@/features/shared/routes';
import { SHELL_IMMERSIVE_ATTR } from '@/features/shared/shell/shell.css';
import { Button } from '@/ui/components/Button/Button';
import { Header } from '@/ui/components/Header/Header';
import { Input } from '@/ui/components/Input/Input';
import * as field from '@/ui/components/Input/Input.css';
import { TextArea } from '@/ui/components/TextArea/TextArea';
import { toast } from '@/ui/components/Toast/Toast';
import { useActivityMarker } from '@/ui/hooks/useActivityMarker';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as c from './CreateHostView.css';
import * as s from './HostManage.css';
import * as v from './HostSettingsView.css';
import { HOST_IMAGE_SLOTS } from './model/host-settings-form';
import { useHostSettings } from './model/useHostSettings';
import { HostImageField } from './ui/HostImageField';

/**
 * `/hosting/hosts/[hostId]/settings` 호스트 홈 설정(plan P10b V) — **GUI 근거**: 모바일 `741:31172` · `1452:40541` · `1452:42653` ·
 * `1524:13269` · `1524:13380` · 자르기 `1458:4961` · `1476:8399`(Design Sync #260 · #278), PC 1440 `1496:12683` · `1556:15393` ·
 * `1556:15548` · `1556:15687` · `1556:15762`(#294 — 가운데 960, 제목 줄 포함).
 * GUI의 "호스트 삭제하기"(`741:31204` · `1551:104649` · `1556:15836`, #293)는 서버에 기능이 없어(DEC-013, Backend #274 §3 —
 * `DELETE /hosts/{id}` 405) 그리지 않는다.
 * 주소의 id가 숫자가 아니면 요청 없이 공용 404, 비멤버는 공용 403(호스팅 센터는 서버 조회가 없어 상태 코드는 200).
 */
export function HostSettingsView({ hostId }: { hostId: string }) {
  const id = parseHostIdParam(hostId);
  if (id === null) return <HostingNotFound />;
  return (
    <HostingBoundary resetKeys={[id]}>
      <HostSettings hostId={id} />
    </HostingBoundary>
  );
}

function HostSettings({ hostId }: { hostId: string }) {
  const settings = useHostSettings(hostId);
  const formId = useId();
  useLeaveGuard(settings.canEdit && settings.dirty);
  if (settings.access === 'forbidden') return <HostingForbidden />;

  const { contacts } = settings;
  const show = (error: string | null) => (settings.attempted && error ? error : undefined);
  const readOnly = !settings.canEdit;
  const uploading = HOST_IMAGE_SLOTS.some((slot) => settings.images[slot].uploading);

  return (
    <main className={`${s.page} ${v.column}`}>
      <HostSettingsHeader hostId={hostId} />
      <form
        id={formId}
        noValidate
        className={`${c.form} ${s.body} ${v.form}`}
        onSubmit={(e) => {
          e.preventDefault();
          void settings.save().then((ok) => ok && toast('저장했어요', { id: 'host-saved' }));
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
          error={show(settings.errors.name)}
          {...settings.form.register('name')}
        />

        <TextArea
          label="소개글"
          placeholder={`최대 ${HOST_INTRODUCE_MAX}자까지 쓸 수 있어요.`}
          maxLength={HOST_INTRODUCE_MAX}
          readOnly={readOnly}
          error={show(settings.errors.introduce)}
          {...settings.form.register('introduce')}
        />

        <fieldset className={`${c.contacts} ${v.contacts}`}>
          <legend className={`${field.label} ${c.legend}`}>
            호스트 대표 연락처
            <span aria-hidden className={field.requiredMark}>
              *
            </span>
          </legend>
          <span className={field.helper}>호스트 홈에 보이는 정보예요.</span>
          <ContactRows
            noun="연락처"
            rows={contacts.rows}
            values={settings.values.contacts}
            register={(i) => settings.form.register(`contacts.${i}.value`)}
            setType={contacts.setType}
            errorOf={(i) => show(settings.errors.contacts[i] ?? null)}
            maxLengthOf={hostContactMaxLength}
            canRemove={contacts.canRemove}
            onRemove={contacts.remove}
            readOnly={readOnly}
            classes={c.contactClasses}
          />
          {contacts.serverError && (
            <span role="alert" className={field.errorText}>
              {contacts.serverError}
            </span>
          )}
          {contacts.canAdd && (
            <Button
              variant="secondary"
              size="sm"
              className={c.addButton}
              icon={<Icon name="add" />}
              onClick={contacts.add}
            >
              문의처 추가
            </Button>
          )}
        </fieldset>

        {HOST_IMAGE_SLOTS.map((slot) => (
          <HostImageField
            key={slot}
            slot={slot}
            image={settings.images[slot]}
            readOnly={readOnly}
          />
        ))}
      </form>
      {settings.canEdit && (
        <div className={v.bottom}>
          <EditorBottomBar
            formId={formId}
            saveLabel="저장"
            // 칸 오류는 [저장]을 누른 뒤 보인다(attempted) — 바뀐 것이 있으면 누를 수 있게 둔다
            canSave={settings.dirty && !uploading && !settings.saving}
            saving={settings.saving}
          />
        </div>
      )}
    </main>
  );
}

/**
 * 모바일 상단 — DS Top app bar `only title`(← 호스트 홈 설정, GUI `1452:40548`). 셸 로고 헤더 없이 이 바가 맨 위다
 * (`SHELL_IMMERSIVE_ATTR` — Ready 프레임에 로고 헤더가 없다). PC는 셸 상단 바 아래 같은 줄
 */
function HostSettingsHeader({ hostId }: { hostId: string }) {
  const ref = useActivityMarker<HTMLDivElement>();
  return (
    <div ref={ref} className={v.bleed} {...{ [SHELL_IMMERSIVE_ATTR]: '' }}>
      <Header title="호스트 홈 설정" backHref={hostHref(hostId)} linkAs={Link} />
    </div>
  );
}
