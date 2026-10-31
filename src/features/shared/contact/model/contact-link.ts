import type { Contact } from '@/api/shared/common-schema';

/**
 * 연락처 `type` 6종(+ 모르는 값) → 표시 라벨·링크. 매핑은 여기 한 곳에 둔다(patterns §14).
 * 쓰는 곳: 공연 상세 문의 버튼(P5b — design-requests Q20 기본안: 문의 = 연락처), 호스트 홈(P5c), 주문상세 문의(P9).
 *
 * 값은 자유 입력(200자, `PHONE`은 15자 — api-contract §5)이라 형식이 맞을 때만 링크를 만든다.
 * 링크는 `tel:`·`mailto:`·`http(s):`만 만든다 — 값에 `javascript:` 등이 들어 있어도 링크가 되지 않는다.
 * 링크를 만들 수 없으면 `href: null`(V에서 값을 글자로 보여 주고 복사만 둔다).
 *
 * 비로그인 GP-3·GH-3은 전화·이메일 값을 가려서 준다(백엔드 #822/#846 `PrivacyMasker` — `010-****-5678`,
 * `ab***@gmail.com`, `***@x.com`, `***`). 가린 값(`*` 포함)은 표시용 글자로만 두고 링크를 만들지 않는다(`masked: true`).
 * 원문 전화·이메일에는 `*`가 오지 않는다고 본다(전화는 숫자·구분 문자만, `*`가 든 이메일 아이디는 사실상 없다).
 */

export type ContactType = Contact['type'];

export const CONTACT_LABELS: Record<ContactType, string> = {
  PHONE: '전화',
  EMAIL: '이메일',
  INSTAGRAM: '인스타그램',
  OPEN_CHAT: '오픈채팅',
  YOUTUBE: '유튜브',
  ETC: '기타',
  UNKNOWN: '연락처',
};

export type ContactLink = {
  type: ContactType;
  label: string;
  /** 사용자가 입력한 값(앞뒤 공백 제거) */
  value: string;
  href: string | null;
  /** 새 탭으로 여는 외부 링크인지(`http(s):`) */
  external: boolean;
  /** 비로그인 응답에서 가려진 전화·이메일인지. 가린 값은 링크가 없다 */
  masked: boolean;
};

/** 백엔드가 가리는 유형(`V2ContactResponse.masked` — 전화·이메일만, 나머지는 공개 채널이라 그대로) */
const MASKABLE: ReadonlySet<ContactType> = new Set(['PHONE', 'EMAIL']);

/** 백엔드가 가린 값인지 — 가림 문자 `*`가 들어 있다 */
export const isMaskedContact = (type: ContactType, value: string) =>
  MASKABLE.has(type) && value.includes('*');

/** http(s) 주소면 정규화한 주소, 아니면 null. 스킴 없는 `open.kakao.com/...`도 https로 본다 */
function httpUrl(value: string): string | null {
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // 점이 없는 호스트(`foo`)는 주소로 보지 않는다
    if (!url.hostname.includes('.')) return null;
    return url.href;
  } catch {
    return null;
  }
}

const EMAIL = /^[^\s@:/]+@[^\s@:/]+\.[^\s@:/]+$/;
const HANDLE = /^@?([A-Za-z0-9._]{1,30})$/;
const YOUTUBE_HANDLE = /^@([A-Za-z0-9._-]{3,30})$/;

function hrefOf(type: ContactType, value: string): string | null {
  switch (type) {
    case 'PHONE': {
      const digits = value.replace(/[\s().-]/g, '');
      return /^\+?\d{3,15}$/.test(digits) ? `tel:${digits}` : null;
    }
    case 'EMAIL':
      return EMAIL.test(value) ? `mailto:${value}` : null;
    case 'INSTAGRAM': {
      const handle = HANDLE.exec(value);
      if (handle) return `https://www.instagram.com/${handle[1]}/`;
      return httpUrl(value);
    }
    case 'YOUTUBE': {
      const handle = YOUTUBE_HANDLE.exec(value);
      if (handle) return `https://www.youtube.com/@${handle[1]}`;
      return httpUrl(value);
    }
    case 'OPEN_CHAT':
    case 'ETC':
    case 'UNKNOWN':
      return httpUrl(value);
  }
}

export function contactLink(contact: Contact): ContactLink {
  const value = contact.value.trim();
  const masked = isMaskedContact(contact.type, value);
  const href = value === '' || masked ? null : hrefOf(contact.type, value);
  return {
    type: contact.type,
    label: CONTACT_LABELS[contact.type],
    value,
    href,
    external: href !== null && href.startsWith('http'),
    masked,
  };
}
