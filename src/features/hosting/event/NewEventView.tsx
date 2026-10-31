'use client';

import { useRouter } from 'next/navigation';

import { EVENT_NAME_MAX } from '@/api/event/schema';
import {
  HOST_CONTACT_VALUE_MAX,
  HOST_INTRODUCE_MAX,
  HOST_NAME_MAX,
  HOST_PHONE_VALUE_MAX,
  type HostContactType,
} from '@/api/host/schema';
import { roleChipOf, UNNAMED_HOST } from '@/features/hosting/home/model/home-cards';
import { contactPlaceholder } from '@/features/hosting/host/model/host-fields';
import { Avatar } from '@/ui/components/Avatar/Avatar';
import { Button } from '@/ui/components/Button/Button';
import { Chip } from '@/ui/components/Chip/Chip';
import { DatePicker } from '@/ui/components/DatePicker/DatePicker';
import { Dropdown } from '@/ui/components/Dropdown/Dropdown';
import { Header } from '@/ui/components/Header/Header';
import { Input } from '@/ui/components/Input/Input';
import { Radio, RadioGroup } from '@/ui/components/Radio/Radio';
import { Skeleton } from '@/ui/components/Skeleton/Skeleton';
import { TextArea } from '@/ui/components/TextArea/TextArea';
import { TimePicker } from '@/ui/components/TimePicker/TimePicker';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { useNewEventWizard } from './model/useNewEventWizard';
import * as s from './NewEventView.css';
import { FieldError, FormSection } from './ui/EditorParts';

type Wizard = ReturnType<typeof useNewEventWizard>;

/**
 * `/hosting/new/events?step=1|2` 간편 공연 만들기 — **와이어 근거**(GUI `41:1996`·`55:3164` 등 Ready 아님).
 * 와이어 `108:2136`(호스트 선택) · `108:2158`(호스트 없음) · `108:2168`(Step1 안 새 호스트 만들기) · `108:2200`(공연 만들기):
 * 가운데 제목 "간편 공연만들기" → 2단 진행 막대 → 단계 제목 → 내용 → 아래 버튼. DS 토큰·컴포넌트만(design-workflow §3).
 */
export function NewEventView() {
  const w = useNewEventWizard();
  const router = useRouter();
  const step = w.step === 1 && w.creatingHost ? 'createHost' : w.step === 1 ? 'pick' : 'event';
  const back = () => {
    if (step === 'createHost') w.cancelCreateHost();
    else if (step === 'event') router.back();
    else router.push('/hosting');
  };
  return (
    <div className={s.page}>
      <Header title="간편 공연만들기" align="center" onBack={back} />
      <div className={s.body}>
        <div
          className={s.progress}
          role="progressbar"
          aria-label="진행"
          aria-valuemin={1}
          aria-valuemax={2}
          aria-valuenow={w.step}
          aria-valuetext={`${w.step}/2단계`}
          data-testid="wizard-step"
          data-step={w.step}
        >
          <span className={s.progressFill} data-step={w.step} />
        </div>
        {step === 'pick' && <PickHostStep w={w} />}
        {step === 'createHost' && <CreateHostStep w={w} />}
        {step === 'event' && <EventStep w={w} />}
      </div>
    </div>
  );
}

