'use client';

import Link from 'next/link';
import { useState } from 'react';

import { isSessionLost } from '@/api/errors';
import type { HostContactType } from '@/api/host/schema';
import {
  HostingAccessRejected,
  HostingForbidden,
  HostingNotFound,
} from '@/features/hosting/access/HostingAccessRejected';
import { parseHostIdParam } from '@/features/shared/host-home/model/host-home-rules';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';

import { contactPlaceholder } from './model/host-fields';
import { HOST_IMAGE_SLOTS, type HostImageSlot } from './model/host-settings-form';
import { useHostSettings } from './model/useHostSettings';

const IMAGE_LABEL: Record<HostImageSlot, string> = {
  PROFILE: '프로필 이미지',
  COVER: '커버 이미지',
};

/**
 * `/hosting/hosts/[hostId]/settings` 호스트 설정 — 스타일 없는 최소 마크업(P10b-L). 이미지 칸 위치·드롭다운·이탈 확인은 P10b-V.
 * 주소의 id가 숫자가 아니면 요청 없이 공용 404, 비멤버는 공용 403(호스팅 센터는 서버 조회가 없어 상태 코드는 200).
 */
export function HostSettingsView({ hostId }: { hostId: string }) {
  const id = parseHostIdParam(hostId);
  return (
    <main>
      {id === null ? (
        <HostingNotFound />
      ) : (
        <AsyncBoundary holdOn={isSessionLost} rejected={HostingAccessRejected} resetKeys={[id]}>
          <HostSettings hostId={id} />
        </AsyncBoundary>
      )}
    </main>
  );
}

function HostSettings({ hostId }: { hostId: string }) {
  const f = useHostSettings(hostId);
  const [saved, setSaved] = useState(false);
  if (f.access === 'forbidden') return <HostingForbidden />;
  const show = (error: string | null) =>
    f.attempted && error ? <span role="alert">{error}</span> : null;
  const readOnly = !f.canEdit;
  return (
    <>
      <h1>호스트 설정</h1>
      <nav>
        <Link href={`/hosts/${hostId}`}>호스트 홈</Link>{' '}
        <Link href={`/hosting/hosts/${hostId}/members`}>멤버</Link>
      </nav>
      {readOnly && <p data-testid="read-only">일반 멤버는 볼 수만 있어요</p>}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          void f.save().then(setSaved);
        }}
      >
        {HOST_IMAGE_SLOTS.map((slot) => {
          const image = f.images[slot];
          return (
            <fieldset key={slot} data-testid={`image-${slot}`}>
              <legend>{IMAGE_LABEL[slot]}</legend>
              {image.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- 최소 마크업(V에서 교체)
                <img src={image.url} alt={IMAGE_LABEL[slot]} width={80} height={80} />
              ) : (
                <p>기본 이미지</p>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png"
                aria-label={`${IMAGE_LABEL[slot]} 올리기`}
                disabled={readOnly || image.uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void image.change(file);
                }}
              />
              {image.uploading && <span>올리는 중</span>}
              {!readOnly && (
                <button type="button" onClick={image.reset}>
                  기본 이미지로
                </button>
              )}
              {image.error && (
                <span role="alert">
                  {image.error}{' '}
                  <button type="button" onClick={() => void image.retry()}>
                    다시 올리기
                  </button>
                </span>
              )}
            </fieldset>
          );
        })}
        <label>
          호스트 이름
          <input
            value={f.values.name}
            readOnly={readOnly}
            onChange={(e) => f.setName(e.target.value)}
          />
        </label>
        {show(f.errors.name)}
        <label>
          소개
          <textarea
            value={f.values.introduce}
            readOnly={readOnly}
            onChange={(e) => f.setIntroduce(e.target.value)}
          />
        </label>
        {show(f.errors.introduce)}
        <fieldset>
          <legend>대표 연락처</legend>
          {f.values.contacts.map((c, i) => (
            <div key={i} data-testid="contact-row">
              <select
                aria-label={`연락처 유형 ${i + 1}`}
                value={c.type ?? ''}
                disabled={readOnly}
                onChange={(e) => f.setContactType(i, e.target.value as HostContactType)}
              >
                <option value="" disabled>
                  유형 선택
                </option>
                {f.contactOptions.map((o) => (
                  <option key={o.type} value={o.type}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                aria-label={`연락처 ${i + 1}`}
                value={c.value}
                readOnly={readOnly}
                placeholder={contactPlaceholder(c.type) ?? undefined}
                onChange={(e) => f.setContactValue(i, e.target.value)}
              />
              {f.canRemoveContact && (
                <button type="button" onClick={() => f.removeContact(i)}>
                  삭제
                </button>
              )}
              {show(f.errors.contacts[i] ?? null)}
            </div>
          ))}
          {f.contactsServerError && <p role="alert">{f.contactsServerError}</p>}
          {f.canAddContact && (
            <button type="button" onClick={f.addContact}>
              문의처 추가
            </button>
          )}
        </fieldset>
        {f.canEdit && (
          <button type="submit" disabled={!f.canSave}>
            저장
          </button>
        )}
        {saved && !f.dirty && <p role="status">저장했어요</p>}
      </form>
    </>
  );
}
