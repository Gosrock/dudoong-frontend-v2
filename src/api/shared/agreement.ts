/**
 * 동의 기록 필드(백엔드 #840·#850 — `RegisterRequest`·`V2CreateOrderRequest`·`V2TicketItemRequest` @432cce4).
 * 동의 필드는 모두 선택이고 서버는 `true`일 때만 기록한다. 백엔드가 `agreement.enforce`를 켜면 필요한 필드가
 * `true`가 아닐 때 400 `Agreement_400_1`(api-contract §4·§6·§9).
 *
 * 규칙: **사용자가 화면에서 체크한 값만 보낸다.** 화면 칸 없이 `true`를 만들어 보내지 않는다(동의 위조).
 * 칸이 아직 없는 필드(만 14세·호스트 제공 동의·두둥티켓 고지·환불 의무 — design-requests Q42)는 모델에 상태만 있고, 칸 플래그
 * (`AGE_OVER_14_FIELD`·`HOST_PROVISION_FIELD`·`DUDOONG_NOTICE_FIELD`·`REFUND_OBLIGATION_FIELD`, 기본 false)를 켜면 필수가 된다.
 * 강제는 v1 호스트 어드민 가입 수정 배포 직후 켜진다(v1 Front #384, 2026-10-31) — 칸보다 먼저 켜지면 v2 가입·주문·두둥티켓 생성이 400.
 */

/**
 * 화면에 보여 준 동의 문구 버전. 약관 문구가 바뀌면 올린다(legal-copy 머리말, api-contract §4). v2는 앱 하나라 상수 하나.
 * `'2026-10'`(2026-10-25 전면 개정) → `'2026-11'`(제19조②·제27조③·제29조③1호 일부 개정, 2026-11-07 시행 — v1 Front #385,
 * 사용자 결정 2026-10-31). v1은 #385에서 올리지 않아 v1 값은 `'2026-10'` 그대로다.
 */
export const AGREEMENT_VERSION = '2026-11';
/**
 * 서버가 동의를 거절했을 때(400 `Agreement_400_1` — 동의 강제가 켜졌는데 필수 동의가 빠짐) 화면 문구. 세 화면(가입·주문·티켓 폼)이
 * 같이 쓴다. 화면은 체크해 둔 동의를 모두 풀고 지금 보이는 문구로 다시 체크받는다(patterns §24 — 2026-11-01 칸 붙임)
 */
export const AGREEMENT_REJECTED_MESSAGE = '필수 동의를 다시 확인하고 체크해 주세요.';
export const AGREEMENT_REJECTED_CODE = 'Agreement_400_1';

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
