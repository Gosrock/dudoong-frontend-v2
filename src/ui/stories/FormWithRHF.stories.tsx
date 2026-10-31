import { zodResolver } from '@hookform/resolvers/zod';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Controller, useForm } from 'react-hook-form';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import { z } from 'zod';

import { Button } from '../components/Button/Button';
import { Checkbox } from '../components/Checkbox/Checkbox';
import { Counter } from '../components/Counter/Counter';
import { DatePicker } from '../components/DatePicker/DatePicker';
import { Dropdown } from '../components/Dropdown/Dropdown';
import { Input } from '../components/Input/Input';
import { Radio, RadioGroup } from '../components/Radio/Radio';
import { SelectButton } from '../components/SelectButton/SelectButton';
import { TagButtonGroup } from '../components/TagButton/TagButton';
import { TextArea } from '../components/TextArea/TextArea';
import { TimePicker } from '../components/TimePicker/TimePicker';
import { Toggle } from '../components/Toggle/Toggle';
import { Flex } from '../primitives/Flex';
import { Txt } from '../primitives/Txt';
import { colors } from '../theme/colors';

/**
 * react-hook-form + zod로 폼 컴포넌트를 묶는 예.
 * - `register` 직결: Input · TextArea · DatePicker · TimePicker(네이티브 요소에 ref·onChange·onBlur·name이 그대로 간다)
 * - `Controller`: Dropdown · Checkbox · Toggle · Radio · SelectButton · Counter · TagButtonGroup(Radix·커스텀 값)
 */
const schema = z.object({
  name: z.string().trim().min(1, '공연 이름을 입력해 주세요.').max(25),
  description: z.string().max(100),
  date: z.string().min(1, '날짜를 골라 주세요.'),
  startTime: z.string().min(1, '시간을 골라 주세요.'),
  contactType: z.string().min(1, '연락처 종류를 골라 주세요.'),
  agree: z.boolean().refine((v) => v, '동의가 필요해요.'),
  publicStock: z.boolean(),
  ticketType: z.enum(['paid', 'free']),
  payment: z.string().min(1, '결제 방식을 골라 주세요.'),
  quantity: z.number().int().min(1).max(3),
  tags: z.array(z.string()).min(1, '태그를 하나 이상 골라 주세요.').max(3),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const TAGS = [
  '정기공연',
  '연합공연',
  '홍대',
  '신촌',
  '인디밴드',
  '라이브',
  '콘서트',
  '페스티벌',
].map((t) => ({ value: t, label: t }));

function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <Txt typography="bodySm" color={colors.statusError}>
      {children}
    </Txt>
  );
}

