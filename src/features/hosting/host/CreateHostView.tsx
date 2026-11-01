'use client';

import Link from 'next/link';

import {
  HOST_CONTACT_VALUE_MAX,
  HOST_INTRODUCE_MAX,
  HOST_NAME_MAX,
  HOST_PHONE_VALUE_MAX,
  type HostContactType,
} from '@/api/host/schema';
import { HOSTING_HOME_HOSTS_HREF } from '@/features/hosting/home/model/hosting-home';
import { Button } from '@/ui/components/Button/Button';
import { Dropdown } from '@/ui/components/Dropdown/Dropdown';
import { Header } from '@/ui/components/Header/Header';
import { Input } from '@/ui/components/Input/Input';
import * as field from '@/ui/components/Input/Input.css';
import { TextArea } from '@/ui/components/TextArea/TextArea';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './CreateHostView.css';
import { contactPlaceholder } from './model/host-fields';
import { useCreateHost } from './model/useCreateHost';

/**
 * `/hosting/new/hosts` 호스트 만들기(plan P10a V) — **와이어 근거** `495:14815`(공연준비홈_새 호스트 만들기).
 * GUI `61:3484`는 Ready for dev가 아니라 모양을 가져오지 않는다. CTA는 "만들기"(design-requests Q19), 만든 뒤 공연준비 홈 호스트 탭 + 토스트.
 * 칸 오류는 [만들기]를 한 번 누른 뒤부터 보인다(`attempted`).
 */
export function CreateHostView() {
  const f = useCreateHost();
  const show = (error: string | null) => (f.attempted && error ? error : undefined);
  const options = f.contactOptions.map((o) => ({ value: o.type, label: o.label }));

  return (
    <main className={s.page}>
      <Header title="새 호스트 만들기" backHref={HOSTING_HOME_HOSTS_HREF} linkAs={Link} />
      <form
        noValidate
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          void f.submit();
        }}
      >
        <Txt as="p" typography="bodyMd" color={colors.textPrimary}>
          지금 입력한 정보는 나중에 언제든 수정할 수 있어요.
        </Txt>

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

        <fieldset className={s.contacts}>
          <legend className={`${field.label} ${s.legend}`}>
            호스트 대표 연락처
            <span aria-hidden className={field.requiredMark}>
              *
            </span>
          </legend>
          <span className={field.helper}>호스트 홈에 보이는 정보예요.</span>
          {f.values.contacts.map((c, i) => (
            <div key={i} className={s.contactRow} data-testid="contact-row">
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
          {f.contactsServerError && (
            <span role="alert" className={field.errorText}>
              {f.contactsServerError}
            </span>
          )}
          {f.canAddContact && (
            <Button
              variant="secondary"
              size="sm"
              className={s.addButton}
              icon={<Icon name="add" />}
              onClick={f.addContact}
            >
              연락처 추가
            </Button>
          )}
        </fieldset>

        <Button type="submit" size="lg" fullWidth loading={f.submitting}>
          만들기
        </Button>
      </form>
    </main>
  );
}
