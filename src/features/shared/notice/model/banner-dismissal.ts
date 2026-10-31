/**
 * 상단 배너 닫기 기록(Claude 판단 — implementation-log P9c-L). 닫은 공지 id를 이 브라우저의 `localStorage`에 남겨
 * 새로고침·다음 방문에도 다시 띄우지 않는다. 새 공지(새 id)는 다시 뜬다. 관객·호스팅 센터가 같은 기록을 쓴다(같은 공지면 같이 닫힌다).
 *
 * 저장소를 쓸 수 없으면(비공개 모드·막힌 저장소) 이 탭 메모리에만 남는다. 다른 탭은 `storage` 이벤트로 따라온다.
 */

export const BANNER_DISMISSED_KEY = 'dd:noticeBannerDismissed';

/** 남길 id 수 상한 — 끝난 배너 id가 쌓이지 않게 오래된 것부터 버린다 */
export const BANNER_DISMISSED_MAX = 50;

const listeners = new Set<() => void>();
/** 저장소를 쓸 수 없을 때(없음·쓰기 실패)의 기록. 한 번 실패하면 이 탭은 메모리만 본다 */
let memoryOnly = false;
let memory: number[] = [];
let cachedRaw: string | null | undefined;
let cachedIds: number[] = [];

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readRaw(): string | null {
  try {
    return storage()?.getItem(BANNER_DISMISSED_KEY) ?? null;
  } catch {
    return null;
  }
}

function parse(raw: string | null): number[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is number => Number.isSafeInteger(v)) : [];
  } catch {
    return [];
  }
}

/** 닫은 id 목록. 같은 저장 값이면 같은 배열을 돌려준다(`useSyncExternalStore` 스냅샷) */
export function readDismissedBanners(): readonly number[] {
  if (memoryOnly || storage() === null) return memory;
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIds = parse(raw);
  }
  return cachedIds;
}

/** 서버·하이드레이션 스냅샷 — 저장소를 읽지 않는다 */
export const SERVER_DISMISSED: readonly number[] = [];

export function dismissBanner(noticeId: number) {
  const prev = readDismissedBanners();
  if (prev.includes(noticeId)) return;
  const next = [...prev, noticeId].slice(-BANNER_DISMISSED_MAX);
  memory = next;
  try {
    const s = storage();
    if (s) s.setItem(BANNER_DISMISSED_KEY, JSON.stringify(next));
    else memoryOnly = true;
  } catch {
    // 저장소가 막혀 있으면 이 탭 메모리에만 남는다
    memoryOnly = true;
  }
  listeners.forEach((l) => l());
}

export function subscribeDismissedBanners(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === BANNER_DISMISSED_KEY) listener();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

/** 테스트용 — 메모리 기록을 비운다(저장소는 테스트가 따로 지운다) */
export function resetDismissedBannersMemory() {
  memoryOnly = false;
  memory = [];
  cachedRaw = undefined;
  cachedIds = [];
}
