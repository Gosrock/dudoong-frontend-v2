'use client';

import { useState } from 'react';

import type { HostContactType } from '@/api/host/schema';
import { contactPlaceholder } from '@/features/hosting/host/model/host-fields';

import { useEventBasicInfo } from './model/useEventBasicInfo';

/**
 * `/hosting/events/[eventId]/info` 기본 정보 — 스타일 없는 최소 마크업(P11-L). 포스터 칸·Daum 우편번호 창·지도 미리보기·태그 칩·
 * 저장 안내 팝업·이탈 확인은 P11-V. **주소 검색은 우편번호 창 대신 글자 칸 + [주소 선택]**으로 둔다 — 고른 주소를 넘기는 자리만 같다.
 */
export function EventInfoView({ eventId }: { eventId: string }) {
  const f = useEventBasicInfo(eventId);
  const [address, setAddress] = useState(f.values.place.address);
  const readOnly = !f.canEdit;
  const show = (error: string | null) =>
    f.attempted && error ? <span role="alert">{error}</span> : null;
  return (
    <section aria-labelledby="info-title">
      <h1 id="info-title">기본 정보</h1>
      {f.formError && <p role="alert">{f.formError}</p>}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void f.save();
        }}
      >
        <fieldset data-testid="poster">
          <legend>포스터</legend>
          {f.poster.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- 최소 마크업(V에서 교체)
            <img src={f.poster.url} alt="포스터" width={80} height={113} />
          ) : (
            <p>포스터 없음</p>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png"
            aria-label="포스터 올리기"
            disabled={readOnly || f.poster.uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void f.poster.change(file);
            }}
          />
          {f.poster.uploading && <span>올리는 중</span>}
          {!readOnly && f.poster.url && (
            <button type="button" onClick={f.poster.remove}>
              포스터 지우기
            </button>
          )}
          {f.poster.error && <span role="alert">{f.poster.error}</span>}
        </fieldset>

        <label>
          공연 이름
          <input
            value={f.values.name}
            readOnly={readOnly}
            onChange={(e) => f.setName(e.target.value)}
          />
        </label>
        {show(f.errors.name)}

        <fieldset>
          <legend>일정</legend>
          <label>
            날짜
            <input
              type="date"
              value={f.values.schedule.date}
              readOnly={readOnly}
              onChange={(e) => f.setSchedule({ date: e.target.value })}
            />
          </label>
          <label>
            시작 시각
            <input
              type="time"
              value={f.values.schedule.startTime}
              readOnly={readOnly}
              onChange={(e) => f.setSchedule({ startTime: e.target.value })}
            />
          </label>
          <label>
            종료 시각
            <input
              type="time"
              value={f.values.schedule.endTime}
              readOnly={readOnly}
              onChange={(e) => f.setSchedule({ endTime: e.target.value })}
            />
          </label>
          {f.scheduleRange?.overnight && <span data-testid="overnight">다음 날 종료</span>}
          {show(f.errors.schedule)}
          {f.serverErrors.schedule && <span role="alert">{f.serverErrors.schedule}</span>}
        </fieldset>

        <fieldset>
          <legend>장소</legend>
          <label>
            주소 검색
            <input
              value={address}
              readOnly={readOnly}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>
          {!readOnly && (
            <button type="button" onClick={() => void f.selectAddress(address)}>
              주소 선택
            </button>
          )}
          {f.geocoding && <span>위치를 찾는 중</span>}
          <p data-testid="place-address">{f.values.place.address}</p>
          {f.values.place.latitude !== null && (
            <p data-testid="place-coords">
              {f.values.place.latitude}, {f.values.place.longitude}
            </p>
          )}
          {f.placeLookupError && <span role="alert">{f.placeLookupError}</span>}
          <label>
            공연장 이름
            <input
              value={f.values.place.name}
              readOnly={readOnly}
              onChange={(e) => f.setPlaceName(e.target.value)}
            />
          </label>
          <label>
            상세주소
            <input
              value={f.values.place.detailAddress}
              readOnly={readOnly}
              onChange={(e) => f.setDetailAddress(e.target.value)}
            />
          </label>
          {show(f.errors.place)}
        </fieldset>

        <fieldset>
          <legend>문의처</legend>
          {f.values.contacts.map((c, i) => (
            <div key={i} data-testid="contact-row">
              <select
                aria-label={`문의처 유형 ${i + 1}`}
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
                aria-label={`문의처 ${i + 1}`}
                value={c.value}
                readOnly={readOnly}
                placeholder={contactPlaceholder(c.type) ?? undefined}
                onChange={(e) => f.setContactValue(i, e.target.value)}
              />
              {!readOnly && (
                <button type="button" onClick={() => f.removeContact(i)}>
                  문의처 삭제
                </button>
              )}
              {show(f.errors.contacts[i] ?? null)}
            </div>
          ))}
          {f.serverErrors.contacts && <p role="alert">{f.serverErrors.contacts}</p>}
          {f.canAddContact && (
            <button type="button" onClick={f.addContact}>
              문의처 추가
            </button>
          )}
        </fieldset>

        <fieldset>
          <legend>태그</legend>
          {f.tagGroups.map((g) => (
            <div key={g.category}>
              {g.tags.map((t) => (
                <label key={t.tagId}>
                  <input
                    type="checkbox"
                    checked={f.values.tagIds.includes(t.tagId)}
                    disabled={readOnly}
                    onChange={() => f.toggleTag(t.tagId)}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          ))}
          {f.serverErrors.tags && <p role="alert">{f.serverErrors.tags}</p>}
        </fieldset>

        <fieldset>
          <legend>티켓 여부</legend>
          <label>
            <input
              type="radio"
              name="hasTicket"
              checked={f.values.hasTicket}
              disabled={readOnly || f.hasTicketLocked}
              onChange={() => f.setHasTicket(true)}
            />
            티켓 있음
          </label>
          <label>
            <input
              type="radio"
              name="hasTicket"
              checked={!f.values.hasTicket}
              disabled={readOnly || f.hasTicketLocked}
              onChange={() => f.setHasTicket(false)}
            />
            티켓 없음
          </label>
          {f.hasTicketLocked && (
            <span data-testid="has-ticket-locked">등록 후에는 바꿀 수 없어요</span>
          )}
          {f.serverErrors.hasTicket && <span role="alert">{f.serverErrors.hasTicket}</span>}
        </fieldset>

        {f.canEdit && (
          <button type="submit" disabled={!f.canSave}>
            저장하기
          </button>
        )}
        {f.savedNotice === 'saved' && <p role="status">저장했어요</p>}
        {f.savedNotice === 'registeredChanged' && (
          <p role="status" data-testid="registered-saved-notice">
            저장했어요. 이미 예매한 관객에게는 바뀐 내용이 따로 알려지지 않아요.
          </p>
        )}
      </form>
    </section>
  );
}
