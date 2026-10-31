import type { QueryClient } from '@tanstack/react-query';

import { isEventManageQueryKey, MY_EVENTS_KEY } from '@/api/event/queries';
import {
  hostDetailQuery,
  hostMembersQuery,
  hostViewerQuery,
  MY_HOSTS_KEY,
} from '@/api/host/queries';
import type { HostMember, HostViewer } from '@/api/host/schema';
import { meQuery } from '@/api/me/queries';

/**
 * 호스트 설정·멤버 변경 뒤의 캐시 반영(plan P10b, patterns §4-2 · §22). 변경 응답이 "화면을 다시 그릴 값"이라 받은 값을 바로 넣고,
 * 같은 값을 보여 주는 다른 쿼리만 무효화한다.
 */

/** 멤버 변경 4종(PH-7 · PH-10 · DH-11 · PH-12)의 응답 = 변경 뒤 멤버 전체 목록 → GH-6 키에 그대로 */
export function applyMembers(queryClient: QueryClient, hostId: string, members: HostMember[]) {
  queryClient.setQueryData(hostMembersQuery(hostId).queryKey, members);
}

/**
 * 멤버 수가 바뀌었다(초대·삭제) — 호스트 홈의 `memberCount`(GH-3 공개·viewer). GH-6 키(`['hosts', id, 'members']`)는 방금 넣었으므로
 * 접두가 아니라 두 키만 정확히 무효화한다.
 */
export function invalidateHostSummary(queryClient: QueryClient, hostId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: hostDetailQuery(hostId).queryKey, exact: true }),
    queryClient.invalidateQueries({ queryKey: hostViewerQuery(hostId).queryKey, exact: true }),
  ]);
}

/**
 * PH-4 성공 — 응답(GH-3과 같은 모양, 요청자 기준)을 viewer 키에 넣고, 이름·소개·이미지·연락처를 보여 주는 다른 쿼리를 무효화한다:
 * 공개 GH-3(호스트 홈), GH-1(카드 이름·이미지), GE-1(카드의 호스트 이름), GM-1(햄버거 호스트 줄 이름·이미지).
 */
export function applyUpdatedHost(queryClient: QueryClient, hostId: string, host: HostViewer) {
  queryClient.setQueryData(hostViewerQuery(hostId).queryKey, host);
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: hostDetailQuery(hostId).queryKey, exact: true }),
    queryClient.invalidateQueries({ queryKey: MY_HOSTS_KEY }),
    queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY }),
    queryClient.invalidateQueries({ queryKey: meQuery().queryKey, exact: true }),
  ]);
}

/**
 * 마스터 양도(PH-12) 뒤 — 내가 매니저가 됐으므로 `myRole`을 주는 쿼리를 모두 무효화한다(plan P10b, patterns §22):
 * GH-1(`MY_HOSTS_KEY`), GH-3 viewer, GE-1(`MY_EVENTS_KEY`), GE-3(`['events', id, 'manage']` — 어느 공연이 이 호스트 것인지 몰라 모양 전체),
 * 그리고 GM-1(`hosts[].myRole` — 햄버거 호스트 줄).
 * 다른 멤버의 역할 변경(PH-10)은 내 `myRole`을 바꾸지 않으므로 부르지 않는다.
 */
export function invalidateMyRoleQueries(queryClient: QueryClient, hostId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: MY_HOSTS_KEY }),
    queryClient.invalidateQueries({ queryKey: hostViewerQuery(hostId).queryKey, exact: true }),
    queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY }),
    queryClient.invalidateQueries({ predicate: (q) => isEventManageQueryKey(q.queryKey) }),
    queryClient.invalidateQueries({ queryKey: meQuery().queryKey, exact: true }),
  ]);
}
