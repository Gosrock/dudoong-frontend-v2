import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import { MeSchema, type UpdateMeRequest } from './schema';

/**
 * PM-2 프로필 수정(로그인). 응답은 GM-1과 같은 `Me`라 화면이 세션 키(`meQuery`)에 그대로 넣는다(tech-decisions §4 —
 * 프로필 수정 뒤 세션 쿼리를 직접 갱신). 이미지는 업로드 모듈(`uploadImage({ target: { kind: 'profile' } })`)이 준 `key`.
 * - `USER_400_4` 닉네임 공백만, `USER_400_5` 본인에게 발급한 이미지 key가 아님(PM-3부터 다시)
 */
export const updateMeMutation = () =>
  mutationOptions({
    mutationFn: (body: UpdateMeRequest) => api.patch('me', MeSchema, body),
  });
