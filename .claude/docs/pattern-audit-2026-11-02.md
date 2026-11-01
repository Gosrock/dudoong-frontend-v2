# 코드 패턴 점검 (2026-11-02) — 채택 결정 + 리포트

> 사용자 요청(2026-11-02) "전체 구현을 보고 패턴을 한번 잡자"에 조사 세션(`code-pattern-audit`)이 낸 리포트(아래 "리포트 원문")와, 그것을 받아 정한 것.
> 뒤 세션(묶음 ③~⑥)의 근거다. 제안 번호(A1~A46 · D1~D12)는 원문 그대로 쓴다. 진행 상태는 [`progress.md`](./progress.md) "다음 순서" 27~31.

## 채택 결정

사용자 결정(2026-11-02 — 다시 묻지 않는다).

| 결정 | 내용 |
|---|---|
| 채택 묶음 | 리포트 §5의 **① 문서 · ② 공용 부품 · ③ 관객 화면 옮기기 · ④ 호스팅 화면 옮기기 · ⑤ 구조 이동 · ⑥ 큰 파일 나누기** 전부 |
| 순서 | ①② = `27 pattern-base`(한 PR) → ③ `28 pattern-audience`(선행 27 · `staging-qa-105-audience` 머지) ∥ ④ `29 pattern-hosting`(선행 27 · `staging-qa-106-host` 머지) → ⑤ `30 pattern-structure`(선행 28·29) → ⑥ `31 pattern-split`(선행 30) |
| **A1 확인 창 계약** | `EasyOverlay`의 `onConfirm`이 **`false`로 resolve하면 열린 채 둔다**(throw와 같게). model 훅의 `Promise<boolean>` 계약(실패면 `handleError` 뒤 `false`)은 그대로 두고, 호출 쪽은 `openConfirm({ onConfirm: action })`. → "실패하면 열린 채, 성공하면 닫힘"(patterns §6) |
| **A8 debounce** | **`es-toolkit`을 설치**해 쓴다(patterns §9 그대로) |
| **D1 폼 방식** | 하나로 통일하지 않는다 — **간단한 폼은 `useState` + 순수 함수, 복잡한 폼은 RHF**. 🤖 관제탑 판단(기준·시점): RHF 기준 = **반복 항목(`useFieldArray`) · 서로 얽힌 입력이 많음 · 칸별 서버 에러(`setError`)** 중 하나라도. 지금 있는 복잡한 폼의 RHF 전환은 ⑥에서. 분류표는 patterns §23 |
| 그 밖 | 커스텀 지양 · DS 우선(2026-10-31). 멈추지 않고 끝까지 — 정할 것은 되돌리기 쉬운 쪽으로 정하고 "🤖 Claude 판단"으로 기록(2026-11-01) |

### ①② 결과(`27 pattern-base`)

| ID | 만든 것 | 쓰는 곳(묶음) |
|---|---|---|
| A5 · D11 | `src/app/global-error.tsx` · `src/app/hosting/error.tsx` + `src/ui/components/RouteErrorView` | — (경계) |
| A3 | `src/utils/money.ts` — `formatWon`(`1,000원`) · `formatPrice`(0 → 무료) · `formatSignedWon`(`+1,000원`) · `formatCount` | ③ ④ |
| A4 | `src/api/shared/dday.ts` — `formatDday`(0 → **`D-day`**) · `ddayOf(startAt, now)` · `eventTimingLabel` · `EVENT_ONGOING_LABEL`("공연 중") · `EVENT_ENDED_LABEL`("공연 종료"). `Chip`의 `formatDday`는 이것을 다시 내보낸다 | ③(마이페이지 `D-DAY` → `D-day`) ④(사이드바 `D-0` → `D-day`) |
| A19 | `date.ts` — `KOREAN_WEEKDAYS`(export) · `kstParts` · `kstDayDiff` · `splitKstDateTime` · `joinKstDateTime` · `toKstIso` | ③ ④ |
| A7 | `src/ui/components/InlineError`(`message` · `onRetry` · `layout: column / row`) | ③ ④ |
| A11 | `infiniteListControls(query)`(`src/api/shared/page.ts`) — `LoadMoreSentinel`의 `LoadMoreState`와 같은 타입 | ③ ④ |
| A8 | `es-toolkit` 1.53.1 + `src/ui/hooks/useDebouncedValue` | ④(공연 리스트·공연준비 홈 검색) |
| A1 | `EasyOverlay` `onConfirm` → `false`면 열린 채 + 단위 테스트 · 스토리 `ReturnsFalse` | ③ ④ |
| A12 | `GIFTS_KEY`(`api/gift`) · `eventManageKey(id)`(`api/event` — api의 GE-3 아래 키가 모두 이것을 쓴다). `NOTIFICATIONS_KEY`는 이미 api에 있다 | ③(gift-cache) ④(event-cache) |
| A21 | `contactRequestSchema` · `hostContactRequestSchema` · `CONTACT_VALUE_MAX`(200) · `HOST_PHONE_CONTACT_MAX`(15)(`api/shared/common-schema.ts`). 백엔드 dev `f45882e` 확인 — 값 200자는 공통, **전화 15자는 호스트만**(`HostContact.PHONE_MAX_LENGTH`, v1 컬럼). 지금 두 벌의 차이는 서버와 같았다 | — (api 안에서 끝) |
| A22 · D5 | 공지 `['notices', 'list', 'infinite', audience, {size}]`, 환불 `[…, 'refunds', 'list', params]`. 무효화는 접두 키라 cache 파일은 바꿀 것이 없었다 | — |
| A23 | `handlersFrom(table, onCode)`(`src/api/handle-error.ts`) | ③ ④ |
| A44 | `floatingSurface`(`src/ui/theme/surface.css.ts`) — `Popover`·`DropdownMenu`가 서로의 css를 import하지 않는다 | — |
| A45 | 스토리 `Components/UploadedImage` · `Components/AsyncBoundary` | — |

**동작이 바뀐 것**: 공연준비 홈 공연 삭제 확인(`HostingHomeView`의 `onConfirm: () => del.deleteEvent(event)`)은 지금까지 실패(`false`)해도 닫혔고, 이제 열린 채 남는다(A1 계약 그대로). 그 밖의 기존 호출은 `undefined`로 resolve하거나 throw해 결과가 같다.

---

# 리포트 원문

## 코드 패턴 점검 리포트 (2026-11-02, main `eae6db6`)

