'use client';

import type { HostContactType } from '@/api/host/schema';
import { contactPlaceholder } from '@/features/hosting/host/model/host-fields';

import { useNewEventWizard } from './model/useNewEventWizard';

/**
 * `/hosting/new/events` 간편 공연 만들기 — 스타일 없는 최소 마크업(P11-L). 진행 막대·Radio·날짜 선택기·호스트 카드는 P11-V.
 */
export function NewEventView() {
  const w = useNewEventWizard();
  const show = (error: string | null) =>
    w.attempted && error ? <span role="alert">{error}</span> : null;
  return (
    <main>
      <h1>간편 공연 만들기</h1>
      <p data-testid="wizard-step">{w.step}/2</p>
      {w.step === 1 ? (
        w.creatingHost ? (
          <CreateHostStep w={w} />
        ) : (
          <section aria-labelledby="step1-title">
            <h2 id="step1-title">호스트 선택</h2>
            {w.hosts.status === 'pending' && <p>불러오는 중</p>}
            {w.hosts.status === 'error' && (
              <p role="alert">
                불러오지 못했어요.{' '}
                <button type="button" onClick={w.hosts.retry}>
                  다시 시도
                </button>
              </p>
            )}
            {w.hosts.status === 'empty' && <p data-testid="no-hosts">등록한 호스트가 없어요</p>}
            <ul aria-label="호스트">
              {w.hosts.items.map((h) => (
                <li key={h.hostId}>
                  <label>
                    <input
                      type="radio"
                      name="host"
                      checked={w.selectedHost?.hostId === h.hostId}
                      disabled={!h.selectable}
                      onChange={() => w.selectHost(h.hostId)}
                    />
                    {h.name ?? '이름 없는 호스트'}
                  </label>
                  {!h.selectable && <span> 일반 멤버라 고를 수 없어요</span>}
                </li>
              ))}
            </ul>
            {w.hosts.hasNextPage && (
              <button type="button" onClick={w.hosts.loadMore}>
                더 보기
              </button>
            )}
            <button type="button" onClick={w.startCreateHost}>
              새 호스트 만들기
            </button>
            <button type="button" disabled={!w.canGoToStep2} onClick={w.goToStep2}>
              다음
            </button>
          </section>
        )
      ) : (
        <section aria-labelledby="step2-title">
          <h2 id="step2-title">공연 만들기</h2>
          <p data-testid="selected-host">{w.selectedHost?.name}</p>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void w.submit();
            }}
          >
            <label>
              공연 이름
              <input value={w.values.name} onChange={(e) => w.setName(e.target.value)} />
            </label>
            {show(w.errors.name)}
            <label>
              날짜
              <input
                type="date"
                value={w.values.schedule.date}
                onChange={(e) => w.setSchedule({ date: e.target.value })}
              />
            </label>
            <label>
              시작 시각
              <input
                type="time"
                value={w.values.schedule.startTime}
                onChange={(e) => w.setSchedule({ startTime: e.target.value })}
              />
            </label>
            <label>
              종료 시각
              <input
                type="time"
                value={w.values.schedule.endTime}
                onChange={(e) => w.setSchedule({ endTime: e.target.value })}
              />
            </label>
            {w.scheduleRange?.overnight && <span data-testid="overnight">다음 날 종료</span>}
            {show(w.errors.schedule)}
            {w.scheduleServerError && <span role="alert">{w.scheduleServerError}</span>}
            <fieldset>
              <legend>티켓 여부</legend>
              <label>
                <input
                  type="radio"
                  name="hasTicket"
                  checked={w.values.hasTicket === true}
                  onChange={() => w.setHasTicket(true)}
                />
                티켓 있음
              </label>
              <label>
                <input
                  type="radio"
                  name="hasTicket"
                  checked={w.values.hasTicket === false}
                  onChange={() => w.setHasTicket(false)}
                />
                티켓 없음
              </label>
              {show(w.errors.hasTicket)}
            </fieldset>
            <button type="submit" disabled={w.submitting}>
              공연 만들기
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

function CreateHostStep({ w }: { w: ReturnType<typeof useNewEventWizard> }) {
  const f = w.createHost;
  const show = (error: string | null) =>
    f.attempted && error ? <span role="alert">{error}</span> : null;
  return (
    <section aria-labelledby="create-host-title">
      <h2 id="create-host-title">새 호스트 만들기</h2>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void f.submit();
        }}
      >
        <label>
          호스트 이름
          <input value={f.values.name} onChange={(e) => f.setName(e.target.value)} />
        </label>
        {show(f.errors.name)}
        <label>
          소개
          <textarea value={f.values.introduce} onChange={(e) => f.setIntroduce(e.target.value)} />
        </label>
        {show(f.errors.introduce)}
        {f.values.contacts.map((c, i) => (
          <div key={i}>
            <select
              aria-label={`연락처 유형 ${i + 1}`}
              value={c.type ?? ''}
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
              placeholder={contactPlaceholder(c.type) ?? undefined}
              onChange={(e) => f.setContactValue(i, e.target.value)}
            />
            {show(f.errors.contacts[i] ?? null)}
          </div>
        ))}
        {f.contactsServerError && <p role="alert">{f.contactsServerError}</p>}
        <button type="button" onClick={w.cancelCreateHost}>
          취소
        </button>
        <button type="submit" disabled={f.submitting}>
          만들기
        </button>
      </form>
    </section>
  );
}
