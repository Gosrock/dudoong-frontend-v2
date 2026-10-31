# DuDoong-Front v2 문서

2026-10-15 기준(2026-10-25 Figma·백엔드 `432cce4`·v1 약관 문구 반영 — 개정 이력).

## 한 줄 요약

**Next 16 앱 하나(App Router, vanilla-extract)** 로 관객 화면과 호스팅 센터를 같이 만든다. 공개·공유 화면은 서버에서 조회해 렌더하고(캐시 없음), 로그인 뒤 조작 화면은 클라이언트에서 조회한다. 조회 정의(`queryOptions`)는 한 벌을 양쪽이 같이 쓴다. 백엔드 `/api/v2` 86개(처음 82개 + 은행 목록·공지 3개)는 이미 구현돼 있다.

## 문서

| 문서 | 내용 |
|---|---|
| [`tech-decisions.md`](./tech-decisions.md) | 기술 결정(§0~§20), 검증·조사 기록(§21~§23·§26), 도구 세팅(§24), 배포 인프라(§25), 검토 기록(§27~§29), GUI 반영(§30 — 2026-10-15, 2026-10-25 갱신), P0 결과(§31), 테스트 환경 세팅(§32) |
| [`api-contract.md`](./api-contract.md) | 백엔드 `/api/v2` 규약·권한·상태·API 색인(86개), v1 인증 API, 알림 문구. 코드 대조 기준 `432cce4`(2026-10-25) |
| [`error-codes.md`](./error-codes.md) | 백엔드 에러 코드 203개(`24aa595` 자동 추출 200개 + 2026-10-25 `432cce4` 대조로 손으로 더한 `AUTH_401_2`·`Agreement_400_1`·`Notice_404_1`) |
| [`plan.md`](./plan.md) | 25개 Phase(남은 Phase는 로직 L / 뷰 V로 나눔 — §0), 선행 관계, API 배정 |
| [`legal-copy.md`](./legal-copy.md) | 약관 근거 화면 문구(2026-10-25 시행 약관) — v1 운영 원문, 조항, v2 Phase·위치, "약관 표시 의무 — v2 계획에 위치 없음(위험)" 표시. 문구가 바뀌면 `agreementVersion`을 올린다 |
| [`gui-screens.md`](./gui-screens.md) | Figma "GUI 화면" 파일 — 관객·호스팅 화면 목록과 라우트·Phase 대응, 데스크탑 대시보드, GUI와 서버가 다른 것의 요약(원본은 design-requests §3) |
| [`design-system.md`](./design-system.md) | 디자인 시스템(토큰·그리드·폰트·아이콘)과 컴포넌트 구현 결정(Radix + vanilla-extract, 컴포넌트별 출처·props) |
| [`design-requests.md`](./design-requests.md) | 디자인·기획 요청 — 화면이 없는 것, 기획 질문, **프론트가 정한 것(핸드오프 원본, 30건)**, 해결된 것 |
| [`backend-questions.md`](./backend-questions.md) | 백엔드 질문과 지켜보는 변경 |
| [`deploy-plan.md`](./deploy-plan.md) | 프론트 이미지 빌드와 배포 흐름, Deploy 저장소 변경 목록 |
| [`staging-deploy-plan.md`](./staging-deploy-plan.md) | 로컬에서 명령 하나로 스테이징에 배포하는 계획(미구현) — Deploy 저장소 변경, `pnpm deploy:staging` 스크립트, 준비물 |
| [`directory-structure.md`](./directory-structure.md) | 폴더, 라우트, 계층 규칙 |
| [`storyboard.md`](./storyboard.md) | 화면 흐름 + 호출 API + Phase |
| [`patterns.md`](./patterns.md) | 구현 패턴(§1~§10 공통, §11~§23 화면, §24 화면별 에러 처리) |
| [`figma-structure.md`](./figma-structure.md) | Figma 관측 캐시 |
| [`implementation-log.md`](./implementation-log.md) | Phase별 구현 기록 |

**스킬**: [`../skills/qa-scenario/SKILL.md`](../skills/qa-scenario/SKILL.md) — 피처의 QA 시나리오를 이 문서들(plan 완료 기준, storyboard, gui-screens, api-contract, patterns §24)로 쓰고 `pnpm qa <feature>`로 실행해 단계별 캡처 HTML 리포트를 만든다(tech-decisions §10).

## 충돌할 때 우선순위

