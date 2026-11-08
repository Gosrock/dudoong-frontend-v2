# 코드에만 있는 공용 컴포넌트(Figma 디자인 시스템에 없음)

> 2026-11-07 정리(사용자 요청 — 디자이너 혼동). `src/ui/components` 49개를 디자인 시스템 파일(`0QD9tGSt8ZciDqe7ol2gYH`, 판 `2419085329203428681` — 2026-11-07T13:35Z)의 컴포넌트 세트 93 · 단일 컴포넌트 30과 대조했다.
>
> **왜 문제였나**: 아래 "B" 컴포넌트는 Figma 디자인 시스템에 없어서 개발이 GUI 화면 하나(또는 와이어)를 본떠 코드로 만든 것이다. 그런데 Figma 코멘트에서 이것을 "디자인 시스템 모달 · 바텀시트 · 팝오버 · 툴팁"이라고 부르고, 다른 화면의 Figma 모양과 다른 점을 "달라지는 점"으로 적었다. 디자이너는 Figma 디자인 시스템에서 그 컴포넌트를 찾을 수 없었다(GUI `1029:6888` 코멘트 답글, 2026-11-07).
>
> **규칙(2026-11-07부터)**: "DS 우선 · 커스텀 지양"의 DS는 **Figma 디자인 시스템 파일에 있는 컴포넌트(A)만**이다. B는 코드 공용 부품일 뿐 근거가 아니다 — Ready 화면이 B와 다르면 **화면(Figma)이 이긴다**: B에 변형을 더하거나 값을 바꿔 Figma와 같게 만든다. Figma 코멘트에서 B를 "디자인 시스템 ○○"이라고 부르지 않는다("개발 공용 컴포넌트 ○○"). [`design-workflow.md`](./design-workflow.md) §5.

## A. Figma 디자인 시스템에 있는 것(근거가 DS)

