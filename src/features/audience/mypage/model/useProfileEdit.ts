'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { handleCodes } from '@/api/handle-codes';
import { updateMeMutation } from '@/api/me/mutations';
import { meQuery } from '@/api/me/queries';
import type { Me } from '@/api/me/schema';
import { uploadImage } from '@/api/upload';
import { useSession } from '@/features/shared/auth/useSession';

import { nicknameError, PROFILE_ERROR_MESSAGE } from './profile';

/**
 * 프로필 편집(`/mypage` 안, GM-1 · PM-2 · PM-3). 보호 화면이라 세션(`Me`)은 이미 있다.
 * 성공 응답(`Me`, GM-1과 같은 모양)을 세션 키(`['me']`)에 바로 넣는다 — 헤더·햄버거가 같은 키를 읽는다(tech-decisions §4).
 *
 * - `name.save(값)` — 2~7자(앞뒤 공백 제거) 검증 뒤 PM-2 `{name}`. `USER_400_4`·400 `BAD_REQUEST` → 칸 오류
 * - `image.change(file)` — PM-3 발급 → S3 PUT → PM-2 `{profileImageKey}` 한 흐름(`src/api/upload.ts`). `USER_400_5`(본인 이미지가
 *   아님)·업로드 실패는 `image.error`, `image.retry()`가 같은 파일로 **발급부터 다시** 한다. 확장자가 틀리면 요청 없이 오류
 * - `image.reset()` — PM-2 `{profileImageKey: ''}`(기본 이미지)
 */
export function useProfileEdit() {
  const queryClient = useQueryClient();
  const session = useSession();
  const profile: Me | undefined = session.status === 'session' ? session.me : undefined;
  const applyProfile = useCallback(
    (me: Me) => queryClient.setQueryData(meQuery().queryKey, me),
    [queryClient],
  );

  // ─── 닉네임 ───
  const [nameError, setNameError] = useState<string | null>(null);
  const nameCodes = useMemo(
    () =>
      handleCodes({
        USER_400_4: () => setNameError(PROFILE_ERROR_MESSAGE.USER_400_4),
        // 닉네임만 보내므로 본문 검증 실패(공백만·길이 — #884 이후 공백만은 이 코드)는 닉네임 칸 오류다
        BAD_REQUEST: () => setNameError(PROFILE_ERROR_MESSAGE.USER_400_4),
      }),
    [],
  );
  const nameMutation = useMutation({
    ...updateMeMutation(),
    ...nameCodes,
    onSuccess: applyProfile,
  });
  const saveName = useCallback(
    async (raw: string) => {
      const local = nicknameError(raw);
      setNameError(local);
      if (local || nameMutation.isPending) return;
      await nameMutation.mutateAsync({ name: raw.trim() }).catch(() => undefined);
    },
    [nameMutation],
  );

  // ─── 이미지 ───
  const [imageError, setImageError] = useState<string | null>(null);
  const lastFile = useRef<File | null>(null);
  const imageCodes = useMemo(() => {
    const show = (code: keyof typeof PROFILE_ERROR_MESSAGE) => () =>
      setImageError(PROFILE_ERROR_MESSAGE[code]);
    return handleCodes({
      USER_400_5: show('USER_400_5'),
      UPLOAD_INVALID_EXTENSION: show('UPLOAD_INVALID_EXTENSION'),
      UPLOAD_PUT_FAILED: show('UPLOAD_PUT_FAILED'),
    });
  }, []);
  const imageMutation = useMutation({
    mutationKey: ['me', 'profile-image'],
    mutationFn: async (file: File | null, context) => {
      const profileImageKey =
        file === null ? '' : (await uploadImage({ target: { kind: 'profile' }, file })).key;
      return updateMeMutation().mutationFn!({ profileImageKey }, context);
    },
    ...imageCodes,
    onSuccess: applyProfile,
  });
  const runImage = useCallback(
    async (file: File | null) => {
      if (imageMutation.isPending) return;
      setImageError(null);
      lastFile.current = file;
      // 표에 없는 실패(429·네트워크 등)는 전역 토스트가 맡는다
      await imageMutation.mutateAsync(file).catch(() => undefined);
    },
    [imageMutation],
  );

  return {
    profile,
    name: { save: saveName, pending: nameMutation.isPending, error: nameError },
    image: {
      change: (file: File) => runImage(file),
      reset: () => runImage(null),
      /** 마지막으로 고른 파일로 발급부터 다시(`USER_400_5`·S3 실패 뒤) */
      retry: () => (lastFile.current ? runImage(lastFile.current) : Promise.resolve()),
      pending: imageMutation.isPending,
      error: imageError,
    },
  };
}