function ExampleForm({ onSubmit }: { onSubmit: (values: FormOutput) => void }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      date: '',
      startTime: '',
      contactType: '',
      agree: false,
      publicStock: false,
      ticketType: 'paid',
      payment: '',
      quantity: 1,
      tags: [],
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} style={{ width: 358 }}>
      <Flex direction="column" gap={5} fullWidth>
        <Input
          label="공연 이름"
          required
          maxLength={25}
          placeholder="최대 25자까지 쓸 수 있어요."
          error={errors.name?.message}
          {...register('name')}
        />
        <TextArea
          label="공연 소개"
          maxLength={100}
          rows={3}
          error={errors.description?.message}
          {...register('description')}
        />
        <Flex gap={2} fullWidth>
          <DatePicker
            aria-label="공연 날짜"
            placeholder="날짜 선택"
            error={errors.date?.message}
            {...register('date')}
          />
          <TimePicker
            aria-label="시작 시간"
            placeholder="시작 시간"
            error={errors.startTime?.message}
            {...register('startTime')}
          />
        </Flex>
        <Controller
          control={control}
          name="contactType"
          render={({ field, fieldState }) => (
            <Dropdown
              label="문의처"
              placeholder="선택"
              options={[
                { value: 'email', label: '이메일' },
                { value: 'phone', label: '전화번호' },
              ]}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              name={field.name}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="ticketType"
          render={({ field }) => (
            <RadioGroup
              aria-label="티켓 종류"
              value={field.value}
              onValueChange={field.onChange}
              ref={field.ref}
              onBlur={field.onBlur}
            >
              <Radio value="paid" label="티켓 있음" />
              <Radio value="free" label="티켓 없음" />
            </RadioGroup>
          )}
        />
        <Flex direction="column" gap={2} fullWidth>
          <Controller
            control={control}
            name="payment"
            render={({ field }) => (
              <SelectButton
                aria-label="결제 방식"
                aria-invalid={Boolean(errors.payment)}
                options={[
                  { value: 'transfer', label: '계좌 이체' },
                  { value: 'toss', label: '토스 송금' },
                ]}
                value={field.value}
                onValueChange={field.onChange}
                ref={field.ref}
                onBlur={field.onBlur}
              />
            )}
          />
          <ErrorText>{errors.payment?.message}</ErrorText>
        </Flex>
        <Flex justify="space-between" align="center" fullWidth>
          <Txt typography="bodyLg">수량</Txt>
          <Controller
            control={control}
            name="quantity"
            render={({ field }) => (
              <Counter
                label="수량"
                min={1}
                max={3}
                value={field.value}
                onChange={field.onChange}
                ref={field.ref}
                onBlur={field.onBlur}
              />
            )}
          />
        </Flex>
        <Flex direction="column" gap={2} fullWidth>
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <TagButtonGroup
                aria-label="태그"
                columns={4}
                max={3}
                options={TAGS}
                value={field.value}
                onChange={field.onChange}
                ref={field.ref}
                onBlur={field.onBlur}
              />
            )}
          />
          <ErrorText>{errors.tags?.message}</ErrorText>
        </Flex>
        <Flex justify="space-between" align="center" fullWidth>
          <span id="public-stock">
            <Txt typography="bodyLg">재고 정보 공개</Txt>
          </span>
          <Controller
            control={control}
            name="publicStock"
            render={({ field }) => (
              <Toggle
                aria-labelledby="public-stock"
                checked={field.value}
                onCheckedChange={field.onChange}
                ref={field.ref}
                onBlur={field.onBlur}
              />
            )}
          />
        </Flex>
        <Flex direction="column" gap={2} fullWidth>
          <Controller
            control={control}
            name="agree"
            render={({ field }) => (
              <Checkbox
                label="유의사항을 확인했어요"
                checked={field.value}
                onCheckedChange={field.onChange}
                ref={field.ref}
                onBlur={field.onBlur}
              />
            )}
          />
          <ErrorText>{errors.agree?.message}</ErrorText>
        </Flex>
        <Button type="submit" size="lg" fullWidth>
          저장하기
        </Button>
      </Flex>
    </form>
  );
}

const meta = {
  title: 'Patterns/FormWithRHF',
  component: ExampleForm,
  args: { onSubmit: fn() },
} satisfies Meta<typeof ExampleForm>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 빈 채로 제출하면 에러가 보이고 첫 칸으로 포커스. 다 채우면 값이 타입대로 들어온다 */
export const Submit: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const submit = c.getByRole('button', { name: '저장하기' });

    await userEvent.click(submit);
    const name = c.getByRole('textbox', { name: '공연 이름' });
    await waitFor(() => expect(name).toHaveAttribute('aria-invalid', 'true'));
    await expect(name).toHaveFocus();
    await expect(c.getByText('연락처 종류를 골라 주세요.')).toBeInTheDocument();
    await expect(args.onSubmit).not.toHaveBeenCalled();

    await userEvent.type(name, '고스락 정기공연');
    await userEvent.type(c.getByRole('textbox', { name: '공연 소개' }), '30회');
    await userEvent.type(c.getByLabelText('공연 날짜'), '2026-05-16');
    await userEvent.type(c.getByLabelText('시작 시간'), '18:00');

    await userEvent.click(c.getByRole('combobox', { name: '문의처' }));
    await userEvent.click(await screen.findByRole('option', { name: '전화번호' }));

    await userEvent.click(c.getByRole('radio', { name: '티켓 없음' }));
    await userEvent.click(c.getByRole('radio', { name: '토스 송금' }));
    await userEvent.click(c.getByRole('button', { name: '수량 늘리기' }));
    await userEvent.click(c.getByRole('button', { name: '신촌' }));
    await userEvent.click(c.getByRole('button', { name: '정기공연' }));
    await userEvent.click(c.getByRole('switch', { name: '재고 정보 공개' }));
    await userEvent.click(c.getByRole('checkbox', { name: '유의사항을 확인했어요' }));

    await userEvent.click(submit);
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce());
    await expect(args.onSubmit).toHaveBeenCalledWith(
      {
        name: '고스락 정기공연',
        description: '30회',
        date: '2026-05-16',
        startTime: '18:00',
        contactType: 'phone',
        agree: true,
        publicStock: true,
        ticketType: 'free',
        payment: 'toss',
        quantity: 2,
        tags: ['정기공연', '신촌'],
      },
      expect.anything(),
    );
  },
};
