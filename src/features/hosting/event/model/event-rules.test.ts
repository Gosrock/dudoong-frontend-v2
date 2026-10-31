import { describe, expect, it } from 'vitest';

import type { EventManage, EventStatus } from '@/api/event/schema';
import type { HostRole } from '@/api/shared/common-schema';
import type { ActorRole } from '@/features/shared/permission/model/can';

import {
  basicInfoValuesOf,
  changedBasicFields,
  eventContactError,
  hasBasicInfoErrors,
  toggleTag,
  toUpdateEventBasicBody,
  validateBasicInfo,
} from './basic-info-form';
import { checklistItemsOf, checklistProgress } from './checklist';
import {
  createdEventHref,
  parsePreselectedHostId,
  parseWizardStep,
  selectableHostsOf,
  toCreateEventBody,
  validateCreateEvent,
} from './create-event-form';
import {
  canDeleteEvent,
  eventMenuOf,
  eventPublicHref,
  isHasTicketLocked,
  parseEventIdParam,
  readOnlyReasonOf,
} from './event-scope';
import { emptyPlace, placeError, toPlaceRequest } from './place';
import { scheduleError, scheduleInputOf, toScheduleRange } from './schedule';
import {
  isEmptyContent,
  isSectionsDirty,
  sectionInputsOf,
  toUpdateSectionsBody,
  validateSections,
  withAddedSection,
  withMovedSection,
  withoutSection,
} from './sections-form';

const NOW = new Date('2026-10-26T03:00:00Z'); // 2026.10.26 12:00 KST

const manage = (patch: Partial<EventManage> = {}): EventManage => ({
  eventId: 140,
  hostId: 11,
  hostName: '고스락',
  myRole: 'MASTER',
  posterImageKey: null,
  posterImageUrl: null,
  name: '공연',
  startAt: '2027.03.20 18:00',
  endAt: '2027.03.20 20:00',
  runTime: 120,
  place: null,
  contacts: [],
  hasTicket: true,
  tags: [],
  status: 'PREPARING',
  displayStatus: 'PREPARING',
  dDay: null,
  openedAt: null,
  checklist: {
    isBasicFilled: false,
    isDetailFilled: false,
    hasValidTicket: false,
    ticketRequired: true,
    canOpen: false,
  },
  ...patch,
});

describe('공연 스코프 — 메뉴 · 읽기 전용 · 잠금 · 삭제', () => {
  it('등록 전 4개(대시보드·기본 정보·상세 정보·티켓 관리), 등록 후 6개(+ 예매자 관리·QR 체크인)', () => {
    expect(eventMenuOf('140', 'PREPARING').map((m) => m.label)).toEqual([
      '대시보드',
      '기본 정보',
      '상세 정보',
      '티켓 관리',
    ]);
    for (const status of ['OPEN', 'CALCULATING', 'CLOSED'] as const) {
      expect(eventMenuOf('101', status).map((m) => m.key)).toEqual([
        'dashboard',
        'info',
        'detail',
        'tickets',
        'guests',
        'qr',
      ]);
    }
    expect(eventMenuOf('140', 'PREPARING')[1]!.href).toBe('/hosting/events/140/info');
  });

  it('"공연 페이지 보기"는 등록 후만', () => {
    expect(eventPublicHref(140, 'PREPARING')).toBeNull();
    expect(eventPublicHref(101, 'OPEN')).toBe('/events/101');
  });

  it.each<[HostRole | null, EventStatus, 'role' | 'ended' | null]>([
    ['MASTER', 'PREPARING', null],
    ['MANAGER', 'OPEN', null],
    ['GUEST', 'PREPARING', 'role'],
    ['GUEST', 'CLOSED', 'role'],
    // GE-3(G+) 성공 + myRole null = 멤버가 아닌 SUPER_ADMIN(사용자 결정 2026-10-31) — 편집할 수 있다
    [null, 'OPEN', null],
    [null, 'CLOSED', 'ended'],
    ['UNKNOWN', 'OPEN', 'role'],
    ['MASTER', 'CALCULATING', 'ended'],
    ['MANAGER', 'CLOSED', 'ended'],
    ['MASTER', 'UNKNOWN', 'ended'],
  ])('읽기 전용: %s · %s → %s', (myRole, status, expected) => {
    expect(readOnlyReasonOf({ myRole, status })).toBe(expected);
  });

  it.each<[EventStatus, boolean]>([
    ['PREPARING', false],
    ['OPEN', true],
    ['CALCULATING', true],
    ['CLOSED', true],
  ])('티켓 여부 잠금: %s → %s', (status, locked) => {
    expect(isHasTicketLocked(status)).toBe(locked);
  });

  it.each<[EventStatus, ActorRole | null, boolean]>([
    ['PREPARING', 'MASTER', true],
    ['PREPARING', 'MANAGER', true],
    ['PREPARING', 'GUEST', false],
    ['PREPARING', null, false],
    ['PREPARING', 'SUPER_ADMIN', true],
    ['OPEN', 'MASTER', false],
    ['CLOSED', 'MANAGER', false],
  ])('삭제(카드 ⋮): %s · %s → %s', (status, myRole, expected) => {
    expect(canDeleteEvent({ status, myRole })).toBe(expected);
  });

  it.each([
    ['140', '140'],
    ['abc', null],
    ['1.5', null],
    ['', null],
    ['99999999999999999999', null],
  ])('주소 id %s → %s', (raw, expected) => {
    expect(parseEventIdParam(raw)).toBe(expected);
  });
});

