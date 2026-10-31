import { isApiError, isValidationError } from './errors';

/** `reason`이 비었을 때(네트워크·타임아웃·파싱 실패·HTML 502) 띄우는 고정 문구 */
export const FALLBACK_ERROR_MESSAGE = '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';

/**
 * 형식·길이 검증 실패(`BAD_REQUEST`)에 띄우는 고정 문구. 이 응답의 `reason`은 필드→메시지 JSON이나 "Bad Request"라
 * 그대로 보이지 않는다(api-contract §1). 보통은 폼이 먼저 막아 여기까지 오지 않는다.
 */
export const VALIDATION_ERROR_MESSAGE = '입력한 내용을 다시 확인해 주세요.';

export type ErrorNotifier = (message: string, id: string) => void;

/**
 * `src/api`는 `src/ui`를 import할 수 없어(계층 규칙) 토스트를 주입받는다. 등록은 앱 셸(`providers.tsx`)이
 * `setErrorNotifier((message, id) => toast(message, { id }))`로 한 번 한다. 등록 전에는 아무것도 띄우지 않는다.
 */
let notifier: ErrorNotifier | null = null;
export function setErrorNotifier(fn: ErrorNotifier | null) {
  notifier = fn;
}

/** 공용 에러 토스트. 같은 `id`는 한 번만 보인다(토스트가 id로 합친다) */
export function notifyError(message: string, id: string) {
  notifier?.(message, id);
}

/** 공용 토스트 문구: 검증 실패는 고정 문구, 그 밖은 서버 `reason`, 비었으면 고정 문구 */
export function errorMessageOf(e: unknown): string {
  if (isValidationError(e)) return VALIDATION_ERROR_MESSAGE;
  return (isApiError(e) && e.reason) || FALLBACK_ERROR_MESSAGE;
}
