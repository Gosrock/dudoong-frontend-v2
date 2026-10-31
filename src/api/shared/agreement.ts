/**
 * 동의 기록 필드(백엔드 #840·#850 — `RegisterRequest`·`V2CreateOrderRequest`·`V2TicketItemRequest` @432cce4).
 * 동의 필드는 모두 선택이고 서버는 `true`일 때만 기록한다. 백엔드가 `agreement.enforce`를 켜면 필요한 필드가
 * `true`가 아닐 때 400 `Agreement_400_1`(api-contract §4·§6·§9).
 *
 * 규칙: **사용자가 화면에서 체크한 값만 보낸다.** 화면 칸 없이 `true`를 만들어 보내지 않는다(동의 위조).
 * 값을 만들 칸이 v2 계획에 없는 필드(만 14세·호스트 제공 동의·두둥티켓 고지·환불 의무)는 보내지 않는다 — design-requests Q42.
 */

/**
 * 화면에 보여 준 동의 문구 버전. 약관 문구가 바뀌면 올린다(legal-copy 머리말, api-contract §4). v2는 앱 하나라 상수 하나.
 * `'2026-10'`(2026-10-25 전면 개정) → `'2026-11'`(제19조②·제27조③·제29조③1호 일부 개정, 2026-11-07 시행 — v1 Front #385,
 * 사용자 결정 2026-10-31). v1은 #385에서 올리지 않아 v1 값은 `'2026-10'` 그대로다.
 */
export const AGREEMENT_VERSION = '2026-11';
/** `AgreementLog.VERSION_MAX_LENGTH` */
export const AGREEMENT_VERSION_MAX = 50;

export type AgreementFields<K extends string> = { [P in K]?: true } & {
  agreementVersion?: typeof AGREEMENT_VERSION;
};

/**
 * 사용자가 체크한(`true`) 동의만 남긴다. 하나라도 있으면 `agreementVersion`을 같이 싣고, 없으면 빈 객체(키 자체가 없다).
 *
 * ```ts
 * { ...body, ...agreementFields({ termsAgreed: consents.terms }) }
 * ```
 */
export function agreementFields<K extends string>(
  agreed: Partial<Record<K, boolean>>,
): AgreementFields<K> {
  const out: Partial<Record<string, true | string>> = {};
  for (const [key, value] of Object.entries(agreed)) if (value === true) out[key] = true;
  if (Object.keys(out).length === 0) return {};
  out.agreementVersion = AGREEMENT_VERSION;
  return out as AgreementFields<K>;
}