> 조사·제안만. 코드는 고치지 않았다. 브랜치 `9yujin/code-pattern-audit`, 커밋하지 않음.
> 범위: `src` 885파일(테스트 125 · 스토리 58 포함). 규칙 grep은 직접, 중복·FF는 영역별 하위 에이전트 3개(관객 / 호스팅 / 공용·ui·api)가 보고 핵심 주장은 다시 열어 확인했다.
> 표기: `fh/` = `src/features/hosting/`, `fa/` = `src/features/audience/`, `fs/` = `src/features/shared/`.
> 겹침: **105** = `staging-qa-105-audience` 세션(audience/{checkout,event,ticket,gift,mypage,checkin}, shared/{kakao-share,section-viewer,checkin-result}), **106** = `staging-qa-106-host` 세션(hosting/**, shared/{notification,notice,shell,host-home,permission}, audience/{home,shell}).

## 0. 기계 검사

| 검사 | 결과 |
|---|---|
| `pnpm lint`(전체) | 통과(경고 0) |
| `pnpm typecheck` | 통과 — 단, 이 워크트리에는 `.env.local`이 없어 처음엔 `next typegen`이 `NEXT_PUBLIC_KAKAO_JS_KEY 가 없다`로 실패했고, 더미 값을 env로 넘겨 통과를 확인했다 |

## 1. 요약

1. **큰 규칙은 잘 지켜진다.** 계층 위반, 화면의 `ky`·`api.*` 직접 호출, `queries.ts` 밖의 `queryOptions`, `window.confirm`, `navigator.clipboard` 직접 사용, hex 색은 모두 0건이다. 응답 enum 26개 모두 `openEnum`, `mutationOptions`는 모두 `mutationFn`만 쓴다. 간격 토큰 사용은 764건이고 맨 숫자는 27건이다.
2. **문서와 코드가 갈라진 곳이 셋 있다.** 폼은 문서의 RHF+`dirtyFields` 대신 `useState`+순수 함수(`*-form.ts`)로 통일됐다(RHF는 체크아웃만 쓴다). §9의 `es-toolkit`은 설치돼 있지도 않다. 문서에 적힌 `utils/money.ts`·`global-error.tsx`가 없다.
3. **같은 표시를 화면마다 따로 만들어 사용자에게 보이는 차이가 생겼다.** D-day가 `D-0` / `D-DAY` / `D-day`로, 금액이 `1,000 원` / `1,000원`으로, "공연종료" / "공연 종료"로 섞여 나온다.
4. **가장 큰 구조 부채는 "확인 → 서버 호출" 오버레이 계약이다.** 훅이 `Promise<boolean>`을 돌려주고 에러를 삼키는 계약과 `EasyOverlay`의 `onConfirm`(실패하면 throw → 열린 채 둔다) 계약이 맞지 않는다. 그래서 같은 일을 세 가지 방식으로 하고, 실패해도 닫히는 다이얼로그가 있다.
5. **고칠 곳 대부분이 진행 중인 105·106 세션 범위에 있다.** 그래서 공용 부품과 문서를 먼저 만들고, 각 세션이 머지된 뒤 호출 쪽을 옮기는 순서를 제안한다(§5).

**제안 46개**(규칙 위반 10 · 중복·추상화 22 · FF 14) — 우선순위 **높음 8** · 중간 15 · 낮음 23. 문서 쪽 제안은 12개(§3).

## 2. 제안 목록

열: ID · 분류 · 문제(근거) · 고치는 법 · 영향(파일 수) · 위험 · 크기 · 우선순위 · 겹침

### 2-1. 우선순위 높음

| ID | 분류 | 문제 · 근거 | 고치는 법 | 영향 | 위험 | 크기 | 우선 | 겹침 |
|---|---|---|---|---|---|---|---|---|
| A1 | 규칙 위반(patterns §6) | **확인 오버레이 계약이 세 갈래다.** `EasyOverlay`는 `onConfirm`이 throw하면 열린 채 둔다(`src/ui/components/EasyOverlay/EasyOverlay.tsx:22,66-68`). 그런데 훅은 `Promise<boolean>`을 돌려주고 에러를 삼킨다(호스팅 model 훅의 `return false` 38곳). 그래서 다음 세 방식이 섞여 있다. ① `let ok=false` 클로저 — 실패해도 닫힌다(`fh/host/HostMembersView.tsx:125-141`, 주석에 "실패해도 닫는다"). ② 닫힌 뒤에 서버를 부른다(`fh/ticket/ui/TicketCard.tsx:79,106`). ③ `false`를 throw로 바꾼다(`fh/event/EventDashboardView.tsx:163-166`). 관객 쪽은 선물 거절·회수·반환·탈퇴·주문 취소를 `EasyOverlay` 없이 시트에 pending과 effect 닫기를 직접 달았다(`fa/gift/GiftLandingView.tsx:311,351`, `fa/ticket/ui/TicketGiftButton.tsx:141-176`, `fa/mypage/ui/OrderOverlays.tsx:219-232`, `fa/mypage/ui/WithdrawPopup.tsx:37`). §6은 P8b를 1차 소비처로 정해 두었다 | 계약을 하나로 정한다. 추천: `src/ui`에 `throwIfFalse(fn)`(또는 `onConfirm`이 `false`를 받으면 열린 채 두는 옵션)을 두고 모든 확인을 `openConfirm({ onConfirm })`로 쓴다. 시트 안에 에러 문구를 띄우는 경우(`TicketGiftButton`, 탈퇴 `USER_400_6`)를 `EasyOverlay`가 받을 수 있는지가 **확인 필요** | 호스팅 4 + 관객 4 + ui 1 | 중 — e2e·QA의 확인 다이얼로그 흐름(멤버 권한 변경·선물·취소). 실패 시 닫힘→유지로 동작이 바뀐다 | M | 높음 | 105·106 |
| A2 | 중복 · 동작 불일치 | **"끝난 공연(`Event_400_17`) → 공연 상태 다시 읽기"가 제각각이다.** 호스팅에서 `Event_400_17`을 18곳이 다루고, 6곳은 `eventManageQuery` exact 무효화를 직접 쓴다(`fh/ticket/model/useTicketList.ts:134-140`, `fh/event/model/useEventSections.ts:130-135`, `fh/guest/model/useGuestExport.ts:43`). 이미 있는 `invalidateEventStatus`(`fh/qr/model/qr-cache.ts:27`)는 QR만 쓴다. 옵션 쪽 두 곳은 안내만 하고 다시 읽지 않아 읽기 전용으로 바뀌지 않는다(`fh/ticket/model/useTicketOptions.ts:105`, `useOptionEditor.ts:86`). 문구 "끝난 공연은 수정할 수 없어요"는 8번 정의돼 있다 | `invalidateEventStatus`와 문구를 호스팅 공용 event-cache로 올리고 모든 처리기가 그것을 부르게 한다(옵션 두 곳 포함) | 8 | 낮음 — 옵션 화면이 끝난 공연에서 읽기 전용으로 바뀌는 것이 새 동작이다 | S | 높음 | 106 |
| A3 | 중복(patterns §9 · directory-structure) | **금액 포맷 함수가 없다.** `toLocaleString('ko-KR')`가 17개 파일에 21번 나오고, 그중 "…원"이 12곳이다. 로컬 `won`이 두 개인데 하나만 띄어쓴다(`fa/checkout/CheckoutView.tsx:45` `1,000 원` vs `fh/guest/ui/guest-labels.ts:65` `1,000원`). `wonLabel`(`fa/mypage/model/order-card.ts:45`)과 `formatTicketPrice`(`fa/event/EventDetail/TicketOptionList.tsx:15`)는 내용이 같다. "+ N원"(`Chip.tsx:22`)과 "+N원"(`fh/ticket/ui/TicketParts.tsx:67`)도 다르다. directory-structure.md:273에 `utils/money.ts`가 적혀 있지만 파일이 없다 | `src/utils/money.ts`(`formatWon` · `formatPrice`(0원 → 무료) · `formatSignedWon` · `formatCount`)를 만들고 호출 쪽을 바꾼다. 체크아웃의 띄어쓰기가 Figma를 따른 것인지 **확인 필요** | 17 | 낮음 — 화면 글자가 바뀌어 e2e·QA 텍스트 단언에 걸릴 수 있다 | S | 높음 | 105·106(호출 쪽) |
| A4 | FF · 사용자에게 보이는 불일치 | **D-day 글자를 네 곳이 따로 만든다.** 공연 당일이 사이드바 `D-0`(`fh/event/ui/EventScopeNav.tsx:104`), 마이페이지 `D-DAY`(`fa/mypage/model/order-card.ts:33`, `lists.ts:18`), 칩 `D-day`(`src/ui/components/Chip/Chip.tsx:26` `formatDday`)로 나온다. "공연종료"(`order-card.ts:26`)와 "공연 종료"(`lists.ts:22`)도 섞여 있다 | 글자 함수 하나(`formatDday` + 종료·공연 중 문구)를 `src/api/shared`(또는 utils)로 올리고 네 곳이 쓴다. 표기는 design-system §3 기준이고, 와이어마다 다른지 **확인 필요** | 4 | 낮음 — 텍스트 단언 | S | 높음 | 105·106 |
| A5 | 규칙 위반(tech-decisions §13 · directory-structure:70) | **루트 `global-error.tsx`와 루트·`hosting` `error.tsx`가 없다.** `error.tsx`는 `src/app/(audience)/error.tsx` 하나뿐이다. 호스팅에서 `AsyncBoundary` 밖의 렌더 에러가 나거나 루트 레이아웃에서 에러가 나면 받을 경계가 없다 | `src/app/global-error.tsx`와 `src/app/hosting/error.tsx`를 추가한다(관객 쪽 것을 본뜬다). 실제로 어떤 화면이 나오는지는 **확인 필요**(빌드에서 에러를 던져 보기) | 2(새 파일) | 낮음 | S | 높음 | 없음(`app/hosting` 라우트 파일은 106 범위 밖) |
| A6 | 중복 · 잠재 버그 | **`UploadedImage`가 이미 하는 실패 처리를 호출하는 쪽에서 또 한다.** `UploadedImage`는 실패한 src를 기억하고 `fallback`을 그리며, src가 바뀌면 다시 시도한다(`src/ui/components/UploadedImage/UploadedImage.tsx:26-38`). 호출 쪽 5곳은 `useState(failed)`, `naturalWidth===0` ref, `onError`를 또 붙였다(`fa/mypage/ArchiveView.tsx:126-140`, `fa/mypage/ui/OrderParts.tsx:42`, `fa/ticket/ui/PosterCard.tsx:49`, `fa/event/EventDetail/EventDetailView.tsx:322`, `fa/gift/GiftLandingView.tsx:273`). 호출 쪽 `failed`는 src가 바뀌어도 풀리지 않는다 | 호출 쪽 상태를 지우고 `fallback` prop만 쓴다 | 5 | 낮음 — 포스터 실패 QA 캡처 | S | 높음 | 105 |
| A7 | 중복 | **"불러오지 못했어요 + 다시 시도" 줄을 손으로 그린다.** 관객 8개 파일(`fa/mypage/ArchiveView.tsx:65-76`, `FollowingHostsView.tsx:56-67`, `fa/checkout/OrderCompleteView.tsx:72-85`, `fa/mypage/OrderDetailView.tsx:531-546` 등)이 그렇고, 화면마다 글자 색(`textSecondary`/`textSecondaryLabel`)과 버튼 크기(md/sm)가 다르다. 호스팅은 `ListError`·`NoticeLine`(`fh/guest/ui/GuestParts.tsx:168`)을 만들었지만 다른 화면은 쓰지 않는다(`fh/home/HostingHomeView.tsx:229`, `fh/ticket/TicketListView.tsx:67`, `fh/guest/ui/OrderDetailOverlay.tsx:81-86`은 그대로 베꼈다) | `src/ui`에 `InlineError({ message, onRetry })`를 두고(DS 모양은 `DefaultErrorFallback`과 맞춘다), 관객·호스팅 둘 다 옮긴다 | 관객 8 + 호스팅 5 이상 | 낮음 — 에러 QA 캡처의 모양이 바뀜 | S~M | 높음 | 105·106 |
| A8 | 중복(patterns §6 · 문서 drift) | **검색어 debounce를 `setTimeout` effect로 두 번 짰다**(`fa/home/model/useEventList.ts:70-74`, `fh/home/model/useHostingHome.ts:89-94`). 상수도 둘이다(`KEYWORD_DEBOUNCE_MS`·`HOSTING_KEYWORD_DEBOUNCE_MS`, 둘 다 300). §9는 `es-toolkit`을 쓰라고 하지만 `package.json`에 없다(사용 0) | `src/ui/hooks/useDebouncedValue(value, ms)` 하나를 두고 §9를 고친다. 또는 `es-toolkit`을 설치한다 — **사용자 결정**(의존성 추가 여부). 추천은 훅(두 곳뿐이다) | 2 + 문서 | 낮음 | S | 높음 | 106(home 둘 다) |

### 2-2. 우선순위 중간

| ID | 분류 | 문제 · 근거 | 고치는 법 | 영향 | 위험 | 크기 | 우선 | 겹침 |
|---|---|---|---|---|---|---|---|---|
| A9 | 중복 · 추상화 | 폼 훅 골격(`base`·`values`·`attempted`·`serverErrors`·`inflight` ref·`isXDirty`)을 반복한다. `inflight` ref가 13개 파일, `setAttempted`가 9개 파일, `serverErrors`가 5개 파일이다(`fh/event/model/useEventBasicInfo.ts:76-95`, `fh/ticket/model/useTicketForm.ts:88,141`, `fh/host/model/useHostSettings.ts:68-75`). 문서와의 차이는 D1 | 문서를 먼저 고치고(D1), 원하면 `useEditDraft(base, { isDirty, validate })`로 골격만 묶는다. 순수 함수(`*-form.ts`)는 그대로 둔다 | 9~13 | 중 — 폼 저장·이탈 확인 e2e 전반 | M | 중간 | 106(대부분) |
| A10 | 중복 | 이미지 업로드 흐름(업로드 mutation + `show(code)` + 에러 문구표)이 세 벌이고 문구표는 네 벌이다(`fh/host/model/useHostSettings.ts:77-105`, `fh/event/model/useEventBasicInfo.ts:108-133`, `fh/event/model/useEventSections.ts:74-98`, `fa/mypage/model/profile.ts:25`). directory-structure의 `features/shared/image-upload/`는 없다 | `UPLOAD_ERROR_MESSAGE`와 `useImageUpload(target)`을 `features/shared/image-upload`(문서 자리)에 둔다 | 4 | 낮음 — 업로드 e2e | S | 중간 | 105·106 |
| A11 | 중복 · 결합 | 무한 목록 훅 끝의 `hasNextPage`·`isFetchingNextPage`·`nextPageError`·`loadMore`(`cancelRefetch:false`)·`retry` 묶음이 6번 반복된다(`fa/mypage/model/useMyOrders.ts:33-41`, `useArchive.ts:38-45`, `useFollowingHosts.ts:97-104`, `fa/home/model/useEventList.ts:136-145`, `fs/host-home/model/useHostHome.ts:149`, `fh/home/model/useHostingHome.ts:67`). `useArchive.ts:22-28`만 `flattenPages` 대신 중복 제거를 직접 짰다 | `src/api/shared/page.ts`에 `infiniteListControls(query)`(= `LoadMoreSentinel`이 받는 모양)를 둔다 | 6 | 낮음 | S | 중간 | 105·106 |
| A12 | 중복 · 결합 | `NOTIFICATIONS_KEY`가 api(`src/api/notification/queries.ts:14`)와 gift(`fa/gift/model/gift-cache.ts:13`)에 두 번 있고, ticket이 gift의 사본을 import한다(`fa/ticket/model/useTicketDetail.ts:10`). 화면에서 키를 손으로 쓰는 곳도 있다: `['gifts']`(`gift-cache.ts:24`), `['events', String(eventId), 'manage']`(`fh/event/model/event-cache.ts:67`), `src/api/gift/queries.ts:39`는 `MY_TICKETS_KEY`를 쓰지 않는다 | api의 키 상수(`GIFTS_KEY`, `eventManageKey(id)`)만 쓰게 한다 | 4 | 낮음 | S | 중간 | 105·106 |
| A13 | 규칙 위반(§9 로딩) · 잠재 버그 | `OptionSheets`가 훅 호출을 `setBusy(true/false)`로 감싸는데 try/finally가 없다. 호출이 throw하면 `busy`가 true로 굳는다(`fh/ticket/ui/OptionSheets.tsx:68,88-104`). 같은 모양: `fa/mypage/model/useFollowingHosts.ts:41,57-72`(행별 pending, finally는 있음) | 훅이 mutation `isPending`에서 만든 `pending`을 돌려준다. 행별 pending은 `useMutationState`로 바꿀 수 있는지 **확인 필요** | 2 | 낮음 | S | 중간 | 105·106 |
| A14 | FF · 결합 | 호스팅 피처끼리 서로 import한다(event→host 5, home→event 3, event→home 3, host→home 2). 공용 폼 부품(`useLeaveGuard`·`FieldError`·`FormSection`·`EditorBottomBar`)이 `fh/event/ui`에 있는데 host·ticket이 쓴다(`fh/host/HostSettingsView.tsx:19`, `fh/ticket/TicketFormView.tsx:13`). `fh/home/model/home-cards.ts:4`는 host를 import한다 | `fh/shared/`(또는 `fh/editor/`)를 만들어 공용 부품·칩·필드를 옮기고, eslint로 피처 사이 import를 막는다 | 약 10 | 낮음(이동만) — import 경로만 바뀐다 | M | 중간 | 106 |
| A15 | FF · 결합 | `fs/auth`와 `fs/shell`이 서로 import한다(auth→shell 2, shell→auth 7). 원인은 도메인과 무관한 Activity 유틸이다(`fs/shell/activity-marker.ts` · `useActivityMarker.ts`, 쓰는 곳 `fs/auth/protected-area.ts:3`, `fs/auth/LoginGate.tsx:10`) | `src/ui/hooks/useActivityMarker`와 ui 유틸로 옮긴다(patterns §6에 경로가 적혀 있으니 문서도 고친다) | 7 | 낮음 — `e2e/shell-activity.spec.ts`가 지켜 준다 | S | 중간 | 106(shell) |
| A16 | 중복 | 운영 표 훅 `useOrderList`·`useIssuedTicketList`가 입력·적용 검색어, 검색 종류, `page`, `submitSearch`, `OPERATION_KEYWORD_MAX` 자르기, `keepPreviousData`를 거의 같게 짰다. `useRefundList`는 필터·페이지 부분이 같다(`fh/guest/model/useOrderList.ts:29-60`, `useIssuedTicketList.ts:30-74`, `useRefundList.ts:25-29`) | `useTableQueryState({ initialFilter, searchType })` | 3 | 중 — 예매자 관리 e2e·QA(탭·검색·페이지) | M | 중간 | 106 |
| A17 | 중복 | 체크아웃과 주문상세의 결제정보(계좌 + 복사)·결제금액 블록이 거의 같고 문구가 어긋난다("…동일하게 해주세요" vs "…입력해주세요") (`fa/checkout/CheckoutView.tsx:455-507`, `fa/mypage/OrderDetailView.tsx:408-476`) | `AccountInfoRows`·`AmountRows`를 audience 공용으로 뺀다. 문구는 legal-copy·Figma를 보고 하나로 고르는 것이 **확인 필요** | 2 | 중 — 금전 경로 화면, 문구 단언 | M | 중간 | 105 |
| A18 | 중복 | 상태 톤 → 칩 색 표가 세 벌 똑같다(`fa/mypage/ui/OrderParts.tsx:16`, `fa/mypage/OrderDetailView.tsx:37`, `fa/ticket/ui/ticket-chips.tsx:12`). 체크인 결과 톤 → 아이콘·색 표도 관객·호스팅에 똑같이 있다(`fa/checkin/SelfCheckInView.tsx:28`, `fh/qr/ui/ScanResult.tsx:14`) | 톤 → 색 표 하나로 모으고, 체크인 표는 `fs/checkin-result/ui`로 옮긴다(상태 → 톤 표는 합치지 않는다, §4) | 5 | 낮음 | S | 중간 | 105·106 |
| A19 | 중복(§9 날짜) | 날짜 계산이 `date.ts` 밖에 있다. KST 오프셋을 직접 계산하는 곳(`fa/mypage/model/order-card.ts:5-12` `9*3_600_000`, `fa/event/model/event-json-ld.ts:17` `KST_OFFSET_MS`), 요일 배열을 다시 만든 곳(`fa/event/model/event-schedule.ts:10,30-35`, `fa/event/EventDetail/week-calendar.ts:24-30` — `date.ts`의 `KOREAN_WEEKDAYS`와 중복), 입력값 ↔ 서버 형식을 두 번 짠 곳(`fh/ticket/model/ticket-form.ts:90-101`, `fh/event/model/schedule.ts:28-47`), `kstDate`(`fa/mypage/model/profile.ts:32` = `formatKstDateTime(d).slice(0,10)`)이 있다 | `date.ts`에 `kstParts` · `kstDayDiff` · `splitKstDateTime`/`joinKstDateTime` · `toKstIso`를 더하고 옮긴다 | 7 | 중 — 날짜 경계(자정·KST) 테스트가 있는 곳은 테스트를 그대로 통과해야 한다 | M | 중간 | 105·106 |
| A20 | FF · 예측 가능성(§6) | 공연 상세가 "오버레이를 닫은 뒤 이동"을 따로 짰다. `history.state.ddOverlay`를 직접 읽고 popstate를 기다리며 `setTimeout(go, 1000)`이라는 매직 넘버를 쓴다(`fa/event/EventDetail/EventDetailView.tsx:70-88`). 공용 `useCloseOnBack().release()`가 있고 체크아웃은 그것을 쓴다(`CheckoutView.tsx:141,162`) | `TicketSheet`가 `release()`를 노출하게 바꾼다 | 1~2 | 중 — 뒤로가기·이동 e2e | S~M | 중간 | 105 |
| A21 | 중복 · 계약 | 연락처 요청 스키마가 event·host에 두 벌이고 전화번호 15자 제한은 host에만 있다(`src/api/event/schema.ts:230`, `src/api/host/schema.ts:119,136`) | 서버 규칙(`@Size`)을 보고 공용 스키마 하나로 — 서버 규칙 **확인 필요** | 2 | 낮음 | S | 중간 | 없음 |
| A22 | FF · 문서 drift | queryKey 규칙이 두 가지로 섞였다. 경로 모양(`['events', id]`)과 `'list'`/`'detail'`이다. 무한 목록인 공지는 `'infinite'`가 없고(`src/api/notice/queries.ts:26`), 같은 파일에서 환불 키만 `'list'`가 없다(`src/api/order/queries.ts:106,137`, `src/api/issued-ticket/queries.ts:44`) | §4-1에 list/detail 방식을 허용으로 적고(D5) notices·refunds 키를 맞춘다 | 3 | 낮음 — 무효화 대상 키가 바뀌므로 cache 파일을 같이 고친다 | S | 중간 | 없음(api) |
| A23 | 중복 | 표 → `handleError` 처리기 변환 `Object.fromEntries(Object.entries(TABLE).map(…))`을 8곳에서 반복한다(`fa/gift/model/useGiftActions.ts:38`, `useGiftLanding.ts:98`, `fa/mypage/model/useOrderDetail.ts:71`, `fa/checkout/model/useCheckout.ts:260` + 호스팅 4) | `src/api/handle-error.ts`에 `handlersFrom(table, onCode)`를 둔다 | 8 | 낮음 | S | 중간 | 105·106 |

### 2-3. 우선순위 낮음

| ID | 분류 | 문제 · 근거 | 고치는 법 | 영향 | 위험 | 크기 | 겹침 |
|---|---|---|---|---|---|---|---|
| A24 | FF · 가독성 | 큰 파일: `fa/checkout/CheckoutView.tsx` 686줄(`CheckoutForm`만 약 228줄), `fh/ticket/ui/OptionSheets.tsx` 554줄(컴포넌트 4개), `fa/mypage/OrderDetailView.tsx` 547, `fh/ticket/TicketFormView.tsx` 475, `fh/event/EventInfoView.tsx` 471, `fh/guest/ui/OrderDetailOverlay.tsx` 442 | 섹션 단위로 쪼갠다(세션 머지 뒤) | 6 | 중 | L | 105·106 |
| A25 | FF · 응집 | 큰 반환 객체: `useEventBasicInfo` 37키(`:302-373`), `useTicketForm` 36키, `useIssuedTicketList` 34키, `useCheckout` 27키를 하위 컴포넌트 7개에 통째로 넘긴다. 21키 이상인 훅이 호스팅에만 10개다 | 영역별로 묶거나(`search`·`pagination`·`export`) 하위 훅으로 나눈다 | 10+ | 중 | M | 105·106 |
| A26 | 중복 | 같은 `<AsyncBoundary holdOn={isSessionLost} rejected={HostingAccessRejected} resetKeys=…>`를 8개 파일 9곳에 썼다(`fh/host/HostMembersView.tsx:50`, `fh/guest/GuestsView.tsx:41`, `fh/event/EventScopeView.tsx:32`) | `fh/access`에 `HostingBoundary`를 둔다 | 8 | 낮음 | S | 106 |
| A27 | 규칙 위반(§3) | `Divider`에 굵기·안쪽 여백 옵션이 없어 1px 선을 직접 짠 곳이 16개 파일 23곳이고, 섹션 띠 `sectionGap`도 두 벌이다(`fa/checkout/CheckoutView.css.ts:48,79`, `fa/mypage/ui/mypage.css.ts:67`) | `Divider`에 `variant="section"`과 `inset`을 더하고 옮긴다 | 16 | 낮음 — 캡처가 1px 정도 달라질 수 있다 | S~M | 105·106 |
| A28 | 규칙 위반(§3) · 문서 | 화면 코드의 원시 `<div className=…>`가 54개 파일에 212개 있다(`CheckoutView` 19, `TicketFormView` 17). flex+gap만 하는 `.css.ts` 클래스가 호스팅에만 27개다(`fh/guest/ui/OrderDetailOverlay.css.ts:5,7,18,30`). §3은 "리뷰에서 지적"이라고만 하는데, 실제로는 배경·테두리를 가진 상자도 div로 둔다 | 일괄로 고치지 않는다. 새 코드에만 적용하고 flex+gap만 하는 클래스는 `Flex`로 바꾼다. §3 문구는 D9 | 54 | 중(캡처) | L | 105·106 |
| A29 | 중복 | 숨긴 글(sr-only) 스타일을 8곳에서 직접 만들었고, 16개 파일은 Radix `VisuallyHidden`을 쓴다(`fs/notification/NotificationInboxView.css.ts:105`, `fs/host-home/HostHomeView.css.ts:225`, `fs/shell/ShellDrawer.css.ts:89`) | `VisuallyHidden`으로 통일 | 8 | 낮음 | S | 106 |
| A30 | 규칙 위반(스타일) | 전역 `:focus-visible`(`src/ui/theme/global.css.ts:38`)과 같은 outline을 호스팅에서 14번 다시 선언했다(`fh/home/ui/HomeCards.css.ts:29`, `fh/event/EventInfoView.css.ts:135`, `fh/host/HostManage.css.ts:99`) | 똑같은 것만 지운다. reset 뒤에 되살리는 것일 수 있어 **확인 필요** | 11 | 낮음 | S | 106 |
| A31 | 중복 | 아바타 연필 배지가 세 벌이고 크기가 20·24·28로 다르다(`src/ui/components/AccountMenu/AccountMenu.css.ts:51`, `fs/shell/ShellDrawer.css.ts:32`, `fa/mypage/ui/mypage.css.ts:204`) | Figma 크기를 확인한 뒤 `Avatar`의 `editBadge`로 — **확인 필요** | 3 | 낮음 | M | 105·106 |
| A32 | FF · 예측 가능성 | 상세 404 → 닫고 알리기를 두 방식으로 짰다(`fh/guest/model/useOrderDetail.ts:94-105` `missingFor` 상태 + effect, `useIssuedTicketList.ts:51-62` 카운터 + effect) | `useMissingDetail(code, onMissing)` 하나로 | 2 | 낮음 | S | 106 |
| A33 | 중복 | cache 파일 밖의 무효화 묶음: `fh/host/model/useCreateHost.ts:59-63`, `fh/guest/model/guest-cache.ts:41-43`(`ticket-cache`의 `invalidateTickets`를 쓰지 않음), `invalidateExact`가 두 번 정의(`ticket-cache.ts:17`, `event-cache.ts:18`) | 묶음을 cache 파일로, `invalidateExact`는 공용으로 | 4 | 낮음 | S | 106 |
| A34 | FF | 성공 여부를 `useState`로 따로 든다(`fa/gift/model/useGiftActions.ts:231/247, 267/279`, `fa/mypage/model/useOrderDetail.ts:186/212`, `fa/checkout/model/useCheckout.ts:196/249`). `useReturnGift`는 옵션 `onSuccess`에서 `setDone`을 부른다(§4-5 금지 형태, 이유 주석은 있음) | mutation `isSuccess`로 바꾼다. 의도가 있을 수 있어 **확인 필요** | 3 | 낮음 | S | 105 |
| A35 | FF · 숨은 부수효과 | 조회 훅 `useTicketDetail`이 상세를 받을 때마다 공지 바·알림을 무효화한다(읽음 동기화, `fa/ticket/model/useTicketDetail.ts:78-92`) | `useMarkTicketViewed`처럼 이름을 드러내는 훅으로 뺀다 | 1 | 낮음 | S | 105 |
| A36 | 중복 | 주소 함수가 흩어져 있다. `eventHref` 두 벌(`fa/checkout/model/checkout-params.ts:19`, `fa/mypage/model/lists.ts:29`), `orderHref`/`orderDetailHref` 이름만 다름(`lists.ts:30`, `fa/ticket/model/ticket-groups.ts:41`), 직접 쓴 `/events/${}` 6곳 | audience `routes.ts` 하나로 | 6 | 낮음 | S | 105·106 |
| A37 | 중복 | 공연명이 없을 때 쓰는 대체 문구: 상수가 두 벌(`fa/home/model/card-date.ts:12`, `fh/home/model/home-cards.ts:73`), 문자열을 직접 쓴 곳 5곳, 공연 상세만 "두둥 공연"(`event-summary.ts:10`) | 상수 하나로 | 7 | 낮음 | S | 105·106 |
| A38 | FF · 문구 | 같은 상태가 영역마다 다르게 쓰인다: 티켓 "승인 대기 · 입장 완료 · 선물 대기중"(`fa/ticket/model/my-ticket-state.ts:14-24`) vs 주문 "승인대기 · 입장완료 · 선물중"(`fa/mypage/model/order-status.ts:27`), "계좌이체" vs "직접계좌이체" | 표는 두고 문구만 Figma 근거로 정리 — **확인 필요** | 3 | 낮음 — 텍스트 단언 | S | 105 |
| A39 | 중복 | 카카오 공유 실패 → 링크 복사 처리가 두 벌이다(`fa/event/EventDetail/shareEvent.ts:16-19`, `fa/gift/GiftActionSections.tsx:144-147`) | `fs/kakao-share`에 `shareKakaoOrCopy`를 둔다 | 2 | 낮음 | S | 105 |
| A40 | FF · 배치(§8) | `fa/mypage/ui/mypage.css.ts`(278줄)를 7개 파일이 같이 쓴다. 소문자 컴포넌트 파일 `fa/ticket/ui/ticket-chips.tsx`. 로직이 `model/` 밖에 있다: `fa/event/EventDetail/shareEvent.ts`·`week-calendar.ts`, `fs/auth` 8개(`useSession`·`useLogout`·`session-sync`…), `fs/notice/notice-format.ts`. 컴포넌트 파일 `TicketOptionList.tsx`가 규칙 함수를 export한다 | 옮기기만 한다(`useSession`은 10개 파일이 import한다) | 15 | 낮음 | M | 105·106 |
| A41 | FF · 네이밍 | export된 컴포넌트 이름이 `V`다(`fh/guest/ui/OrderDetailOverlay.tsx:106`). 훅 결과를 한 글자 변수로 받는 곳이 21곳이다(`const f/l/m/w/d/e/s = use…`). `s`는 CSS import와 겹친다(`fh/event/EventScopeView.tsx:39`) | `InfoValue`, `form`/`list`/`scope`로 바꾼다 | 21 | 낮음 | S | 106 |
| A42 | 규칙 경계(§22) | 역할 표시를 if 체인으로 정한다(`fh/home/model/home-cards.ts:19-21`, `fh/host/HostMembersView.tsx:197`). 권한 우회가 아니라 표시용이다(`member-rules.ts:48-55`는 `can()`과 함께 대상 역할을 본다) | `Record<HostRole, ChipLook>`로, 그리고 `member-rules`가 `hideRoleLabel`을 준다(문서 D10) | 3 | 낮음 | S | 106 |
| A43 | 규칙 경계(§4-5) | `useRegisterForm`이 `handleError` 대신 `getErrorCode`로 직접 분기하고(`fs/auth/model/useRegisterForm.ts:115-128`), `useState` 로딩을 쓴다(`:57`). 같은 이유로 `useLogout.ts:36`도 그렇다. authApi 직접 호출이라 mutation이 아니다 | `handleError(e, {...}, { otherwise })`로 바꾸거나 "authApi 예외" 주석을 단다 | 2 | 낮음 — 가입 e2e | S | 없음 |
| A44 | 규칙 경계(§7) | `DropdownMenu`가 다른 컴포넌트의 css를 import한다(`src/ui/components/DropdownMenu/DropdownMenu.tsx:6` → `../Popover/Popover.css`) | 공용 surface 스타일을 theme로 | 1 | 낮음 | S | 없음 |
| A45 | 과한 추상화 · 누락 | `src/ui`에서 쓰는 곳이 1곳인 컴포넌트가 12개다. 이 중 DS에 없는 것은 `ListHeader`(`HostHomeView`만)와 `LinkProgress`다. 많이 쓰는 `UploadedImage`(10곳)·`AsyncBoundary`(19곳)에는 스토리가 없다 | `ListHeader`를 features로 내릴지 검토하고, 스토리 둘을 추가한다 | 3 | 낮음 | S | 106(host-home) |
| A46 | 규칙(§3 토큰) · 사소 | 토큰이 있는데 숫자를 직접 썼다: `fs/host-home/HostHomeView.css.ts:165-166`(24), `fa/home/EventListView.css.ts:64`(gap 10), `fa/gift/ui/GiftSend.css.ts:18`(28). `'use client'`가 없는 화면 tsx가 3개다(`fa/ticket/ui/EventInfo.tsx`, `ticket-chips.tsx`, `fh/guest/ui/DetailCell.tsx` — 클라이언트에서만 import돼 동작에는 문제 없음). `listStyle:'none'` 리셋이 31번이다 | 토큰으로 바꾸고, `'use client'`를 단다. 리스트 리셋은 sprinkles나 전역으로 | 6+ | 낮음 | S | 105·106 |

## 3. 문서 쪽 제안 (코드가 맞고 문서가 낡은 것)

| ID | 문서 · 위치 | 코드 실제 | 정본 · 근거 |
|---|---|---|---|
| D1 | patterns §4-4 "폼: RHF `defaultValues`", §23 "RHF `dirtyFields`로 본문", tech-decisions:519·749·1498 | 폼 모델 12개 중 11개가 `useState` + 처음 값(`base`) 비교 + 순수 함수(`validateX`·`isXDirty`·`toXBody`)다. RHF는 체크아웃만 쓴다 | **코드.** implementation-log:415에 P10a부터 의도적으로 바꾼 기록이 있다("결과는 같다"). 문서를 "RHF(체크아웃) 또는 `useState`+순수 함수 — 바뀐 필드는 처음 값 비교"로 고친다. 다시 쓴 쿼리가 편집 중인 값을 덮지 않는다는 원칙은 둘 다 지킨다 |
| D2 | patterns §9 "debounce: `es-toolkit`" | 설치돼 있지 않다 | **결정 필요**(A8). 추천: `useDebouncedValue` 훅으로 적는다 |
| D3 | directory-structure: `utils/clipboard.ts`, `features/shared/image-upload/`, ui hooks 4개, ui 컴포넌트 목록, `app/`에는 라우트 + 셸 파일 2개만 | `copy-text.ts`; image-upload 없음; hooks 5개(`useIsClient`); 문서에 없는 ui 13개(`AccountMenu`·`ConcertCard`·`Drawer`·`EntranceCard`·`LoadMoreSentinel`·`QrCode`·`SalesCard`·`Schedule`·`SidebarMenu`·`StatCard`·`TopBar`·`UploadedImage`·`Popup`); `csp-report/summarize.ts`, `robots.ts`·`sitemap.ts`, `ui/theme/bars.ts`, `api/shared/zod-config.ts`, `api/server/sitemap-source.ts`·`request-origin.ts`, utils `csp.ts`·`html-limited-bots.ts`·`image.ts`·`site.ts` | **코드.** 목록을 갱신한다. 단 `utils/money.ts`(A3)와 `image-upload`(A10)는 문서 쪽이 맞으니 코드를 만든다 |
| D4 | patterns §7 "`src/utils`는 순수 함수만" | `copy-text.ts`(DOM), `download.ts`(DOM), `log.ts`(console) — directory-structure도 이 파일들을 utils에 둔다 | **코드 + directory-structure.** §7을 "React·앱 상태·features 의존 없음"으로 고친다 |
| D5 | patterns §4-1 "queryKey는 경로 모양" | 운영 표는 `'list'`/`'detail'`을 쓴다(대상별 무효화에 필요) | **코드.** list/detail 방식을 허용 규칙으로 적는다(A22에서 어긋난 두 키는 코드를 맞춘다) |
| D6 | design-system: 사이드바 `SidebarItem`, `UploadedImage` 없음, `ForbiddenView` "P5a·P9·P10a가 쓴다" | `SidebarMenu`/`SidebarMenuItem`, `UploadedImage` 있음, `ForbiddenView`는 `HostingAccessRejected` 한 곳만 | **코드** |
| D7 | patterns §6 "Activity 표시는 `src/features/shared/shell/`" | 지금은 맞다 | A15를 채택하면 `src/ui/hooks`로 같이 고친다 |
| D8 | CLAUDE.md 규칙 요약 "`usePathname`·`useSearchParams`는 children 감싸지 않는 말단 + 자체 Suspense" | `(app)`·`hosting` 레이아웃은 그룹 전체를 `<Suspense>`로 감싸고, 그 아래 model 훅이 `useSearchParams`를 쓴다(`useEventList`·`useHostingHome`·`useGuestsUrlState` 등). tech-decisions:103·directory-structure:85·107에는 이 방식이 적혀 있다 | **코드 + tech-decisions.** CLAUDE.md 한 줄에 "(셸·`(public)`에 닿는 컴포넌트 한정 — `(app)`·`hosting` 페이지 안은 그룹 Suspense로 충분)"을 덧붙인다 |
| D9 | patterns §3 "원시 `<div className>` 레이아웃을 리뷰에서 지적" | 212개 / 54파일. 고유 모양(배경·테두리·자손 선택자)을 가진 상자는 div가 자연스럽다 | **문구를 좁힌다**: "flex·gap·margin만 하는 div는 `Flex`·`Spacing`으로. 고유 모양 상자는 `.css.ts` + div 허용" |
| D10 | patterns §22 "역할 문자열을 직접 비교하지 않는다" | 표시용 매핑(라벨·칩 색)은 비교한다 | **문구를 좁힌다**: "권한 판정은 `can()` — 역할 → 라벨·색 같은 표시 매핑은 `Record<HostRole, …>`로" |
| D11 | tech-decisions §13 "라우트별 `error.tsx` + 루트 `global-error.tsx`", directory-structure:70 | `(audience)/error.tsx`만 있다 | **문서가 맞다** → A5로 코드를 만든다 |
| D12 | directory-structure "healthz가 유일한 Route Handler" | `src/app/csp-report/route.ts`도 있다(P14) | **코드** |

## 4. 하지 않는 게 나은 것

| 보기엔 중복 | 왜 합치지 않나 |
|---|---|
| 주문 상태 표 / 티켓 상태 표 / 호스팅 예매자 칩 표(`order-status.ts`, `my-ticket-state.ts`, `fh/guest/ui/guest-labels.ts:18`) | 상태 값의 종류, 보는 사람(관객 / 운영자), 디자인 근거가 다르다. 톤 → 색 매핑(A18)만 공유한다 |
| 도메인별 `*-cache.ts`(event · ticket · guest · host · qr) | patterns §23의 응답 → 키 규칙을 파일마다 주석으로 들고 있다. `invalidateExact` 같은 작은 헬퍼만 공유한다(A33) |
| `inflight` ref vs mutation `isPending` | `isPending`은 비동기로 갱신돼 빠른 더블 클릭을 막지 못한다. ref는 유지하고 골격만 묶는다(A9) |
| mutation마다 `useState(error)` + try/`handleError` | §4-5가 "호출 쪽에서 명시적으로 처리"하라고 정했고, 코드 표도 훅마다 다르다. 공용 훅으로 감싸면 과한 추상화가 된다. 변환 헬퍼(A23)까지만 둔다 |
| 오버레이 6종(`Modal`·`Popup`·`BottomSheet`·`ResponsiveOverlay`·`Drawer`·`EasyOverlay`) | 역할(alertdialog / 일반 / 반응형 분기 / vaul 드로어 / 확인 + 서버 호출)이 다르다 |
| `Dropdown`·`DropdownMenu`·`AccountMenu`, `Chip`·`FilterChip`·`TagButton`·`SelectButton` | Radix 프리미티브, ARIA 역할, Figma 컴포넌트가 다르다 |
| 대시보드 카드(`EntranceCard`·`SalesCard`·`Schedule`·`StatCard`) — 쓰는 곳 1곳 | DS에 등록된 Figma 컴포넌트라 `src/ui`가 맞다 |
| `Header` vs `TopBar` | 모바일 Top app bar 64 vs PC `Top bar_Host` 58 — 노드도 높이도 다르다 |
| `useEventContacts` vs `useOrderHostContacts` | 앞의 것은 프리페치된 공개 값을 읽고, 뒤의 것은 viewer 값만 읽는다. 판정은 이미 `resolveContacts`로 공유한다 |
| `representativeBadge`(서버 `dDay`) vs `orderPosterBadge`(`startAt`으로 계산) | 입력이 다르다(O-2·O-3에 `dDay`가 없다). 글자 함수만 공유한다(A4) |
| `PAY_TYPE_LABEL` 두 벌(`guest-labels.ts:58` vs `fh/ticket/model/ticket-rules.ts:17`) | 뜻이 다르다(전체 결제 방식 표시 vs 편집 라디오). 이름만 겹치지 않게 바꾼다 |
| `CHANNEL_LABEL` vs `PAYMENT_CHANNEL_LABEL` | GUI(`564:4156`)와 와이어(`128:2263`)의 문구가 다르다 |
| `(public)` 페이지의 `readX → notFound → Prefetch` 반복 | `instant = false`와 경계를 라우트 파일마다 드러내라는 규칙(tech-decisions §2)이 있다 |
| `(app)`·`hosting` 레이아웃의 children `<Suspense>` | 서버 조회가 없는 그룹이라 404 상태 코드와 무관하다(D8) |
| `notice-html.ts` / `notice-rules.ts` 분리 | 셸 배너가 `sanitize-html`(gzip 약 50KB)을 모든 라우트에서 불러오지 않게 하려고 일부러 나눴다 |
| `unreadDot`(6px) vs `Badge small`(8px) | Figma 값이 다르다 |
| `useEventScope`·`useCheckInStats`·`useBankSelect`(useQuery 감싸기) | 각각 파생 상태(SUPER_ADMIN 역할·메뉴, `meta.silent` + `refreshFailed`, 걸러낸 목록)를 만들어 §4-1 예외에 든다 |

## 5. 작업 묶음 제안

원칙: 105·106 세션이 머지되기 전에는 그 범위의 파일을 건드리지 않는다. 먼저 **공용 부품과 문서**를 만들어 두고, 세션이 머지되면 호출 쪽을 옮긴다.

| 순서 | PR / 세션 | 내용 | 파일 소유 | 선행 |
|---|---|---|---|---|
| 1 | **P-docs**(문서만) | D1~D12 반영. A1 계약 결정(§6 문구), A8 결정(D2) | `.claude/docs/**`, `CLAUDE.md` | 사용자 결정 2개(A1 계약 방식, A8 debounce) |
| 2 | **P-base**(지금 바로, 겹침 없음) | A5 `global-error.tsx`·`hosting/error.tsx`; A3 `utils/money.ts`; A4 D-day 글자 함수(`src/api/shared` 쪽 + `Chip`이 그것을 쓰게); A19의 `date.ts` 추가 함수; A7 `src/ui` `InlineError`; A11 `infiniteListControls`; A8 `useDebouncedValue`; A1 `throwIfFalse`/`EasyOverlay` 옵션; A12 api 키 상수(`GIFTS_KEY`·`eventManageKey`); A21·A22 api 스키마·키; A23 `handlersFrom`; A44; A45 스토리. **새 함수만 만들고 호출 쪽은 건드리지 않는다**(테스트 포함) | `src/app`(루트 파일), `src/utils`, `src/api/**`, `src/ui/**` | 1(계약) |
| 3 | **P-audience**(105 머지 뒤) | A1(관객 확인 시트 6개), A3·A4·A7·A11·A19·A23 호출 쪽, A6, A10(관객 profile), A12(gift-cache), A13(관심 호스트), A17, A18(관객), A20, A34~A39 | `features/audience/{checkout,event,ticket,gift,mypage,checkin}`, `shared/{kakao-share,checkin-result}` | 2, 105 머지 |
| 4 | **P-hosting**(106 머지 뒤) | A2, A1(호스팅), A3·A4·A7·A8·A11·A19 호출 쪽, A10, A13(OptionSheets), A16, A18(ScanResult), A26, A30, A32, A33, A41, A42 | `features/hosting/**`, `audience/home`(debounce·목록) | 2, 106 머지 |
| 5 | **P-structure**(3·4 뒤) | A14 `fh/shared` 이동 + eslint 피처 경계, A15 activity-marker → `src/ui/hooks`, A29, A31, A40 파일 이동, A9 `useEditDraft`(원하면) | `features/hosting/**`, `features/shared/{auth,shell,notification,host-home}` | 4 |
| 6 | **P-split**(마지막, 선택) | A24·A25 큰 파일·큰 반환 객체 나누기, A27 `Divider` 변형, A28 flex 전용 클래스 정리, A46 | 화면 파일 전반 | 5 |

- 3과 4는 파일 소유가 겹치지 않아 동시에 진행할 수 있다(`audience/home`은 4가 맡는다 — 106 범위라서).
- e2e·QA 영향이 큰 것: A1(확인 흐름), A3·A4·A17·A38(텍스트 단언), A16(예매자 관리), A20(뒤로가기). 각 PR에서 해당 피처의 `pnpm qa`와 e2e를 돌린다.