describe('일정 — 날짜 1칸 + 시작·종료 시각, 종료 ≤ 시작이면 다음 날', () => {
  it.each([
    [
      { date: '2027-03-20', startTime: '18:00', endTime: '20:00' },
      '2027.03.20 18:00',
      '2027.03.20 20:00',
      false,
    ],
    [
      { date: '2027-03-20', startTime: '22:00', endTime: '01:30' },
      '2027.03.20 22:00',
      '2027.03.21 01:30',
      true,
    ],
    [
      { date: '2027-03-20', startTime: '18:00', endTime: '18:00' },
      '2027.03.20 18:00',
      '2027.03.21 18:00',
      true,
    ],
    // 달·해 넘김
    [
      { date: '2027-12-31', startTime: '23:00', endTime: '00:30' },
      '2027.12.31 23:00',
      '2028.01.01 00:30',
      true,
    ],
    [
      { date: '2028-02-28', startTime: '23:00', endTime: '01:00' },
      '2028.02.28 23:00',
      '2028.02.29 01:00',
      true,
    ],
  ])('%o → %s ~ %s(다음 날 %s)', (input, startAt, endAt, overnight) => {
    expect(toScheduleRange(input)).toEqual({ startAt, endAt, overnight });
  });

  it.each([
    [{ date: '', startTime: '18:00', endTime: '20:00' }],
    [{ date: '2027-02-30', startTime: '18:00', endTime: '20:00' }],
    [{ date: '2027-03-20', startTime: '24:00', endTime: '20:00' }],
    [{ date: '2027-03-20', startTime: '18:00', endTime: '' }],
  ])('칸이 비었거나 틀리면 null — %o', (input) => {
    expect(toScheduleRange(input)).toBeNull();
  });

  it('서버 일시 → 칸 값(종료가 다음 날이어도 시각만)', () => {
    expect(scheduleInputOf('2027.03.20 22:00', '2027.03.21 01:30')).toEqual({
      date: '2027-03-20',
      startTime: '22:00',
      endTime: '01:30',
    });
    expect(scheduleInputOf(null, null)).toEqual({ date: '', startTime: '', endTime: '' });
  });

  it.each([
    [{ date: '', startTime: '', endTime: '' }, true, '공연 날짜를 골라 주세요'],
    [{ date: '2027-03-20', startTime: '', endTime: '' }, true, '시작 시각을 입력해 주세요'],
    [{ date: '2027-03-20', startTime: '18:00', endTime: '' }, true, '종료 시각을 입력해 주세요'],
    [
      { date: '2026-10-26', startTime: '12:00', endTime: '13:00' },
      true,
      '시작 시각은 지금 이후로 정해 주세요',
    ],
    [{ date: '2026-10-26', startTime: '12:01', endTime: '13:00' }, true, null],
    [{ date: '2026-10-26', startTime: '11:00', endTime: '13:00' }, false, null],
  ])('칸 오류 %o (지금 이후 %s) → %s', (input, requireFuture, expected) => {
    expect(scheduleError(input, { requireFuture, now: NOW })).toBe(expected);
  });
});

