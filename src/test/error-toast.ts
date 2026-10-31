import { vi } from 'vitest';

import { type ErrorNotifier, setErrorNotifier } from '@/api/error-toast';

/**
 * 공용 에러 토스트 감시. `vitest.setup.ts`가 테스트마다 비우고 다시 등록한다 — 테스트는
 * `expect(errorToast).not.toHaveBeenCalled()`(화면이 맡음) / `toHaveBeenCalledWith(문구, 'mutation:<코드>')`(공용 토스트)로 본다.
 * 테스트가 `setErrorNotifier`로 따로 바꾸면 다음 테스트 전에 이것으로 돌아온다.
 */
export const errorToast = vi.fn<ErrorNotifier>();

export function resetErrorToast() {
  errorToast.mockReset();
  setErrorNotifier(errorToast);
}
