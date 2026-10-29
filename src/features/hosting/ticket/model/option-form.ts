import {
  type CreatableOptionType,
  type CreateOptionRequest,
  OPTION_DESCRIPTION_MAX,
  OPTION_NAME_MAX,
  OPTION_PRICE_MAX,
  type TicketOptionManage,
  type UpdateOptionRequest,
} from '@/api/option/schema';

/**
 * 옵션 폼(P10/O-2 만들기 · P10/O-3 수정, plan P12). 근거: 백엔드 `V2TicketOptionRequest`·`V2TicketOptionDomainService`(432cce4).
 * - 이름 1~20자, **설명은 필수** 1~50자(앞뒤 공백 제외 — 수정은 바뀐 때만 길이 검사, v1의 긴 설명은 그대로 둘 수 있다)
 * - 응답 형식(주관식 / 네·아니오)은 만들 때만 고른다 — 수정 본문에는 형식이 없다(서버가 막는다, patterns §23)
 * - '네' 추가금은 네·아니오만 0~1,000만 원. 잠긴 옵션(판매·승인 대기 티켓에 붙음)은 이름·설명만 고친다(`Option_Group_400_5`)
 */

export type OptionFormValues = {
  name: string;
  description: string;
  type: CreatableOptionType;
  /** '네' 추가금(원, 숫자 글자). 비면 0 */
  yesAdditionalPrice: string;
};

export const initialOptionFormValues = (): OptionFormValues => ({
  name: '',
  description: '',
  type: 'SUBJECTIVE',
  yesAdditionalPrice: '',
});

/** 수정 폼 처음 값. 객관식(v1) 옵션은 형식을 보여 주기만 한다 — 값에는 주관식으로 둔다(보내지 않는다) */
export const optionFormValuesOf = (o: TicketOptionManage): OptionFormValues => ({
  name: o.name ?? '',
  description: o.description ?? '',
  type: o.type === 'YES_NO' ? 'YES_NO' : 'SUBJECTIVE',
  yesAdditionalPrice: o.yesAdditionalPrice === null ? '' : String(o.yesAdditionalPrice),
});

export type OptionFormField = 'name' | 'description' | 'yesAdditionalPrice';
export type OptionFormErrors = Partial<Record<OptionFormField, string>>;

export const OPTION_FORM_MESSAGE = {
  name: `옵션 이름을 ${OPTION_NAME_MAX}자까지 입력해 주세요`,
  descriptionRequired: '옵션 설명을 입력해 주세요',
  descriptionTooLong: `옵션 설명은 ${OPTION_DESCRIPTION_MAX}자까지 쓸 수 있어요`,
  price: `추가 금액은 0원부터 ${OPTION_PRICE_MAX.toLocaleString('ko-KR')}원까지 입력할 수 있어요`,
  paidOnFree: '무료 티켓에는 추가 금액이 있는 옵션을 붙일 수 없어요',
} as const;

/** '네' 추가금 숫자(빈 칸 = 0). 틀리면 null */
export function optionPriceOf(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return 0;
  return /^\d+$/.test(t) ? Number(t) : null;
}

/**
 * 칸 오류. `base`(수정 처음 값)가 있으면 설명 길이는 바뀐 때만 본다. `freeTicket`이면(무료 티켓에 붙일 새 옵션) 추가금 0만 된다 —
 * 만든 뒤 붙이기(O-5)가 `Item_Option_Group_400_4`로 실패하지 않게 미리 막는다
 */
export function validateOptionForm(
  v: OptionFormValues,
  {
    base = null,
    freeTicket = false,
  }: { base?: OptionFormValues | null; freeTicket?: boolean } = {},
): OptionFormErrors {
  const errors: OptionFormErrors = {};
  const name = v.name.trim();
  if (!name || name.length > OPTION_NAME_MAX) errors.name = OPTION_FORM_MESSAGE.name;
  const description = v.description.trim();
  if (!description) errors.description = OPTION_FORM_MESSAGE.descriptionRequired;
  else if (
    (!base || base.description.trim() !== description) &&
    description.length > OPTION_DESCRIPTION_MAX
  ) {
    errors.description = OPTION_FORM_MESSAGE.descriptionTooLong;
  }
  if (v.type === 'YES_NO') {
    const price = optionPriceOf(v.yesAdditionalPrice);
    if (price === null || price > OPTION_PRICE_MAX)
      errors.yesAdditionalPrice = OPTION_FORM_MESSAGE.price;
    else if (freeTicket && price > 0) errors.yesAdditionalPrice = OPTION_FORM_MESSAGE.paidOnFree;
  }
  return errors;
}

export const hasOptionFormErrors = (e: OptionFormErrors) =>
  Object.values(e).some((m) => m !== undefined);

/** P10/O-2 본문. 주관식이면 추가금을 보내지 않는다 */
export const toCreateOptionBody = (v: OptionFormValues): CreateOptionRequest => ({
  name: v.name.trim(),
  description: v.description.trim(),
  type: v.type,
  ...(v.type === 'YES_NO' && { yesAdditionalPrice: optionPriceOf(v.yesAdditionalPrice) ?? 0 }),
});

/**
 * P10/O-3 본문 — 바뀐 이름·설명·추가금만. **형식(`type`)은 보내지 않는다.** 잠긴 옵션이면 추가금을 빼고(`locked`), 주관식은 추가금이 없다.
 * 바뀐 것이 없으면 null
 */
export function toUpdateOptionBody(
  base: OptionFormValues,
  v: OptionFormValues,
  { locked, yesNo }: { locked: boolean; yesNo: boolean },
): UpdateOptionRequest | null {
  const body: UpdateOptionRequest = {};
  if (base.name.trim() !== v.name.trim()) body.name = v.name.trim();
  if (base.description.trim() !== v.description.trim()) body.description = v.description.trim();
  if (yesNo && !locked) {
    const before = optionPriceOf(base.yesAdditionalPrice);
    const after = optionPriceOf(v.yesAdditionalPrice);
    if (after !== null && after !== before) body.yesAdditionalPrice = after;
  }
  return Object.keys(body).length > 0 ? body : null;
}

/** 옵션 서버 코드 → 칸(patterns §24 P12) */
export const OPTION_FIELD_ERRORS = {
  Option_Group_400_6: { field: 'description', message: OPTION_FORM_MESSAGE.descriptionTooLong },
  Option_Group_400_3: { field: 'yesAdditionalPrice', message: OPTION_FORM_MESSAGE.price },
  Item_Option_Group_400_4: { field: 'yesAdditionalPrice', message: OPTION_FORM_MESSAGE.paidOnFree },
} as const satisfies Record<string, { field: OptionFormField; message: string }>;