describe('장소 — 주소 → 좌표 → 공연장 이름 · 상세주소', () => {
  const full = {
    address: '서울 마포구 어울마당로 35',
    latitude: 37.55,
    longitude: 126.92,
    name: ' 롤링홀 ',
    detailAddress: '  ',
  };
  it('4필드를 채우면 상세주소를 늘 함께(빈 값은 null) 보낸다', () => {
    expect(toPlaceRequest(full)).toEqual({
      name: '롤링홀',
      address: '서울 마포구 어울마당로 35',
      latitude: 37.55,
      longitude: 126.92,
      detailAddress: null,
    });
  });
  it.each([
    [emptyPlace(), null],
    [
      { ...full, latitude: null, longitude: null },
      '이 주소의 위치를 찾지 못했어요. 다른 주소를 골라 주세요',
    ],
    [{ ...emptyPlace(), name: '롤링홀' }, '주소를 검색해 골라 주세요'],
    [{ ...full, name: '' }, '공연장 이름을 입력해 주세요'],
    [full, null],
  ])('칸 오류 %o → %s', (input, expected) => {
    expect(placeError(input)).toBe(expected);
  });
});

describe('기본 정보 — 바뀐 필드만 PE-4', () => {
  const base = basicInfoValuesOf(
    manage({
      place: {
        name: '롤링홀',
        address: '서울',
        detailAddress: '지하 1층',
        latitude: 1,
        longitude: 2,
      },
      contacts: [{ type: 'PHONE', value: '01012345678' }],
      tags: [{ tagId: 1, category: 'EVENT_TYPE', name: '정기공연' }],
    }),
  );

  it('아무것도 바꾸지 않으면 빈 본문', () => {
    expect(toUpdateEventBasicBody(base, base)).toEqual({});
  });

  it('상세주소만 고쳐도 장소 전체(4필드 + 상세주소)를 보낸다', () => {
    const values = { ...base, place: { ...base.place, detailAddress: '2층' } };
    expect(toUpdateEventBasicBody(base, values)).toEqual({
      place: { name: '롤링홀', address: '서울', latitude: 1, longitude: 2, detailAddress: '2층' },
    });
  });

  it('일정은 시작·종료를 함께, 문의처·태그는 전체, 빈 문의처 줄은 뺀다', () => {
    const values = {
      ...base,
      schedule: { date: '2027-03-21', startTime: '23:00', endTime: '01:00' },
      contacts: [
        ...base.contacts,
        { type: null, value: '' },
        { type: 'INSTAGRAM' as const, value: ' @a ' },
      ],
      tagIds: [1, 2],
    };
    expect(toUpdateEventBasicBody(base, values)).toEqual({
      startAt: '2027.03.21 23:00',
      endAt: '2027.03.22 01:00',
      contacts: [
        { type: 'PHONE', value: '01012345678' },
        { type: 'INSTAGRAM', value: '@a' },
      ],
      tagIds: [1, 2],
    });
  });

  it('포스터: 새 key는 posterImageKey, 지우면 ""', () => {
    expect(
      toUpdateEventBasicBody(base, { ...base, poster: { url: 'u', key: 'event/140/a.png' } }),
    ).toEqual({
      posterImageKey: 'event/140/a.png',
    });
    expect(toUpdateEventBasicBody(base, { ...base, poster: { url: null, key: '' } })).toEqual({
      posterImageKey: '',
    });
  });

  it('바뀐 칸만 검사한다 — 손대지 않은 빈 이름이 다른 칸 저장을 막지 않는다', () => {
    const noName = basicInfoValuesOf(manage({ name: null }));
    const values = { ...noName, hasTicket: false };
    expect(
      hasBasicInfoErrors(validateBasicInfo(noName, values, { registered: false, now: NOW })),
    ).toBe(false);
    expect(changedBasicFields(noName, values)).toMatchObject({ hasTicket: true, name: false });
  });

  it('등록된 공연: 시작을 지금 이전으로 바꾸면 칸 오류, 시작을 그대로 두고 종료만 바꾸면 통과', () => {
    const past = basicInfoValuesOf(
      manage({ status: 'OPEN', startAt: '2026.10.01 18:00', endAt: '2026.10.01 20:00' }),
    );
    const moved = { ...past, schedule: { ...past.schedule, date: '2026-10-02' } };
    expect(validateBasicInfo(past, moved, { registered: true, now: NOW }).schedule).toBe(
      '시작 시각은 지금 이후로 정해 주세요',
    );
    const endOnly = { ...past, schedule: { ...past.schedule, endTime: '21:00' } };
    expect(validateBasicInfo(past, endOnly, { registered: true, now: NOW }).schedule).toBeNull();
  });

  it('장소 칸을 모두 비우면 보내지 않는다(서버는 장소를 지우는 수정을 받지 않는다)', () => {
    expect(changedBasicFields(base, { ...base, place: emptyPlace() }).place).toBe(false);
  });

  it.each([
    [{ type: null, value: '' }, null],
    [{ type: null, value: 'x' }, '문의처 유형을 골라 주세요'],
    [{ type: 'PHONE' as const, value: ' ' }, '문의처를 입력해 주세요'],
    [{ type: 'ETC' as const, value: 'a'.repeat(201) }, '문의처는 200자까지 입력할 수 있어요'],
    // 공연 문의처에는 호스트 연락처의 전화 15자 제한이 없다
    [{ type: 'PHONE' as const, value: '0'.repeat(20) }, null],
  ])('문의처 줄 %o → %s', (row, expected) => {
    expect(eventContactError(row)).toBe(expected);
  });

  it('태그는 10개에서 더 켜지지 않는다', () => {
    const ten = Array.from({ length: 10 }, (_, i) => i + 1);
    expect(toggleTag(ten, 11)).toEqual(ten);
    expect(toggleTag(ten, 3)).toHaveLength(9);
  });
});

