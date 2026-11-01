import type {
  EventDetail,
  EventDisplayStatus,
  EventListItem,
  EventSection,
  EventStatus,
  HomeEvent,
  Tag,
  TagGroup,
} from '../../event/schema';
import type { PublicTicketItem } from '../../ticket-item/schema';
import { MOCK_IMAGE_ORIGIN } from '../respond';

/**
 * 공연 fixture. 값은 운영 응답 모양을 따랐다(2026-10-17 운영 GP-1·GP-2·GP-3·GP-5·GE-5 확인).
 * 날짜는 고정값이고 `displayStatus`도 서버가 계산해 둔 값으로 고정한다 — 캡처·테스트가 날짜에 따라 바뀌지 않게.
 * 기준 시각은 2026.10.17 20:00(KST)으로 본다.
 */

// ─── 태그 (GE-11) ────────────────────────────────────────────

/** e2e·QA(`home.spec.ts`, `home.qa.ts`)가 `공연구분`·`장르` 제목과 `정기공연`·`락밴드` 버튼을 찾는다 — 이름을 바꾸지 않는다 */
export const tagGroups = [
  {
    category: 'EVENT_TYPE',
    tags: [
      { tagId: 1, name: '정기공연' },
      { tagId: 3, name: '단독공연' },
      { tagId: 4, name: '합동공연' },
    ],
  },
  {
    category: 'GENRE',
    tags: [
      { tagId: 2, name: '락밴드' },
      { tagId: 5, name: '어쿠스틱·포크' },
      { tagId: 6, name: '재즈' },
    ],
  },
  {
    category: 'AREA',
    tags: [
      { tagId: 7, name: '서울' },
      { tagId: 8, name: '부산' },
    ],
  },
  {
    category: 'TEAM',
    tags: [
      { tagId: 9, name: '대학 동아리' },
      { tagId: 10, name: '직장인 밴드' },
    ],
  },
] satisfies TagGroup[];

const tagById = new Map<number, Tag>(
  tagGroups.flatMap((g) => g.tags.map((t) => [t.tagId, { ...t, category: g.category }] as const)),
);
const tags = (...ids: number[]): Tag[] => ids.map((id) => tagById.get(id)!);

/** 실제로 있는 태그 id. GP-2 mock이 없는 id에 `Event_400_23`을 낸다 */
export const knownTagIds = new Set(tagById.keys());

// ─── 공연 ────────────────────────────────────────────────────

/** mock 안에서만 쓰는 공연 원본. 화면 응답(GP-1·GP-2·GP-3·GH-14)은 여기서 만든다 */
export type MockEvent = Omit<EventDetail, 'displayStatus'> & {
  status: EventStatus;
  displayStatus: EventDisplayStatus;
  dDay: number | null;
  sections: EventSection[];
  ticketItems: PublicTicketItem[];
};

const poster = (id: number) => `${MOCK_IMAGE_ORIGIN}/event/${id}/poster.jpeg`;

export const HOST_GOSROCK = {
  hostId: 11,
  name: '고스락',
  profileImageUrl: `${MOCK_IMAGE_ORIGIN}/host/11/profile.png`,
};
export const HOST_NOISE = { hostId: 12, name: '소음공작소', profileImageUrl: null };

const htmlSections = (eventName: string): EventSection[] => [
  {
    sectionId: 9001,
    title: '공연 소개',
    content: `<h2>${eventName}</h2><p>한 해 동안 준비한 무대를 선보입니다. 많은 관심 부탁드려요!</p><ul><li><p>입장: 공연 30분 전부터</p></li><li><p>러닝타임: 약 2시간</p></li></ul>`,
    contentFormat: 'HTML',
    sortOrder: 0,
  },
  {
    sectionId: 9002,
    title: '예매안내',
    content:
      '<ol><li><p>입금자명과 예매자명이 같아야 승인돼요.</p></li><li><p>승인은 1~2일 걸려요.</p></li></ol>',
    contentFormat: 'HTML',
    sortOrder: 1,
  },
  {
    sectionId: 9003,
    title: '세트리스트',
    content: '<p>1. 오프닝<br>2. 청춘<br>3. 밤이 깊었네<br>4. 앵콜</p>',
    contentFormat: 'HTML',
    sortOrder: 2,
  },
  {
    sectionId: 9004,
    title: '유의사항',
    content: null,
    contentFormat: 'HTML',
    sortOrder: 3,
  },
];

/** v1에서 넘어온 공연 — 섹션 없이 본문 하나(`sectionId` null, MARKDOWN) */
const v1Section: EventSection[] = [
  {
    sectionId: null,
    title: '공연 소개',
    content:
      '## 소음공작소 여름 공연\n\n- 일시: 2025년 8월 23일\n- 장소: 롤링홀\n\n**많이 와 주세요!**',
    contentFormat: 'MARKDOWN',
    sortOrder: 0,
  },
];

