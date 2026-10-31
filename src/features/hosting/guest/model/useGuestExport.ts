'use client';

import { useMutation, type UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import type { Downloaded } from '@/api/client';
import { getErrorCode } from '@/api/errors';
import { eventManageQuery } from '@/api/event/queries';
import { handleError, settle } from '@/api/settle';
import { can } from '@/features/shared/permission/model/can';
import { saveBlob } from '@/utils/download';

import { EXPORT_TOO_MANY_MESSAGE } from './guest-rules';

/**
 * 엑셀 다운로드(GR-6·GI-3) — 매니저 이상만(`downloadExcel`, #846). 버튼은 `canExport`로 숨긴다.
 * - 래퍼 없는 xlsx를 받아 `saveBlob`으로 저장(파일 이름은 `Content-Disposition`, 없으면 `fallbackName`)
 * - 1만 행 초과(`Order_400_19`·`IssuedTicket_400_7`) → `error` 안내
 * - 일반 멤버 403 `HOST_400_1`(정상 흐름에선 버튼이 없다) → 일반 403 처리(공용 토스트, handleError) + GE-3 다시 읽기(`myRole` 갱신)
 */
export function useGuestExport<P>(
  eventId: string,
  myRole: Parameters<typeof can>[0],
  mutation: UseMutationOptions<Downloaded, Error, P>,
  fallbackName: string,
) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const m = useMutation(mutation);
  const canExport = can(myRole, 'downloadExcel');

  /** 저장했으면 `true`. 권한이 없거나 받는 중이면 요청하지 않는다 */
  const download = useCallback(
    async (params: P) => {
      if (!canExport || m.isPending) return false;
      setError(null);
      const r = await settle(m.mutateAsync(params));
      if (r.ok) {
        saveBlob(r.data.blob, r.data.filename, fallbackName);
        return true;
      }
      if (getErrorCode(r.error) === 'HOST_400_1') {
        void queryClient.invalidateQueries({
          queryKey: eventManageQuery(eventId).queryKey,
          exact: true,
        });
      }
      // HOST_400_1을 포함해 표에 없는 실패는 공용 토스트
      handleError(r.error, {
        Order_400_19: () => setError(EXPORT_TOO_MANY_MESSAGE),
        IssuedTicket_400_7: () => setError(EXPORT_TOO_MANY_MESSAGE),
      });
      return false;
    },
    [canExport, eventId, fallbackName, m, queryClient],
  );

  return { canExport, exporting: m.isPending, error, dismissError: () => setError(null), download };
}
