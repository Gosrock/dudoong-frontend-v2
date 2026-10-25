import { describe, expect, it } from 'vitest';

import { me } from '../__mocks__/fixtures/me';
import { archiveEvents, archiveYears, followingHosts } from '../__mocks__/fixtures/mypage';
import { paginate } from '../__mocks__/respond';
import { ArchiveSchema, FollowingHostPageSchema, MeSchema, UpdateMeRequestSchema } from './schema';

/**
 * 마이페이지 스키마(GM-1·PM-2·GM-4·GM-5). 근거: 백엔드 `V2MyPageResponses.kt`·`V2MyPageRequests.kt`(@432cce4),
 * `V2MyPageNameRuleTest`(닉네임 규칙 = v1 `@NotBlank` + `@Size(2, 7)`).
 */
describe('응답', () => {
  it('GM-1·PM-2 mock 프로필', () => {
    expect(MeSchema.parse(me)).toEqual(me);
  });

  it('GM-4 관심 호스트 페이지 — 대표 공연 없음(null)·D-day 키 `dDay`', () => {
    const page = paginate(followingHosts, 0, 50);
    expect(FollowingHostPageSchema.parse(page)).toEqual(page);
    expect(followingHosts.some((h) => h.representativeEvent === null)).toBe(true);
  });

  it('GM-4 대표 공연의 모르는 displayStatus는 UNKNOWN', () => {
    const page = paginate(
      [
        {
          ...followingHosts[0]!,
          representativeEvent: { ...followingHosts[0]!.representativeEvent!, displayStatus: 'NEW' },
        },
      ],
      0,
      20,
    );
    expect(FollowingHostPageSchema.parse(page).content[0]!.representativeEvent!.displayStatus).toBe(
      'UNKNOWN',
    );
  });

  it('GM-5 아카이빙 `{years, events: 페이지}` — orderUuid null 허용', () => {
    const body = { years: archiveYears, events: paginate(archiveEvents, 0, 20) };
    expect(ArchiveSchema.parse(body)).toEqual(body);
    expect(archiveEvents.some((e) => e.orderUuid === null)).toBe(true);
  });
});

describe('PM-2 본문(엄격)', () => {
  it.each<[string, Record<string, unknown>, boolean]>([
    ['닉네임 2자', { name: '두둥' }, true],
    ['닉네임 7자', { name: '가나다라마바사' }, true],
    ['닉네임 1자', { name: '가' }, false],
    ['닉네임 8자', { name: '가나다라마바사아' }, false],
    ['닉네임 공백만(@NotBlank)', { name: '   ' }, false],
    ['이미지 key', { profileImageKey: 'user/1/a.png' }, true],
    ['기본 이미지(빈 문자열)', { profileImageKey: '' }, true],
    ['key 256자', { profileImageKey: 'k'.repeat(256) }, false],
    ['바꿀 필드 없음', {}, false],
    ['모르는 필드', { name: '두둥', email: 'x' }, false],
  ])('%s → %s', (_, body, ok) => {
    expect(UpdateMeRequestSchema.safeParse(body).success).toBe(ok);
  });
});