const ticketsFor101: PublicTicketItem[] = [
  {
    ticketItemId: 501,
    name: '일반 예매',
    description: '1인 1매',
    price: 15000,
    payType: 'DUDOONG',
    approvalRequired: true,
    remaining: 42,
    isSoldOut: false,
    isPurchasable: true,
    isSuspended: false,
    purchaseLimit: 4,
    options: [
      {
        optionId: 701,
        name: '뒤풀이 참석',
        description: '공연 끝나고 근처 식당에서 함께해요',
        type: 'YES_NO',
        yesAdditionalPrice: 10000,
      },
      {
        optionId: 702,
        name: '응원하는 멤버',
        description: '한 명만 적어 주세요',
        type: 'SUBJECTIVE',
        yesAdditionalPrice: null,
      },
    ],
  },
  {
    ticketItemId: 502,
    name: '학생 할인',
    description: '현장에서 학생증 확인',
    price: 10000,
    payType: 'DUDOONG',
    approvalRequired: true,
    remaining: 0,
    isSoldOut: true,
    isPurchasable: false,
    isSuspended: false,
    purchaseLimit: 1,
    options: [],
  },
  {
    ticketItemId: 503,
    name: '초대권',
    description: null,
    price: 0,
    payType: 'FREE',
    approvalRequired: false,
    // 재고 비공개 또는 무제한
    remaining: null,
    isSoldOut: false,
    isPurchasable: true,
    isSuspended: false,
    purchaseLimit: null,
    options: [],
  },
];

const base = {
  runTime: 120,
  hasTicket: true,
  contacts: [
    { type: 'INSTAGRAM', value: '@gosrock_official' },
    { type: 'PHONE', value: '010-1234-5678' },
  ],
  sections: [],
  ticketItems: [],
} satisfies Partial<MockEvent>;

export const events: MockEvent[] = [
  {
    ...base,
    eventId: 101,
    name: '고스락 제37회 정기공연',
    posterImageUrl: poster(101),
    startAt: '2026.11.21 19:00',
    endAt: '2026.11.21 21:00',
    place: {
      name: '홍대 롤링홀',
      address: '서울 마포구 어울마당로 35',
      detailAddress: '지하 1층',
      latitude: 37.5509,
      longitude: 126.9219,
    },
    tags: tags(1, 2, 7, 9),
    host: HOST_GOSROCK,
    status: 'OPEN',
    displayStatus: 'UPCOMING',
    dDay: null,
    sections: htmlSections('고스락 제37회 정기공연'),
    ticketItems: ticketsFor101,
  },
  {
    ...base,
    eventId: 102,
    name: '어쿠스틱 나이트',
    posterImageUrl: poster(102),
    startAt: '2026.10.24 18:30',
    endAt: '2026.10.24 20:00',
    runTime: 90,
    place: {
      name: '부산 오방가르드',
      address: '부산 수영구 광남로 172',
      detailAddress: null,
      latitude: 35.1532,
      longitude: 129.1186,
    },
    tags: tags(3, 5, 8),
    host: HOST_NOISE,
    contacts: [{ type: 'OPEN_CHAT', value: 'https://open.kakao.com/o/mock' }],
    status: 'OPEN',
    displayStatus: 'UPCOMING',
    dDay: 7,
    sections: v1Section,
    ticketItems: [
      {
        ticketItemId: 511,
        name: '무료 선착순',
        description: '선착순 50명',
        price: 0,
        payType: 'FREE',
        approvalRequired: false,
        remaining: 13,
        isSoldOut: false,
        isPurchasable: true,
        isSuspended: false,
        purchaseLimit: 2,
        options: [],
      },
    ],
  },
  {
    ...base,
    eventId: 103,
    name: '직장인 밴드 합동공연 Vol.3',
    posterImageUrl: null,
    startAt: '2026.11.07 17:00',
    endAt: '2026.11.07 21:00',
    runTime: 240,
    place: null,
    tags: tags(4, 2, 10),
    host: HOST_GOSROCK,
    contacts: [],
    status: 'OPEN',
    displayStatus: 'UPCOMING',
    dDay: 21,
  },
  {
    ...base,
    eventId: 104,
    // 정보만 공개하는 공연(티켓 없음). 이름·장소가 비어 있는 오래된 데이터 모양. 진행 중(ONGOING) 예시도 겸한다 — 시작이 지나 서버는 티켓을 팔지 않는다(Event_400_6)
    name: null,
    posterImageUrl: poster(104),
    startAt: '2026.10.17 19:00',
    endAt: '2026.10.17 19:00',
    runTime: null,
    place: {
      name: '공연장 미정',
      address: null,
      detailAddress: null,
      latitude: null,
      longitude: null,
    },
    hasTicket: false,
    tags: [],
    host: { hostId: 13, name: null, profileImageUrl: null },
    status: 'OPEN',
    displayStatus: 'ONGOING',
    dDay: null,
  },
  ...Array.from({ length: 10 }, (_, i): MockEvent => {
    const day = 10 + i;
    return {
      ...base,
      eventId: 120 + i,
      name: `소음공작소 연말 공연 ${i + 1}회차`,
      posterImageUrl: poster(120 + i),
      startAt: `2026.12.${day} 19:30`,
      endAt: `2026.12.${day} 21:30`,
      place: {
        name: '롤링홀',
        address: '서울 마포구 어울마당로 35',
        detailAddress: null,
        latitude: 37.5509,
        longitude: 126.9219,
      },
      tags: tags(1, i % 2 === 0 ? 2 : 6, 7),
      host: HOST_NOISE,
      status: 'OPEN',
      displayStatus: 'UPCOMING',
      dDay: 54 + i,
    };
  }),
  {
    ...base,
    eventId: 90,
    name: '고스락 제36회 정기공연',
    posterImageUrl: poster(90),
    startAt: '2026.05.16 18:00',
    endAt: '2026.05.16 20:00',
    place: {
      name: '홍대 롤링홀',
      address: '서울 마포구 어울마당로 35',
      detailAddress: null,
      latitude: 37.5509,
      longitude: 126.9219,
    },
    tags: tags(1, 2, 7, 9),
    host: HOST_GOSROCK,
    status: 'CLOSED',
    displayStatus: 'PAST',
    dDay: null,
    sections: htmlSections('고스락 제36회 정기공연'),
  },
  {
    ...base,
    eventId: 91,
    name: '여름밤 재즈',
    posterImageUrl: poster(91),
    startAt: '2026.08.23 19:00',
    endAt: '2026.08.23 21:00',
    place: null,
    tags: tags(6, 7),
    host: HOST_NOISE,
    status: 'CALCULATING',
    displayStatus: 'PAST',
    dDay: null,
  },
];