| 코드 | Figma 디자인 시스템 컴포넌트 |
|---|---|
| `Avatar` | Avatar |
| `Badge` | Badge |
| `Button` · `Fab`(둥근 버튼) | Button(round 포함) · numbering |
| `Checkbox` | Box(┗ Checkbox) |
| `Chip` | tag_v2(옛 tag · Concert state chip · Ticket state chip · role chip · money option chip) |
| `ConcertCard` | ConcertCard(┗ Card) |
| `FilterChip` | Filter Chip |
| `Radio` | Radio |
| `Input` · `SearchField` | input Field · text input Field · icon input Field · Search Field |
| `Toggle` | Toggle |
| `Header` · `TopBar` | Top app bar · host title · Top bar_Host |
| `Tabs` | tab item · tab |
| `Dropdown` | dropdown · dropdown item · SortButton |
| `Toast` | Toast popup |
| `Popup`(확인 창) | 다이얼로그 · 다이얼로그-버튼하나 · 다이얼로그 - 결제 요약 · 다이얼로그 - 로딩 · **다이얼로그_데스크탑**(PC 1024~, 2026-11-08 #187 — `intent` 기본/삭제) |
| `Loader` | Spinner(┗ Dialogue) |
| `InfoRow` | list · List |
| `AccountMenu` | My |
| `SidebarMenu` | 사이드바 메뉴 |
| `StatCard` · `SalesCard` · `EntranceCard` · `Schedule` | 승인 메뉴(desktop · mobile) · 티켓 판매 정보 · 입장 현황 · 일정 패널 · 날짜 · 일정 |
| 일러스트(`Illustration`) | img_login · img_검색 결과 없음 · img_선물 · img_예매완료 · img_티켓 없음 · img_포스터 준비중 |
| 아이콘 | ic · ic_v2 세트 |

## B. Figma 디자인 시스템에 없는 것(개발이 만든 공용 컴포넌트)

> **2026-11-08 2단계**: `BottomSheet` · `Modal` · `EmptyState` · `DataTable` · `SelectButton` · `TagButton` · `Counter`를 디자인 시스템 파일 새 페이지로 올렸다(` ┗ Bottom sheet` `835:2655` · ` ┗ Modal` `835:2866` · ` ┗ Empty state` `835:2919` · ` ┗ Table` `835:3181` · ` ┗ Select button` `835:3304` · ` ┗ Tag button` `835:3320` · ` ┗ Counter` `835:3338`, 제안 변형 ` ┗ 개발 제안 변형` `835:3375`) — [`ds-upload-2026-11-08.md`](./ds-upload-2026-11-08.md). 라이브러리 게시 · 기존 세트 합치기는 디자이너 몫이라, 게시되기 전까지는 아래 표 그대로 "코드에만 있음"으로 본다.

본뜬 곳은 만들 때의 근거다. **그 화면 밖에서는 근거가 아니다.**

| 코드 | 본뜬 곳(만들 때) | 지금 쓰는 곳 · 메모 |
|---|---|---|
| `Modal` | GUI `1029:6888` 예매자 주문 상세 · `956:3281` 티켓 옵션 모달(2026-11-08 #172 — 옛 근거 `567:9468`) | 내용 있는 모달 전부. **지금 모양**: `md` 480 · `lg` 520, 둘 다 흰 바탕 · 안쪽 24 · 묶음 사이 24 · 모서리 16, `titleSize`(16 · 18 · 24) · `descriptionStyle` · 머리 앞 슬롯(`headerStart`). 확인 창은 `Popup`(DS 다이얼로그 310 · PC는 DS 다이얼로그_데스크탑 420(2026-11-08 #187 — 옛 `size` 480 · 520 없앰), 입금 확인 창 `variant="summary"` 342 회색 판 + ✕) |
| `BottomSheet` · `ResponsiveOverlay` | GUI `994:1154` 호스팅 시트 · `908:12096` 선물 확인 시트(2026-11-08 #172 — 옛 근거 `759:21725`, `vaul`) | 모든 시트 · 모바일 오버레이. **지금 모양**: `variant="flat"`(호스팅 — 위 모서리 16 · 막대 손잡이 · ✕ · 위 12 · 좌우 24 · 사이 24 · 테두리/그림자 · 구분선 없음) · `"raised"`(선물 확인 — 막대 · 제목 24 가운데 · 위 테두리 + 그림자 · 버튼 사이 12). `default`(⌄ 손잡이 · 왼쪽 제목 · ✕ 없음)는 Ready 근거가 아직 없는 시트만 |
| `Drawer` | 와이어 `128:2875` · `128:2931` 햄버거 | 관객 · 호스팅 드로어 |
| `Popover` | GUI `759:12049` · `1231:2003` 태그 패널 상자(Ready 밖 — 사용자 결정 2026-11-08 Figma대로, #172) | 태그 패널. 지금 모양: 흰 판 · 테두리 `#dddcda` · 모서리 8 · 그림자 drop(Figma와 같음) |
| `Tooltip` | GUI `331:11622` 말풍선 · 와이어 로그인 말풍선 | 로그인 말풍선 |
| `DropdownMenu`(⋮ 메뉴) | GUI `958:20518` = DS `dropdown` 면(2026-11-08 #172) | 공연 카드 · 티켓 ⋮. 면은 `theme/surface.css` `dropdownSurface`(Select 열린 목록과 같이), 항목 28h |
| `DataTable` | GUI `1026:4526` 예매자 관리 표(직접 그린 상자) | 예매자 관리 표 |
| `Counter` | GUI `759:22015` 수량 줄 | 티켓 선택 |
| `TagButton` | GUI `759:11869` · `748:33451` | 태그 선택 |
| `SelectButton` | GUI 로컬 `Check Button` `567:7982` | 예/아니오 · 결제 방식 |
| `EmptyState` | GUI `37:758` · `579:2210` · `567:9821`(배치) | 빈 화면 · `NotFoundView` · `ForbiddenView` · `RouteErrorView` |
| `Accordion` | 없음(Radix) | 체크아웃 규정 보기 · 판매정보 · 호스트 제공 동의 |
| `DatePicker` · `TimePicker` | 트리거만 icon input Field, 피커는 브라우저 기본 | 공연 · 티켓 날짜 |
| `DropZone` · `UploadedImage` | GUI `748:33351` 이미지 업로드 칸 | 포스터 · 호스트 이미지 |
| `TextArea` | 없음 | 소개글 등 |
| `Skeleton` · `LoadMoreSentinel` · `LinkProgress` · `InlineError` · `ListHeader` | 없음 | 로딩 · 더 보기 · 이동 표시 · 실패 줄 |
| `QrCode` | 없음(`qr-code-styling`) | 티켓 QR · 셀프 체크인 QR |
| `AsyncBoundary` · `ErrorBoundary` · `EasyOverlay` | 모양 없음(동작만) | — |

## C. 정정할 Figma 코멘트(B를 "디자인 시스템"이라고 부른 것)

2026-11-07 각 코멘트에 정정 답글을 달았다. 2026-11-08 코멘트 전수 점검에서 7줄을 더 찾았다(아래 "2026-11-08 점검" — 정정 답글은 관제탑이 달았다). 화면은 Figma대로 고친다(작업 줄 `figma-match-overlays` — progress "다음 순서").

| 노드 | 화면 | 코멘트에서 부른 이름 | 실제 |
|---|---|---|---|
| GUI `1029:6888` | 예매자 관리 주문 상세 모달 · 시트(티켓 상세 · 사유 단계 포함) | 디자인 시스템 모달 · 바텀시트 | B `Modal` · `BottomSheet` — 2026-11-08 Figma대로 고침(#172) |
| GUI `931:1314` | 티켓 옵션 시트 · 모달 | 디자인 시스템 바텀시트 · 모달 | B |
| GUI `908:12096` | 선물하기 확인 시트 | 디자인 시스템 바텀시트 | B |
| GUI `908:21340` | 선물 취소 확인 시트(선물 반환 `908:23151` 포함) | 디자인 시스템 바텀시트 | B |
| GUI `939:26914` | 선물 거절 확인 시트 | 디자인 시스템 바텀시트 | B |
| GUI `759:11869` | 태그 패널 상자 | 디자인 시스템 팝오버 | B `Popover` |
| 와이어 `218:4798` | 로그인 말풍선 | 디자인 시스템 툴팁 | B `Tooltip` |
| GUI `564:4156` | 체크아웃 "취소·환불 규정 보기" 펼침 행 | DS Accordion | B `Accordion` — 닫힌 모양만 DS `list`와 같다(2026-11-08 점검) |
| GUI `759:7895` | 공연 둘러보기 검색 결과 없음 | DS EmptyState action | B `EmptyState` — [검색 조건 지우기]는 GUI `1184:33829`대로 이미 뺐다(#162)(2026-11-08 점검) |
| 와이어 `503:16328` | 지난 관람 아카이빙 빈 화면 | 디자인 시스템 빈 화면 | B `EmptyState`(2026-11-08 점검) |
| 와이어 `128:2772` | 주문내역 빈 화면 | 디자인 시스템 빈 화면 | B `EmptyState`(정렬 글자는 GUI `1047:32381`대로 "최신순")(2026-11-08 점검) |
| 와이어 `424:11720` | 예매자 관리 상태 칩 | 디자인 시스템 태그 버튼 | B `TagButton` — 지금은 GUI Ready대로 DS Filter Chip(`CountFilterChip`)(2026-11-08 점검) |
| 와이어 `218:4797` | 로그인 말풍선 + 캐릭터 | 디자인 시스템 툴팁 | B `Tooltip` — 로그인 GUI `1175:16950`(#169)대로 말풍선을 뺐다(2026-11-08 점검) |
| 와이어 `503:31092` | 호스트 초대 팝업 · 빈 화면 틀 | 디자인 시스템 컴포넌트로만(경미) | 팝업 `Modal` · 빈 화면 `EmptyState`는 B, 버튼 · 입력칸만 DS(2026-11-08 점검) |

나머지 `[개발 · DS 컴포넌트로 구현]` 코멘트 10개(Button · Tabs · Toast popup · list · 다이얼로그 · 승인 메뉴 · img_login · tag_v2)는 실제 Figma 디자인 시스템 컴포넌트를 가리킨다 — 그대로 둔다.
