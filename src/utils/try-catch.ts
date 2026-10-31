/** `tryCatch`의 결과. Go처럼 `[값, 에러]` — 둘 중 하나만 있다 */
export type Result<T> = [data: T, error: null] | [data: null, error: Error];

/**
 * 프로미스를 `[data, error]`로 받는다 — **절대 throw하지 않는다**(Go 스타일).
 * 기본은 `try/catch`를 쓰고, 요청을 **연달아** 보내며 단계마다 실패를 다르게 다룰 때만 쓴다(tech-decisions §4, patterns §4-5).
 * `Error`가 아닌 값이 던져지면 `Error`로 감싸고 원래 값을 `cause`에 둔다.
 *
 * ```ts
 * const [created, createError] = await tryCatch(createMutation.mutateAsync(body));
 * if (createError) return handleError(createError, { … });
 * const [, attachError] = await tryCatch(attachMutation.mutateAsync(created.id));
 * if (attachError) return handleError(attachError, {}, { otherwise: () => setPartial(true) });
 * ```
 */
export async function tryCatch<T>(promise: Promise<T>): Promise<Result<T>> {
  try {
    return [await promise, null];
  } catch (e) {
    return [null, e instanceof Error ? e : new Error(String(e), { cause: e })];
  }
}