1. **Swagger** — 필드 이름·타입
2. **백엔드 통합 기획서(2026-10-10)** → `api-contract.md` — 규칙·상태·권한
3. `tech-decisions.md` · `plan.md` — FE 결정
4. `figma-structure.md` — 화면 관측. 해석이 백엔드와 다르면 백엔드가 맞다

Next 동작은 설치된 버전의 문서(`node_modules/next/dist/docs/`)로 확인한다. 백엔드 API 안내서(2026-10-09)는 #755 이름 변경 이전 문서라 경로·필드명에 쓰지 않는다.

## 개정 이력

| 날짜 | 내용 |
|---|---|
| 2026-08~09 | FE 설계 원본(모노레포, Next 앱 2개, Pages Router, emotion) |
| 2026-10-11 | 백엔드 v2 문서 반영 — 계약 확정, PG·쿠폰·Q&A 등 범위 제외, 관심 호스트·아카이빙·셀프 체크인 추가 |
| 2026-10-12 | 구조 변경 — 단일 Next 앱, App Router(Cache Components 켬, 서버 캐시 없음), vanilla-extract, `/` = 공연홈, 호스팅 센터는 `/hosting`, 호스트 홈은 관객 쪽 화면 하나. 조회 정의 공유(`queryOptions` + `<Prefetch>`), `api` 객체. 스파이크·백엔드 코드·배포 저장소로 미확정 항목 대부분 해소 |
| 2026-10-14 | 검토 1회차 반영 — 요구사항 대조(기획서 F1~F11·API 82개), Figma 이미지·정책·백엔드 코드 대조, 아키텍처 검토. 장소 좌표 입력, 401 처리 규칙, 사용자별 값 쿼리 분리, 주문 완료 라우트, Phase 선행·완료 기준 보강 |
| 2026-10-15 | 검토 2회차 반영 — 세션 상실 규칙(재발급 401·403만, 위치별 이동, `dd:hadSession` 플래그), `authApi` 401 가로채기 없음, 환경변수 검증 단순화, 에러 표 보강, 공연 등록 뒤 처리, 옵션 형식 읽기 전용, `?order=` 열기·닫기, Phase 선행·검증 소유 정리, `SameSite` 확인을 P4b 로컬 재현 + P15 리허설로 |
| 2026-10-15 | 검토 3회차 반영 — 인증 상태 정리(세션 플래그를 로그인마다 새 값인 `dd:session` 하나로, 플래그 없으면 모든 401에 재발급 안 함, GM-1 결과 셋과 게이트 오류 화면, 낡은 액세스 쿠키로 재발급이 401일 때 한 번 더, 탭 사이 `storage` 감시, `SessionLostError`), HTML 502 처리, `handleCodes` 헬퍼, `<Prefetch infiniteQueries>` 제거, `?order=` 열기·닫기 모두 `replace`, 선물 때문에 막힌 취소 안내 조건 축소, 호스팅 센터 게이트, 스테이징 첫 배포를 P4b로, 완료 기준 보강(토스 실기기, 환불 계좌 입력, 승인 후 취소, 프로필 이미지 등) |
| 2026-10-15 | GUI 화면 파일 반영 — 관객·호스팅 화면 목록(`gui-screens.md`), 호스팅 데스크탑 대시보드(사이드바 3단), GUI와 서버가 다른 것의 프론트 보정 목록 |
| 2026-10-17 | 테스트 환경 — Vitest 유닛·컴포넌트 통합(`renderWithProviders`), 스토리 테스트, Playwright e2e·QA 시나리오(빌드한 앱 + 가짜 nginx/백엔드, PR 게이트 밖), `qa-scenario` 스킬, agent-browser는 실제 환경 확인용(tech-decisions §10·§32) |
| 2026-10-21 | P4s(레이아웃 셸) 신설 — 관객·호스팅 셸을 P5a·P10a에서 빼서 P4a 뒤·P4b 앞에 둔다(화면 작업 전에 레이아웃을 먼저 잡는다). 오버레이는 뒤로가기로 닫는다(P2) |
| 2026-10-21 | 로직 먼저 — 디자인이 끝나지 않아 남은 18개 Phase(P4s, P4b, P5a~P13b)를 L(로직: API·도메인 규칙·화면 상태 훅·라우트 로직)과 V(뷰)로 나누고 L만 먼저 진행한다. 훅·규칙은 `features/<track>/<feature>/model/`, 테스트 방식과 L/V 선행은 plan §0·§2·§5 |
| 2026-10-25 | Figma 갱신 반영 — GUI "Ready for dev" 판의 호스팅 PC 셸(전역 상단 바 `Top bar_Host` + 공연 스코프 사이드바 268 + 등록 후 대시보드만 우측 일정 패널)과 반응형 스펙(호스팅 1133 / 1280 / 1440, 1133~1279도 3단)을 채택. 관객은 1024 유지(관객도 1133인지 Q38). 와이어프레임만 근거인 동작 변경([주문취소] = 호스트 연락처 시트, 예매자 관리 6탭, 판매 중단 딤드 등)은 계획을 바꾸지 않고 design-requests Q31~Q40·backend-questions B10·B11 후보로. 화면 문구 "호스팅 센터" → "공연준비"(라우트 `/hosting` 그대로) |
| 2026-10-25 | 백엔드 변경 반영(`24aa595` → `432cce4`, PR 32개 + 열린 #839) — 인증(#792 낡은 쿠키 익명 통과, #793 로그아웃 항상 200, #807 기기별 세션, #808 `AUTH_401_2`), 공개 연락처·GUEST 구매자 마스킹(#846 — 연락처 대응 A안 구현), 동의 기록 필드(#840·#850), `bankCode`·은행 목록(#804·#813), `openedAt`(#802), 알림 17종(#810), 공지 API(#832 — Phase 미정), 선물 `cancelReason=ADMIN`(#826). 백엔드 Develop 기획서(2026-10-25)와 v1 프론트 운영 문구(약관 개정)를 반영해 [`legal-copy.md`](./legal-copy.md)를 새로 두었다. **v1 운영과 v2 계획이 다르면 v2 계획이 정본**(사용자 결정). B1·B3·B4·B6 해결, B12~B19 추가 |
| 2026-10-31 | 사용자 결정 반영 — **관객·호스팅 모두 1024px부터 PC**(Q38 닫힘. 호스팅 GUI 스펙의 1133 경계 대신 1024, 1024~1132는 GUI가 1133에서 그린 레이아웃. 코드 `breakpoints.ts` `desktop: 1024` 그대로), 예매자 관리 주문 상태 5탭 + 환불 탭은 계획대로이고 "전체"(`status=ALL`)에 결제 실패 주문 포함(Q32 닫힘), 은행은 서버 목록 선택으로 확정(디자이너에게 수정 요청 전달), plan·storyboard 본문의 옛 호스팅 GUI 노드 id를 새 id로(gui-screens §2 대응표) |

## 원본 위치

저장소에 넣지 않은 원본이다. 필드 단위 명세가 필요하면 여기서 찾는다.

- 백엔드 통합 기획서: `~/Downloads/두둥-v2-통합-기획서/index.html` (+ `figma/*.jpg` 와이어프레임 62장), 인쇄본 `~/Downloads/두둥 v2 통합 기획서.pdf`
- 백엔드 API 안내서: `~/Downloads/두둥-v2-API-안내서.html`
- FE 설계 원본 7종: `~/Downloads/dudoong-v2-docs/`
- Figma: "GUI 화면" fileKey `1Cn4WOu6TDaSajbFIuH6fO`([`gui-screens.md`](./gui-screens.md)), 와이어프레임 V0.9 최신 fileKey `FUQb8ldGBp3uYUuXPV5FDC`(옛 `YQzHNU46AMT4iXlKuM4LnH`와 노드 번호가 같다 — [`figma-structure.md`](./figma-structure.md))
- v1 코드: `~/Desktop/repos/DuDoong-Front` (읽기 전용 참고)
- 배포 인프라: `https://github.com/Gosrock/DuDoong-Deploy` (docker-compose, nginx 설정)
- 백엔드 코드: `https://github.com/Gosrock/DuDoong-Backend` `dev` 브랜치. v2는 `DuDoong-Api/src/main/kotlin/band/gosrock/api/v2/`, 규약 원문은 그 폴더의 `README.md`

## 범위

**제외** — 백엔드 v2에 API가 없다: PG 결제, 쿠폰, 공연 Q&A, 관객 공연 상세의 지도 위젯, 슬랙 웹훅, 제휴, 호스트 삭제, 멤버 초대 수락 대기, 푸시·알림톡. (공연 D-1·1시간 전 알림은 2026-10-25 백엔드 #810으로 **앱 내 알림이 생겨** 제외에서 뺐다 — P9b.)

**미정** — 서비스 공지 게시판·상단 배너(백엔드 #832, 우선순위 높음으로 전달됨): Phase 번호·배치는 사용자 결정 대기(plan §7). 마이페이지 마케팅 수신 토글(v1 운영에 있음): 넣을지 사용자 결정 대기(plan P9).

호스팅 기본 정보의 **주소 검색 → 좌표 변환은 범위 안이다**. 서버가 위도·경도를 필수로 받아 이것 없이는 공연을 등록할 수 없다(P11, Daum 우편번호 + 카카오 Geocoder).

**제외** — 요구사항이 없다: GA4 수집(v1에서 넘어온 항목. 필요해지면 `features/shared`에 추가한다).

**이전 계획에 없다가 추가된 것**: 호스트 홈·관심 호스트(P5c, P9), 관람 공연 아카이빙(P9), 관객 셀프 체크인(P8c), 환불 계좌 입력·수정과 환불 완료(P9, P13a), 프로필 편집(P9), 판매 중단·재개(P12), 선물 반환과 "선물 완료" 상세(P8b).

## 미확정

2026-10-15 기준(검토 3회차 반영). 스파이크, 백엔드 코드, 배포 저장소로 풀 수 있는 것은 풀었다. 풀린 내용은 [`tech-decisions.md`](./tech-decisions.md) §22(조사)·§23(백엔드 코드)·§25(배포 인프라)에 있다.

### 물어야 하는 것

- **백엔드 질문 — 답 못 받은 것만(B2·B7·B8·B9·B13·B15·B16·B17·B18·B19, 후보 B11)과 지켜보는 항목** → [`backend-questions.md`](./backend-questions.md)
- **기획 질문 — 답 못 받은 것만 42건 + 문구 정정 요청** → [`design-requests.md`](./design-requests.md) §2
- **약관 표시 의무 — v2 계획에 위치 없음(위험)** 목록 → [`legal-copy.md`](./legal-copy.md) (공연 상세 중개자 고지·판매정보 굵은 문단, 첫 화면 중개자 고지, 체크아웃 호스트 제공 동의·중개자 문장·두둥 입금 전 고지, 가입 만 14세, 두둥티켓 개설 환불 의무 동의)

### 실제 환경에서 확인할 것

| 항목 | 필요한 것 | Phase |
|---|---|---|
| 외부 링크로 보호 화면에 들어올 때의 쿠키 동작(`SameSite=Strict`)과 카카오 로그인 복귀 | 로컬에서 응답 쿠키를 `Strict`로 바꿔 재현(스테이징은 `Lax`라 대신하지 못한다). 운영은 컷오버 리허설에서 | P4b, P15 |
| 카카오 스크랩 서버의 현재 UA와 미리보기 | 카카오 공유 디버거 + 공개 URL(P4b의 스테이징 첫 배포 뒤) | P5b |
| 토스 송금 링크(`supertoss://send?…`)가 열리는지, `bankCode` → 토스 은행 값 매핑이 맞는지 | 토스 앱이 깔린 기기 | P7 |
| 카카오톡 인앱 브라우저(iOS WKWebView · Android WebView)에서 Web Locks 동작과 `localStorage` 유지(세션 플래그) | 실기기. Web Locks가 없으면 대체 경로로 동작하는지 | P4b |
| v1 본문 실데이터가 `marked`로 제대로 렌더되는지 | 백엔드 데이터 샘플 | P5b |
| 실제로 들어오는 v1 경로 | nginx 접근 로그(CloudWatch) | P15 |
| 배포 관련 11건(0~10번 — 이미지 크기·메모리, 카카오 JS 키가 환경별로 같은지, 레지스트리 — 2026-10-29 ECR로 결정, Deploy 권한 요청 B15 등) | [`deploy-plan.md`](./deploy-plan.md) §9 | P0, P4b |

### 디자인 대기

화면이 없는 것과 Figma·서버 차이를 [`design-requests.md`](./design-requests.md)로 옮겼다.

### 지켜볼 것

백엔드 변경(#758 남은 L-1·L-3, #763, #776, 열린 PR #839, 동의 강제 전환, 기본안)은 [`backend-questions.md`](./backend-questions.md)에 있다. 프론트 쪽:

- vanilla-extract의 Turbopack 연결이 `unstable_` 옵션이다
- 카카오 크롤러 인식이 User-Agent 문자열에 의존한다

### 구현하면서 정할 것

라우트 경로는 [`tech-decisions.md`](./tech-decisions.md) §3과 [`directory-structure.md`](./directory-structure.md)에 정리돼 있다(2026-10-12 검토). 주문 완료 화면은 `/orders/[orderUuid]?created=1`로 정했다(P7). 쿼리 기본 옵션은 tech-decisions §4에 정했다. 날짜·토스트·파일 선택·캐러셀을 라이브러리로 할지, `commitlint` 도입 여부는 해당 Phase에서 정한다.
