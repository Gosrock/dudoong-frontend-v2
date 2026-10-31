import type { Contact } from '../shared/common-schema';

/**
 * 백엔드 `PrivacyMasker`(#822, dev 432cce4 `DuDoong-Domain/.../common/util/PrivacyMasker.kt`)를 그대로 옮긴 mock용 가림.
 * 공개 GET GP-3·GH-3은 비로그인(쿠키 없음·만료) 요청이면 연락처 중 전화·이메일만 가려 준다(`V2ContactResponse.masked`).
 */

const MASK = '*';
const EMAIL_MASK = '***';
/** 숫자가 이 개수 이하면 끝 4자리만 남긴다 */
const PHONE_SHORT_DIGITS = 8;

const isDigit = (ch: string) => ch >= '0' && ch <= '9';

/** `010-1234-5678` → `010-****-5678`, 숫자 8자리 이하는 끝 4자리만, 4자리 이하는 모두. 마지막 숫자 뒤 글자는 잘라낸다 */
export function maskPhone(phone: string): string {
  if (phone.trim() === '') return phone;
  const chars = [...phone];
  let lastDigit = -1;
  chars.forEach((ch, i) => {
    if (isDigit(ch)) lastDigit = i;
  });
  if (lastDigit < 0) return chars.map(() => MASK).join('');
  const trimmed = chars.slice(0, lastDigit + 1).join('');
  const digitCount = [...trimmed].filter(isDigit).length;
  const groups = trimmed.split('-');
  if (digitCount > PHONE_SHORT_DIGITS && groups.length >= 3) {
    return [
      groups[0],
      ...groups.slice(1, -1).map((g) => MASK.repeat(g.length)),
      groups[groups.length - 1],
    ].join('-');
  }
  const keepHead = digitCount > PHONE_SHORT_DIGITS ? 3 : 0;
  const keepTail = digitCount > 4 ? 4 : 0;
  let seen = 0;
  return [...trimmed]
    .map((ch) => {
      if (!isDigit(ch)) return ch;
      seen++;
      return seen <= keepHead || seen > digitCount - keepTail ? ch : MASK;
    })
    .join('');
}

/** `abcd@gmail.com` → `ab***@gmail.com`, 아이디 2글자 이하 → `***@gmail.com`, `@` 없음·아이디 없음 → `***` */
export function maskEmail(email: string): string {
  if (email.trim() === '') return email;
  const at = email.lastIndexOf('@');
  if (at <= 0) return EMAIL_MASK;
  const local = email.slice(0, at);
  const head = local.length <= 2 ? '' : local.slice(0, 2);
  return head + EMAIL_MASK + email.slice(at);
}

/** 비로그인 응답의 연락처 — 전화·이메일만 가린다(인스타·오픈채팅·유튜브·기타는 공개 채널이라 그대로) */
export const maskContacts = (contacts: readonly Contact[]): Contact[] =>
  contacts.map((c) => ({
    ...c,
    value:
      c.type === 'PHONE' ? maskPhone(c.value) : c.type === 'EMAIL' ? maskEmail(c.value) : c.value,
  }));

/** 이름: 첫 글자 + 가운데 `*` + 끝 글자(2자면 첫 글자 + `*`, 1자면 `*`) — `김*수`(`PrivacyMasker.maskName`, 일반 멤버의 입금자명 #822) */
export function maskName(name: string): string {
  if (name.trim() === '') return name;
  const cps = [...name];
  if (cps.length <= 1) return MASK;
  if (cps.length === 2) return cps[0] + MASK;
  return cps[0] + MASK.repeat(cps.length - 2) + cps[cps.length - 1];
}