/** Step1 — 호스트 줄(아바타 · 이름 · "등록된 공연 N" · 역할 칩)을 골라 [다음]. 일반 멤버인 호스트는 고를 수 없다 */
function PickHostStep({ w }: { w: Wizard }) {
  const h = w.hosts;
  return (
    <section aria-labelledby="step1-title" className={s.step}>
      <Txt as="h2" typography="headingLgEmphasized">
        <span id="step1-title">호스트를 선택해주세요</span>
      </Txt>
      {h.status === 'pending' && (
        <Flex direction="column" gap={3} fullWidth>
          <Skeleton height={80} />
          <Skeleton height={80} />
        </Flex>
      )}
      {h.status === 'error' && (
        <div role="alert">
          <Flex direction="column" gap={3} align="flex-start">
            <Txt typography="bodyMd">호스트 목록을 불러오지 못했어요.</Txt>
            <Button variant="secondary" size="sm" onClick={h.retry}>
              다시 시도
            </Button>
          </Flex>
        </div>
      )}
      {h.status === 'empty' && (
        <p data-testid="no-hosts" className={s.plain}>
          <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
            등록한 호스트가 없어요. 새 호스트를 만들어 시작하세요.
          </Txt>
        </p>
      )}
      <div role="radiogroup" aria-label="호스트" className={s.hostList}>
        {h.items.map((host) => {
          const chip = roleChipOf(host.myRole);
          const selected = w.selectedHost?.hostId === host.hostId;
          return (
            <button
              key={host.hostId}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={!host.selectable || undefined}
              className={s.hostRow}
              onClick={() => host.selectable && w.selectHost(host.hostId)}
            >
              <Avatar size={48} src={host.profileImageUrl} alt="" />
              <Flex direction="column" gap={1} style={{ flex: '1 1 auto', minWidth: 0 }}>
                <Txt typography="labelLgEmphasized" lines={1}>
                  {host.name ?? UNNAMED_HOST}
                </Txt>
                <Txt typography="bodySm" color={colors.textSecondaryLabel}>
                  {host.selectable
                    ? `등록된 공연 ${host.eventCount}`
                    : '일반 멤버라 고를 수 없어요'}
                </Txt>
              </Flex>
              {chip && (
                <Chip size="lg" color={chip.color} theme={chip.theme}>
                  {chip.label}
                </Chip>
              )}
            </button>
          );
        })}
      </div>
      {h.hasNextPage && (
        <Button variant="secondary" size="sm" onClick={h.loadMore}>
          더 보기
        </Button>
      )}
      <button type="button" className={s.hostRow} onClick={w.startCreateHost}>
        <Icon name="add" />
        <Txt typography="labelLgEmphasized">새 호스트 만들기</Txt>
      </button>
      <div className={s.footer}>
        <Button size="lg" fullWidth disabled={!w.canGoToStep2} onClick={w.goToStep2}>
          다음
        </Button>
      </div>
    </section>
  );
}

/** Step1 안의 새 호스트 만들기(와이어 `108:2168`) — 만들면 그 호스트가 골라진 채 Step2로(L) */
function CreateHostStep({ w }: { w: Wizard }) {
  const f = w.createHost;
  const show = (error: string | null) => (f.attempted && error ? error : undefined);
  const options = f.contactOptions.map((o) => ({ value: o.type, label: o.label }));
  return (
    <section aria-labelledby="create-host-title" className={s.step}>
      <Flex direction="column" gap={2}>
        <Txt as="h2" typography="headingLgEmphasized">
          <span id="create-host-title">새 호스트 만들기</span>
        </Txt>
        <Txt as="p" typography="bodyMd">
          지금 입력한 정보는 나중에 언제든 수정할 수 있어요.
        </Txt>
      </Flex>
      <form
        noValidate
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          void f.submit();
        }}
      >
        <Input
          label="호스트 이름"
          required
          placeholder={`최대 ${HOST_NAME_MAX}자까지 쓸 수 있어요.`}
          maxLength={HOST_NAME_MAX}
          value={f.values.name}
          onChange={(e) => f.setName(e.target.value)}
          error={show(f.errors.name)}
        />
        <TextArea
          label="소개글"
          placeholder={`최대 ${HOST_INTRODUCE_MAX}자까지 쓸 수 있어요.`}
          maxLength={HOST_INTRODUCE_MAX}
          value={f.values.introduce}
          onChange={(e) => f.setIntroduce(e.target.value)}
          error={show(f.errors.introduce)}
        />
        <FormSection title="호스트 대표 연락처" required description="호스트 홈에 보이는 정보예요.">
          {f.values.contacts.map((c, i) => (
            <div key={i} className={s.contactRow}>
              <Dropdown
                className={s.contactType}
                aria-label={`연락처 유형 ${i + 1}`}
                placeholder="유형 선택"
                options={options}
                value={c.type ?? ''}
                onValueChange={(v) => v && f.setContactType(i, v as HostContactType)}
              />
              <Input
                className={s.contactValue}
                aria-label={`연락처 ${i + 1}`}
                placeholder={contactPlaceholder(c.type) ?? undefined}
                maxLength={c.type === 'PHONE' ? HOST_PHONE_VALUE_MAX : HOST_CONTACT_VALUE_MAX}
                showCount={false}
                value={c.value}
                onChange={(e) => f.setContactValue(i, e.target.value)}
                error={show(f.errors.contacts[i] ?? null)}
              />
              {f.canRemoveContact && (
                <button
                  type="button"
                  className={s.removeButton}
                  aria-label={`연락처 ${i + 1} 삭제`}
                  onClick={() => f.removeContact(i)}
                >
                  <Icon name="close" />
                </button>
              )}
            </div>
          ))}
          <FieldError>{f.contactsServerError}</FieldError>
          {f.canAddContact && (
            <div>
              <Button
                variant="secondary"
                size="sm"
                icon={<Icon name="add" />}
                onClick={f.addContact}
              >
                연락처 추가
              </Button>
            </div>
          )}
        </FormSection>
        <div className={s.footer}>
          <Button type="submit" size="lg" fullWidth loading={f.submitting}>
            다음
          </Button>
        </div>
      </form>
    </section>
  );
}