describe('상세 정보 섹션 — 전체 교체', () => {
  it('서버 섹션이 없으면 기본 4탭(본문 없음)으로 시작한다', () => {
    expect(sectionInputsOf([]).map((s) => [s.title, s.content])).toEqual([
      ['공연소개', ''],
      ['예매안내', ''],
      ['세트리스트', ''],
      ['유의사항', ''],
    ]);
  });

  it('v1 MARKDOWN 섹션은 HTML로 바꿔 에디터에 넣는다, sortOrder 순', () => {
    const inputs = sectionInputsOf([
      { sectionId: 2, title: 'b', content: '<p>b</p>', contentFormat: 'HTML', sortOrder: 1 },
      { sectionId: null, title: 'a', content: '**굵게**', contentFormat: 'MARKDOWN', sortOrder: 0 },
    ]);
    expect(inputs.map((s) => s.title)).toEqual(['a', 'b']);
    expect(inputs[0]!.content).toContain('<strong>굵게</strong>');
  });

  it('보내는 본문은 지금 목록 전부(뺀 섹션 없음), 순서대로 sortOrder 0부터, 빈 본문은 null', () => {
    const start = sectionInputsOf([]);
    const removed = withoutSection(start, start[2]!.key);
    const moved = withMovedSection(removed, removed[2]!.key, 0);
    const filled = moved.map((s, i) => (i === 1 ? { ...s, content: '<p>소개</p>' } : s));
    expect(toUpdateSectionsBody(filled)).toEqual({
      sections: [
        { title: '유의사항', content: null, sortOrder: 0 },
        { title: '공연소개', content: '<p>소개</p>', sortOrder: 1 },
        { title: '예매안내', content: null, sortOrder: 2 },
      ],
    });
    expect(isSectionsDirty(start, filled)).toBe(true);
    expect(isSectionsDirty(start, start)).toBe(false);
  });

  it('1~10개 — 10개면 더하지 않고 1개면 빼지 않는다', () => {
    let s = sectionInputsOf([]);
    for (let i = 0; i < 8; i += 1) s = withAddedSection(s);
    expect(s).toHaveLength(10);
    expect(withAddedSection(s)).toHaveLength(10);
    const one = [s[0]!];
    expect(withoutSection(one, one[0]!.key)).toHaveLength(1);
  });

  it('칸 오류: 빈 제목 · 21자 · 본문 20,001자', () => {
    const [a, b, c] = sectionInputsOf([]);
    const errors = validateSections([
      { ...a!, title: ' ' },
      { ...b!, title: 'ㄱ'.repeat(21) },
      { ...c!, content: 'a'.repeat(20_001) },
    ]);
    expect(errors[a!.key]!.title).toBe('탭 이름을 입력해 주세요');
    expect(errors[b!.key]!.title).toBe('탭 이름은 20자까지 입력할 수 있어요');
    expect(errors[c!.key]!.content).toMatch(/본문이 너무 길어요/);
  });

  it.each([
    ['<p></p>', true],
    ['<p>&nbsp;</p>', true],
    ['<p><img src="x"></p>', false],
    ['<p>글</p>', false],
  ])('빈 본문 판정 %s → %s', (html, empty) => {
    expect(isEmptyContent(html)).toBe(empty);
  });
});

