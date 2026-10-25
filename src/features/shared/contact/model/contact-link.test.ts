import { describe, expect, it } from 'vitest';

import type { Contact } from '@/api/shared/common-schema';

import { contactLink } from './contact-link';

describe('연락처 → 라벨·링크(문의 버튼 = 연락처, design-requests Q20)', () => {
  it.each<[string, Contact['type'], string, string, string | null]>([
    ['전화', 'PHONE', '010-1234-5678', '전화', 'tel:01012345678'],
    ['전화(괄호·공백)', 'PHONE', '(02) 123 4567', '전화', 'tel:021234567'],
    ['전화(국가번호)', 'PHONE', '+82-10-1234-5678', '전화', 'tel:+821012345678'],
    ['전화가 아닌 값', 'PHONE', '문자 주세요', '전화', null],
    ['이메일', 'EMAIL', 'band@example.com', '이메일', 'mailto:band@example.com'],
    ['이메일 형식 아님', 'EMAIL', 'band at example', '이메일', null],
    [
      '인스타 @아이디',
      'INSTAGRAM',
      '@gosrock_official',
      '인스타그램',
      'https://www.instagram.com/gosrock_official/',
    ],
    [
      '인스타 아이디만',
      'INSTAGRAM',
      'gosrock.band',
      '인스타그램',
      'https://www.instagram.com/gosrock.band/',
    ],
    [
      '인스타 주소',
      'INSTAGRAM',
      'https://instagram.com/gosrock',
      '인스타그램',
      'https://instagram.com/gosrock',
    ],
    [
      '오픈채팅 주소',
      'OPEN_CHAT',
      'https://open.kakao.com/o/mock',
      '오픈채팅',
      'https://open.kakao.com/o/mock',
    ],
    [
      '오픈채팅 스킴 없는 주소',
      'OPEN_CHAT',
      'open.kakao.com/o/abc',
      '오픈채팅',
      'https://open.kakao.com/o/abc',
    ],
    ['오픈채팅 주소 아님', 'OPEN_CHAT', '오픈채팅방 검색: 고스락', '오픈채팅', null],
    ['유튜브 @핸들', 'YOUTUBE', '@gosrock', '유튜브', 'https://www.youtube.com/@gosrock'],
    [
      '유튜브 주소',
      'YOUTUBE',
      'https://youtube.com/c/gosrock',
      '유튜브',
      'https://youtube.com/c/gosrock',
    ],
    ['기타 주소', 'ETC', 'https://gosrock.band', '기타', 'https://gosrock.band/'],
    ['기타 글', 'ETC', '현장 부스에서 문의', '기타', null],
    [
      '모르는 type은 주소일 때만 링크',
      'UNKNOWN',
      'https://x.example/a',
      '연락처',
      'https://x.example/a',
    ],
    ['모르는 type 글', 'UNKNOWN', '무엇', '연락처', null],
  ])('%s', (_, type, value, label, href) => {
    expect(contactLink({ type, value })).toMatchObject({ type, label, value, href });
  });

  it.each<[Contact['type'], string]>([
    ['OPEN_CHAT', 'javascript:alert(1)'],
    ['ETC', 'JavaScript:alert(1)'],
    ['INSTAGRAM', 'data:text/html,<script>alert(1)</script>'],
    ['YOUTUBE', 'vbscript:msgbox(1)'],
    ['EMAIL', 'javascript:alert(1)//@x.com'],
    ['UNKNOWN', 'ftp://files.example/a'],
  ])('%s에 위험한 스킴(%s)이 와도 링크를 만들지 않는다', (type, value) => {
    expect(contactLink({ type, value }).href).toBeNull();
  });

  it('http(s) 링크만 외부 링크(새 탭)로 본다', () => {
    expect(contactLink({ type: 'OPEN_CHAT', value: 'https://open.kakao.com/o/x' }).external).toBe(
      true,
    );
    expect(contactLink({ type: 'PHONE', value: '010-1111-2222' }).external).toBe(false);
    expect(contactLink({ type: 'ETC', value: '글' }).external).toBe(false);
  });

  it('앞뒤 공백을 지우고, 빈 값은 링크 없음', () => {
    expect(contactLink({ type: 'EMAIL', value: '  a@b.co ' })).toMatchObject({
      value: 'a@b.co',
      href: 'mailto:a@b.co',
    });
    expect(contactLink({ type: 'ETC', value: '   ' }).href).toBeNull();
  });
});

/**
 * 비로그인 GP-3·GH-3의 가린 값(백엔드 `PrivacyMasker`, #822 — 형식은 `PrivacyMaskerTest.kt`@432cce4의 기대값).
 * 가린 값은 글자 그대로 두고 링크를 만들지 않는다. 로그인 응답의 원문은 링크가 된다.
 */
describe('가린 전화·이메일은 링크가 없다(비로그인 응답, 백엔드 #822)', () => {
  it.each<[string, Contact['type'], string]>([
    ['전화 가운데 묶음', 'PHONE', '010-****-5678'],
    ['전화 가운데 3자리', 'PHONE', '010-***-5678'],
    ['전화 지역번호', 'PHONE', '02-****-5678'],
    ['전화 국가번호', 'PHONE', '+82 10-****-5678'],
    ['전화 구분 없음', 'PHONE', '010****5678'],
    ['전화 공백 구분', 'PHONE', '010 **** 5678'],
    ['전화 숫자 8자리 이하 — 끝 4자리만', 'PHONE', '****-5678'],
    ['전화 숫자 6자리', 'PHONE', '**-3456'],
    ['전화 숫자 4자리 이하 — 모두 가림', 'PHONE', '****'],
    ['전화 숫자 없음 — 모두 가림', 'PHONE', '***'],
    ['이메일 아이디 앞 2글자', 'EMAIL', 'ab***@gmail.com'],
    ['이메일 아이디 2글자 이하', 'EMAIL', '***@gmail.com'],
    ['이메일 아이디 1글자', 'EMAIL', '***@x.com'],
    ['이메일 골뱅이 없음', 'EMAIL', '***'],
  ])('%s(%s %s) → 표시 그대로, href 없음, masked', (_, type, value) => {
    expect(contactLink({ type, value })).toMatchObject({
      value,
      href: null,
      external: false,
      masked: true,
    });
  });

  it.each<[string, Contact['type'], string, string]>([
    ['전화', 'PHONE', '010-1234-5678', 'tel:01012345678'],
    ['전화 8자리', 'PHONE', '1234-5678', 'tel:12345678'],
    ['이메일', 'EMAIL', 'abcd@gmail.com', 'mailto:abcd@gmail.com'],
    ['이메일 아이디 2글자', 'EMAIL', 'ab@gmail.com', 'mailto:ab@gmail.com'],
  ])('로그인 응답의 원문 %s(%s)은 링크가 된다', (_, type, value, href) => {
    expect(contactLink({ type, value })).toMatchObject({ value, href, masked: false });
  });

  it('전화·이메일이 아닌 유형은 가리지 않으므로 `*`가 있어도 가린 값으로 보지 않는다', () => {
    expect(contactLink({ type: 'ETC', value: 'https://x.example/*' })).toMatchObject({
      masked: false,
      href: 'https://x.example/*',
    });
  });
});
