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
