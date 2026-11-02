'use client';

import Link from 'next/link';

import { HOST_INTRODUCE_MAX, HOST_NAME_MAX } from '@/api/host/schema';
import { hostContactMaxLength } from '@/features/hosting/shared/model/host-fields';
import { useCreateHost } from '@/features/hosting/shared/model/useCreateHost';
import { HOSTING_HOME_HOSTS_HREF } from '@/features/hosting/shared/routes';
import { ContactRows } from '@/features/hosting/shared/ui/ContactRows';
import { Button } from '@/ui/components/Button/Button';
import { Header } from '@/ui/components/Header/Header';
import { Input } from '@/ui/components/Input/Input';
import * as field from '@/ui/components/Input/Input.css';
import { TextArea } from '@/ui/components/TextArea/TextArea';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './CreateHostView.css';

/**
 * `/hosting/new/hosts` 호스트 만들기(plan P10a V) — **와이어 근거** `495:14815`(공연준비홈_새 호스트 만들기).
 * GUI `61:3484`는 Ready for dev가 아니라 모양을 가져오지 않는다. CTA는 "만들기"(design-requests Q19), 만든 뒤 공연준비 홈 호스트 탭 + 토스트.
 * 칸 오류는 [만들기]를 한 번 누른 뒤부터 보인다(`attempted`).
 */
export function CreateHostView() {
  const form = useCreateHost();
  const { contacts } = form;
  const show = (error: string | null) => (form.attempted && error ? error : undefined);

  return (
    <main className={s.page}>
      <Header title="새 호스트 만들기" backHref={HOSTING_HOME_HOSTS_HREF} linkAs={Link} />
      <form
        noValidate
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          void form.submit();
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
          error={show(form.errors.name)}
          {...form.form.register('name')}
        />

        <TextArea
          label="소개글"
          placeholder={`최대 ${HOST_INTRODUCE_MAX}자까지 쓸 수 있어요.`}
          maxLength={HOST_INTRODUCE_MAX}
          error={show(form.errors.introduce)}
          {...form.form.register('introduce')}
        />

        <fieldset className={s.contacts}>
          <legend className={`${field.label} ${s.legend}`}>
            호스트 대표 연락처
            <span aria-hidden className={field.requiredMark}>
              *
            </span>
          </legend>
          <span className={field.helper}>호스트 홈에 보이는 정보예요.</span>
          <ContactRows
            noun="연락처"
            rows={contacts.rows}
            values={form.values.contacts}
            register={(i) => form.form.register(`contacts.${i}.value`)}
            setType={contacts.setType}
            errorOf={(i) => show(form.errors.contacts[i] ?? null)}
            maxLengthOf={hostContactMaxLength}
            canRemove={contacts.canRemove}
            onRemove={contacts.remove}
            classes={s.contactClasses}
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
              className={s.addButton}
              icon={<Icon name="add" />}
              onClick={contacts.add}
            >
              연락처 추가
            </Button>
          )}
        </fieldset>

        <Button type="submit" size="lg" fullWidth loading={form.submitting}>
          만들기
        </Button>
      </form>
    </main>
  );
}