/** Step2 — 공연 이름 · 일정(날짜 + 시작 ~ 종료) · 티켓 여부 → [완료](와이어 `108:2200`) */
function EventStep({ w }: { w: Wizard }) {
  const show = (error: string | null) => (w.attempted && error ? error : undefined);
  return (
    <section aria-labelledby="step2-title" className={s.step}>
      <Flex direction="column" gap={2}>
        <Txt as="h2" typography="headingLgEmphasized">
          <span id="step2-title">공연을 새로 만들어볼까요?</span>
        </Txt>
        <Txt as="p" typography="bodyMd" className={s.preLine}>
          {
            '공연이 확정되기 전까지 언제든 수정할 수 있어요.\n자세한 정보는 나중에 더 추가할 수 있어요.'
          }
        </Txt>
        {w.selectedHost && (
          <p data-testid="selected-host" className={s.plain}>
            <Txt typography="bodySm" color={colors.textSecondaryLabel}>
              호스트: {w.selectedHost.name ?? UNNAMED_HOST}
            </Txt>
          </p>
        )}
      </Flex>
      <form
        noValidate
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          void w.submit();
        }}
      >
        <Input
          label="공연 이름"
          required
          placeholder={`최대 ${EVENT_NAME_MAX}자까지 쓸 수 있어요.`}
          maxLength={EVENT_NAME_MAX}
          value={w.values.name}
          onChange={(e) => w.setName(e.target.value)}
          error={show(w.errors.name)}
        />
        <FormSection title="공연 일정" required>
          <DatePicker
            aria-label="날짜"
            placeholder="날짜 선택"
            value={w.values.schedule.date}
            onChange={(e) => w.setSchedule({ date: e.target.value })}
          />
          <div className={s.times}>
            <TimePicker
              aria-label="시작 시각"
              className={s.time}
              placeholder="시작 시간"
              value={w.values.schedule.startTime}
              onChange={(e) => w.setSchedule({ startTime: e.target.value })}
            />
            <Txt typography="bodyLg" aria-hidden>
              ~
            </Txt>
            <TimePicker
              aria-label="종료 시각"
              className={s.time}
              placeholder="종료 시간"
              value={w.values.schedule.endTime}
              onChange={(e) => w.setSchedule({ endTime: e.target.value })}
            />
          </div>
          {w.scheduleRange?.overnight && (
            <p data-testid="overnight" className={s.plain}>
              <Txt typography="bodySm" color={colors.textSecondaryLabel}>
                종료 시각이 시작보다 빨라 다음 날 끝나는 공연으로 만들어요.
              </Txt>
            </p>
          )}
          <FieldError>{show(w.errors.schedule) ?? w.scheduleServerError}</FieldError>
        </FormSection>
        <FormSection
          title="티켓 여부"
          required
          description={
            '버스킹처럼 티켓 없이 진행되는 공연은 티켓 없음을 선택하세요.\n무료 티켓을 발급하는 경우에도 티켓 있음을 선택해야 합니다.'
          }
        >
          <RadioGroup
            aria-label="티켓 여부"
            className={s.radios}
            value={w.values.hasTicket === null ? '' : w.values.hasTicket ? 'yes' : 'no'}
            onValueChange={(v) => w.setHasTicket(v === 'yes')}
          >
            <Radio value="yes" label="티켓 있음" />
            <Radio value="no" label="티켓 없음" />
          </RadioGroup>
          <FieldError>{show(w.errors.hasTicket)}</FieldError>
        </FormSection>
        <div className={s.footer}>
          <Button type="submit" size="lg" fullWidth loading={w.submitting}>
            완료
          </Button>
        </div>
      </form>
    </section>
  );
}
