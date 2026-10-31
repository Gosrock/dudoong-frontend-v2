import type { QueryClient } from '@tanstack/react-query';

import {
  eventChecklistQuery,
  eventManageQuery,
  eventPublicKeys,
  eventSectionsManageQuery,
  MY_EVENTS_KEY,
} from '@/api/event/queries';
import type { EventManage, EventSection } from '@/api/event/schema';
import { MY_HOSTS_KEY } from '@/api/host/queries';

/**
 * 공연 관리 변경 뒤 캐시 반영(plan P11, patterns §11 "변경 응답으로 캐시를 바로 채운다"·§23 "공연 등록 뒤").
 * 무효화는 모두 정확한 키(`exact`) 또는 목록 접두 키 — GE-3 키 아래의 체크리스트·편집용 섹션을 덩달아 다시 읽지 않게.
 */

const invalidateExact = (qc: QueryClient, queryKey: readonly unknown[]) =>
  qc.invalidateQueries({ queryKey, exact: true });

/** 관객 공연 상세의 공개 키(GP-3 공개·viewer, GE-5) — 저장 뒤 공연 상세를 열면 바로 반영 */
const invalidatePublic = (qc: QueryClient, eventId: string) =>
  Promise.all(eventPublicKeys(eventId).map((key) => invalidateExact(qc, key)));

/** PE-2 뒤 — 공연준비 홈 공연 탭(GE-1)과 호스트 카드의 공연 수(GH-1 `eventCount`) */
export const invalidateAfterCreate = (qc: QueryClient) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: MY_EVENTS_KEY }),
    qc.invalidateQueries({ queryKey: MY_HOSTS_KEY }),
  ]);

/**
 * PE-4 뒤 — 응답(GE-3 모양)을 GE-3 키에 넣고, 체크리스트 ①이 바뀌었을 수 있어 GE-7, 카드(GE-1 — 이름·포스터·일정·장소),
 * 관객 공연 상세 공개 키를 무효화한다
 */
export async function applySavedBasic(qc: QueryClient, eventId: string, saved: EventManage) {
  qc.setQueryData(eventManageQuery(eventId).queryKey, saved);
  await Promise.all([
    invalidateExact(qc, eventChecklistQuery(eventId).queryKey),
    qc.invalidateQueries({ queryKey: MY_EVENTS_KEY }),
    invalidatePublic(qc, eventId),
  ]);
}

/** PE-6 뒤 — 응답(저장된 섹션)을 편집용 GE-5 키에 넣고, 체크리스트 ②(GE-7·GE-3 `checklist`)와 관객 공연 상세 공개 키를 무효화한다 */
export async function applySavedSections(qc: QueryClient, eventId: string, saved: EventSection[]) {
  qc.setQueryData(eventSectionsManageQuery(eventId).queryKey, saved);
  await Promise.all([
    invalidateExact(qc, eventChecklistQuery(eventId).queryKey),
    invalidateExact(qc, eventManageQuery(eventId).queryKey),
    invalidatePublic(qc, eventId),
  ]);
}

/**
 * PE-8 뒤 — 응답이 `{eventId, status, displayStatus}`뿐이라 GE-3(메뉴·대시보드 모드)·GE-1(공연준비 홈)만 무효화한다.
 * 등록 뒤에는 체크리스트를 그리지 않으므로 GE-7은 무효화하지 않는다(plan P11, patterns §23)
 */
export const invalidateAfterRegister = (qc: QueryClient, eventId: string) =>
  Promise.all([
    invalidateExact(qc, eventManageQuery(eventId).queryKey),
    qc.invalidateQueries({ queryKey: MY_EVENTS_KEY }),
  ]);

/** DE-9 뒤 — 공연준비 홈 목록(GE-1)과 호스트 카드 공연 수(GH-1). 지운 공연의 GE-3 이하 캐시는 버린다 */
export async function applyDeleted(qc: QueryClient, eventId: number) {
  qc.removeQueries({ queryKey: ['events', String(eventId), 'manage'] });
  await invalidateAfterCreate(qc);
}