/** 준비중 공연 — 공개 API(GP-2·GP-3·GP-5)에는 없고, GH-14 멤버 목록에만 보인다 */
export const preparingEvents: MockEvent[] = [
  {
    ...base,
    eventId: 140,
    name: '고스락 신입 환영 공연(준비중)',
    posterImageUrl: null,
    startAt: '2027.03.20 18:00',
    endAt: '2027.03.20 20:00',
    place: null,
    tags: [],
    host: HOST_GOSROCK,
    contacts: [],
    status: 'PREPARING',
    displayStatus: 'PREPARING',
    dDay: null,
  },
];

/** 404를 내는 공연 id 예시(없음). 준비중 공연(140)도 공개 API에서는 404다 */
export const MISSING_EVENT_ID = 999999;

// ─── 응답 모양으로 바꾸기 ─────────────────────────────────────

export const findPublicEvent = (eventId: number) =>
  events.find((e) => e.eventId === eventId && e.status !== 'PREPARING' && e.status !== 'DELETED');

export const toDetail = (e: MockEvent): EventDetail => ({
  eventId: e.eventId,
  name: e.name,
  posterImageUrl: e.posterImageUrl,
  startAt: e.startAt,
  endAt: e.endAt,
  runTime: e.runTime,
  place: e.place,
  hasTicket: e.hasTicket,
  tags: e.tags,
  host: e.host,
  contacts: e.contacts,
  displayStatus: e.displayStatus,
});

export const toListItem = (e: MockEvent): EventListItem => ({
  eventId: e.eventId,
  name: e.name,
  posterImageUrl: e.posterImageUrl,
  startAt: e.startAt,
  endAt: e.endAt,
  placeName: e.place?.name ?? null,
  hostName: e.host.name,
  tags: e.tags,
  displayStatus: e.displayStatus,
});

export const toHomeEvent = (e: MockEvent): HomeEvent => ({
  eventId: e.eventId,
  name: e.name,
  posterImageUrl: e.posterImageUrl,
  startAt: e.startAt,
  placeName: e.place?.name ?? null,
  hostName: e.host.name,
  displayStatus: e.displayStatus,
});

/** GP-1: 종료 전 OPEN 공연, 진행 중이 앞, 시작 임박순, 최대 10개 */
export const homeEvents = () =>
  events
    .filter(
      (e) =>
        e.status === 'OPEN' && (e.displayStatus === 'ONGOING' || e.displayStatus === 'UPCOMING'),
    )
    .sort(upcomingOrder)
    .slice(0, 10)
    .map(toHomeEvent);

/** GP-2 `sort=UPCOMING`: 진행 중 → 시작 전(임박순) → 지난 공연(최근순) */
export function upcomingOrder(a: MockEvent, b: MockEvent) {
  const rank = (e: MockEvent) =>
    e.displayStatus === 'ONGOING' ? 0 : e.displayStatus === 'PAST' ? 2 : 1;
  const r = rank(a) - rank(b);
  if (r !== 0) return r;
  const cmp = (a.startAt ?? '').localeCompare(b.startAt ?? '');
  return rank(a) === 2 ? -cmp : cmp;
}
