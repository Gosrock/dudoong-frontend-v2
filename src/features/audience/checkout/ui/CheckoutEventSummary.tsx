'use client';

import { Fragment } from 'react';

import type { EventDetail } from '@/api/event/schema';
import { formatKstDotDateWeekday } from '@/api/shared/date';
import { eventSchedule } from '@/features/audience/event/model/event-schedule';
import { UNNAMED_EVENT } from '@/features/shared/event-labels';
import { UploadedImage } from '@/ui/components/UploadedImage/UploadedImage';

import * as s from './CheckoutEventSummary.css';

/** `18:00 ~ 21:00 (180분)` — GUI `1952:50100`. 다른 날 끝나면 끝 날짜도(공연 상세와 같은 규칙) */
function timeLabel(event: Pick<EventDetail, 'startAt' | 'endAt' | 'runTime'>) {
  const schedule = eventSchedule(event);
  if (!schedule) return null;
  const end = schedule.endTime
    ? ` ~ ${schedule.endDate ? `${schedule.endDate} ` : ''}${schedule.endTime}`
    : '';
  return [`${schedule.startTime}${end}`, schedule.runTimeLabel].filter(Boolean).join(' ');
}

/**
 * 체크아웃 맨 위 공연 요약(GUI `1952:50087` — Design Sync #349 · #350~#352): 포스터 + 공연 이름 + 호스트 · 일자 · 시간 · 장소.
 * 공개 GP-3(헤더 제목에 쓰던 값)을 그대로 쓴다. 아직 못 읽었거나 실패하면 그리지 않는다 — 체크아웃은 이 값 없이도 된다.
 * 값이 없는 줄(장소 미정 등)은 뺀다.
 */
export function CheckoutEventSummary({ event }: { event: EventDetail }) {
  const facts = [
    { label: '호스트', value: event.host.name },
    { label: '일자', value: event.startAt ? formatKstDotDateWeekday(event.startAt) : null },
    { label: '시간', value: timeLabel(event) },
    { label: '장소', value: event.place?.name ?? null },
    // 태그는 PC에만(GUI `1989:31681`)
    {
      label: '태그',
      value: event.tags.length ? event.tags.map((t) => `#${t.name}`).join(' ') : null,
      desktopOnly: true,
    },
  ].filter((f): f is { label: string; value: string; desktopOnly?: boolean } => Boolean(f.value));
  return (
    <section className={s.summary} aria-label="공연 정보">
      <span className={s.poster}>
        {event.posterImageUrl && (
          <UploadedImage
            src={event.posterImageUrl}
            alt=""
            width={386}
            height={546}
            sizes="(min-width: 1024px) 193px, 107px"
            className={s.posterImage}
          />
        )}
      </span>
      <div className={s.text}>
        <p className={s.title}>{event.name ?? UNNAMED_EVENT}</p>
        {facts.length > 0 && (
          <dl className={s.facts}>
            {facts.map((f) => (
              <Fragment key={f.label}>
                <dt className={`${s.factLabel} ${f.desktopOnly ? s.desktopOnly : ''}`}>
                  {f.label}
                </dt>
                <dd className={`${s.factValue} ${f.desktopOnly ? s.desktopOnly : ''}`}>
                  {f.value}
                </dd>
              </Fragment>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
