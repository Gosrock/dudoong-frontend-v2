'use client';

import { useMutation, type UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import type { Downloaded } from '@/api/client';
import { getErrorCode } from '@/api/errors';
import { eventManageQuery } from '@/api/event/queries';
import { handleCodes } from '@/api/handle-codes';
import { can } from '@/features/shared/permission/model/can';
import { saveBlob } from '@/utils/download';

import { EXPORT_TOO_MANY_MESSAGE } from './guest-rules';

/**
 * 엑셀 다운로드(GR-6·GI-3) — 매니저 이상만(`downloadExcel`, #846). 버튼은 `canExport`로 숨긴다.
 * - 래퍼 없는 xlsx를 받아 `saveBlob`으로 저장(파일 이름은 `Content-Disposition`, 없으면 `fallbackName`)
 * - 1만 행 초과(`Order_400_19`·`IssuedTicket_400_7`) → `error` 안내
 * - 일반 멤버 403 `HOST_400_1`(정상 흐름에선 버튼이 없다) → 일반 403 처리(전역 토스트) + GE-3 다시 읽기(`myRole` 갱신)
 */
export function useGuestExport<P>(
  eventId: string,
  myRole: Parameters<typeof can>[0],
  mutation: UseMutationOptions<Downloaded, Error, P>,
  fallbackName: string,
) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const codes = useMemo(
    () =>
      handleCodes({
        Order_400_19: () => setError(EXPORT_TOO_MANY_MESSAGE),
        IssuedTicket_400_7: () => setError(EXPORT_TOO_MANY_MESSAGE),
      }),
    [],
  );
  const m = useMutation({
    ...mutation,
    ...codes,
    onError: (e: Error) => {
      codes.onError(e);
      if (getErrorCode(e) === 'HOST_400_1') {
        void queryClient.invalidateQueries({
          queryKey: eventManageQuery(eventId).queryKey,
          exact: true,
        });
      }
    },
  });
  const canExport = can(myRole, 'downloadExcel');

  /** 저장했으면 `true`. 권한이 없거나 받는 중이면 요청하지 않는다 */
  const download = useCallback(
    async (params: P) => {
      if (!canExport || m.isPending) return false;
      setError(null);
      try {
        const { blob, filename } = await m.mutateAsync(params);
        saveBlob(blob, filename, fallbackName);
        return true;
      } catch {
        return false;
      }
    },
    [canExport, fallbackName, m],
  );

  return { canExport, exporting: m.isPending, error, dismissError: () => setError(null), download };
}