describe('체크리스트 행', () => {
  it('티켓 없음 공연은 ③ 면제(찬 것으로 센다)', () => {
    const items = checklistItemsOf(7001, {
      isBasicFilled: true,
      isDetailFilled: false,
      hasValidTicket: false,
      ticketRequired: false,
      canOpen: false,
    });
    expect(items.map((i) => [i.key, i.done, i.exempt, i.href])).toEqual([
      ['basic', true, false, '/hosting/events/7001/info'],
      ['detail', false, false, '/hosting/events/7001/detail'],
      ['ticket', true, true, '/hosting/events/7001/tickets'],
    ]);
    expect(checklistProgress(items)).toEqual({ done: 2, total: 3 });
  });
});

describe('간편 만들기', () => {
  it('일반 멤버인 호스트는 고를 수 없다', () => {
    const hosts = selectableHostsOf([
      { hostId: 11, name: 'a', profileImageUrl: null, myRole: 'MASTER', eventCount: 0 },
      { hostId: 12, name: 'b', profileImageUrl: null, myRole: 'GUEST', eventCount: 0 },
      { hostId: 13, name: 'c', profileImageUrl: null, myRole: 'MANAGER', eventCount: 0 },
    ]);
    expect(hosts.map((h) => h.selectable)).toEqual([true, false, true]);
  });

  it('?step= · ?hostId= 읽기', () => {
    expect(parseWizardStep(new URLSearchParams('step=2'))).toBe(2);
    expect(parseWizardStep(new URLSearchParams('step=3'))).toBe(1);
    expect(parseWizardStep(new URLSearchParams(''))).toBe(1);
    expect(parsePreselectedHostId(new URLSearchParams('hostId=11'))).toBe(11);
    expect(parsePreselectedHostId(new URLSearchParams('hostId=x'))).toBeNull();
  });

  it('PE-2 본문 — 종료 ≤ 시작이면 다음 날, 만든 뒤 대시보드(?created=1)', () => {
    const values = {
      name: ' 새 공연 ',
      schedule: { date: '2027-03-20', startTime: '23:00', endTime: '02:00' },
      hasTicket: false,
    };
    expect(validateCreateEvent(values, NOW)).toEqual({
      name: null,
      schedule: null,
      hasTicket: null,
    });
    expect(toCreateEventBody(11, values)).toEqual({
      hostId: 11,
      name: '새 공연',
      startAt: '2027.03.20 23:00',
      endAt: '2027.03.21 02:00',
      hasTicket: false,
    });
    expect(createdEventHref(7001)).toBe('/hosting/events/7001/dashboard?created=1');
  });

  it('칸 오류 — 이름 26자, 지난 시작, 티켓 여부 미선택', () => {
    expect(
      validateCreateEvent(
        {
          name: 'ㄱ'.repeat(26),
          schedule: { date: '2026-10-25', startTime: '18:00', endTime: '20:00' },
          hasTicket: null,
        },
        NOW,
      ),
    ).toEqual({
      name: '공연 이름은 25자까지 입력할 수 있어요',
      schedule: '시작 시각은 지금 이후로 정해 주세요',
      hasTicket: '티켓 여부를 골라 주세요',
    });
  });
});
