import { type ApiError, getErrorCode, isApiError } from './errors';

export type CodeHandlers = Record<string, (e: ApiError) => void>;

/**
 * 화면이 직접 처리할 변경 에러 코드를 한 곳에 적는다(patterns §4-5, tech-decisions §4).
 * 전역 `MutationCache.onError`는 화면의 `onError`보다 먼저 돌아서, 처리할 코드를 `meta.handledCodes`에 미리 적어야
 * 전역 토스트가 빠진다. 목록을 처리 함수의 키에서 만들어 둘이 어긋나지 않게 한다.
 *
 * ```ts
 * useMutation({ ...createOrderMutation(), ...handleCodes({ Order_400_22: () => setFormError('…') }) })
 * ```
 * 화면이 `onError`를 따로 써야 하면 이 결과의 `onError`도 함께 불러야 한다(펼친 뒤 덮어쓰면 분기가 사라진다).
 */
export function handleCodes(map: CodeHandlers) {
  return {
    meta: { handledCodes: Object.keys(map) },
    onError: (e: unknown) => {
      const code = getErrorCode(e);
      if (code === null || !isApiError(e) || !Object.hasOwn(map, code)) return;
      map[code]?.(e);
    },
  };
}

/** 전역 토스트가 이 에러를 화면에 맡기는지. `meta.handled`이거나 `meta.handledCodes`에 코드가 있으면 참. */
export function isHandledByScreen(meta: Record<string, unknown> | undefined, e: unknown): boolean {
  if (!meta) return false;
  if (meta.handled === true) return true;
  const codes = meta.handledCodes;
  const code = getErrorCode(e);
  return code !== null && Array.isArray(codes) && codes.includes(code);
}
