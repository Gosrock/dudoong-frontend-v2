import { z } from 'zod';

/**
 * 서버 날짜 `yyyy.MM.dd HH:mm`(Asia/Seoul, 초 없음 — api-contract §1) ↔ `Date`.
 * 한국은 서머타임이 없어 UTC+9 고정으로 계산한다. 실행 환경의 시간대(`TZ`)를 쓰지 않는다 —
 * `Date`의 로컬 메서드(`getHours` 등)와 `new Date(y, m, …)`를 쓰지 않고 UTC 메서드만 쓴다.
 *
 * 스키마는 문자열을 그대로 두고(`kstDateTime`), 표시 직전에만 변환한다(patterns §11).
 * 표시용 포맷(날짜만, 요일 포함 등)은 화면 Phase에서 이 파일에 더한다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const PATTERN = /^(\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2})$/;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** 형식과 달력 값(2월 30일, 24시 등)이 맞으면 KST 벽시계 값을 돌려준다. */
function readParts(value: string) {
  const m = PATTERN.exec(value);
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  if (month < 1 || month > 12 || hour > 23 || minute > 59) return null;
  // Date.UTC는 넘치는 값을 다음 달로 넘긴다 — 되돌려 비교해 2월 30일 같은 값을 거른다
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day, hour, minute };
}

/** 서버 날짜 문자열인지. 형식뿐 아니라 실제 있는 날짜·시각인지도 본다. */
export const isKstDateTime = (value: string) => readParts(value) !== null;

/**
 * 응답 스키마용. 값은 문자열 그대로 두고 형식만 검사한다 — 틀리면 `PARSE_ERROR`(계약 위반).
 * `LocalDateTime?` 필드는 `kstDateTime.nullable()`.
 */
export const kstDateTime = z.string().refine(isKstDateTime, { message: 'yyyy.MM.dd HH:mm' });

/**
 * `'2026.10.17 19:30'`(KST) → `Date`. 형식이 틀리면 `RangeError`를 던진다.
 * 응답 값은 스키마(`kstDateTime`)를 이미 통과했으므로 여기서 던지면 호출부 버그다.
 * 사용자 입력처럼 틀릴 수 있는 값은 먼저 `isKstDateTime`으로 거른다.
 */
export function parseKstDateTime(value: string): Date {
  const p = readParts(value);
  if (!p) throw new RangeError('날짜 형식이 yyyy.MM.dd HH:mm이 아니다');
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - KST_OFFSET_MS);
}

/** `Date` → `'yyyy.MM.dd HH:mm'`(KST). 초 이하는 버린다. 잘못된 Date(`NaN`)면 `RangeError`. */
export function formatKstDateTime(date: Date): string {
  const time = date.getTime();
  if (Number.isNaN(time)) throw new RangeError('잘못된 Date');
  const k = new Date(time + KST_OFFSET_MS);
  const year = k.getUTCFullYear();
  if (year < 0 || year > 9999) throw new RangeError('연도가 0~9999 밖이다');
  return `${pad(year, 4)}.${pad(k.getUTCMonth() + 1)}.${pad(k.getUTCDate())} ${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}`;
}
