# DuDoong-Front v2 문서

2026-10-15 기준.

## 한 줄 요약

**Next 16 앱 하나(App Router, vanilla-extract)** 로 관객 화면과 호스팅 센터를 같이 만든다. 공개·공유 화면은 서버에서 조회해 렌더하고(캐시 없음), 로그인 뒤 조작 화면은 클라이언트에서 조회한다. 조회 정의(`queryOptions`)는 한 벌을 양쪽이 같이 쓴다. 백엔드 `/api/v2` 82개는 이미 구현돼 있다.

## 문서

| 문서 | 내용 |
|---|---|
| [`tech-decisions.md`](./tech-decisions.md) | 기술 결정(§0~§20), 검증·조사 기록(§21~§23·§26), 도구 세팅(§24), 배포 인프라(§25), 검토 기록(§27~§29), GUI 반영(§30), P0 결과(§31), 테스트 환경 세팅(§32) |
| [`api-contract.md`](./api-contract.md) | 백엔드 `/api/v2` 규약·권한·상태·API 색인, v1 인증 API, 알림 문구 |
| [`error-codes.md`](./error-codes.md) | 백엔드 에러 코드 200개(자동 추출) |
| [`plan.md`](./plan.md) | 24개 Phase, 선행 관계, API 배정 |
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
| 2026-10-21 | P4s(레이아웃 셸) 신설 — 관객·호스팅 셸을 P5a·P10a에서 빼서 P4a 뒤·P4b 앞에 둔다(화면 작업 전에 레이아웃을 먼저 잡는다). 오버레이는 뒤로가기로 닫는다(P2) |
| 2026-10-17 | 테스트 환경 — Vitest 유닛·컴포넌트 통합(`renderWithProviders`), 스토리 테스트, Playwright e2e·QA 시나리오(빌드한 앱 + 가짜 nginx/백엔드, PR 게이트 밖), `qa-scenario` 스킬, agent-browser는 실제 환경 확인용(tech-decisions §10·§32) |
| 2026-10-15 | GUI 화면 파일 반영 — 관객·호스팅 화면 목록(`gui-screens.md`), 호스팅 데스크탑 대시보드(사이드바 3단), GUI와 서버가 다른 것의 프론트 보정 목록 |
| 2026-10-15 | 검토 3회차 반영 — 인증 상태 정리(세션 플래그를 로그인마다 새 값인 `dd:session` 하나로, 플래그 없으면 모든 401에 재발급 안 함, GM-1 결과 셋과 게이트 오류 화면, 낡은 액세스 쿠키로 재발급이 401일 때 한 번 더, 탭 사이 `storage` 감시, `SessionLostError`), HTML 502 처리, `handleCodes` 헬퍼, `<Prefetch infiniteQueries>` 제거, `?order=` 열기·닫기 모두 `replace`, 선물 때문에 막힌 취소 안내 조건 축소, 호스팅 센터 게이트, 스테이징 첫 배포를 P4b로, 완료 기준 보강(토스 실기기, 환불 계좌 입력, 승인 후 취소, 프로필 이미지 등) |
| 2026-10-15 | 검토 2회차 반영 — 세션 상실 규칙(재발급 401·403만, 위치별 이동, `dd:hadSession` 플래그), `authApi` 401 가로채기 없음, 환경변수 검증 단순화, 에러 표 보강, 공연 등록 뒤 처리, 옵션 형식 읽기 전용, `?order=` 열기·닫기, Phase 선행·검증 소유 정리, `SameSite` 확인을 P4b 로컬 재현 + P15 리허설로 |
| 2026-10-14 | 검토 1회차 반영 — 요구사항 대조(기획서 F1~F11·API 82개), Figma 이미지·정책·백엔드 코드 대조, 아키텍처 검토. 장소 좌표 입력, 401 처리 규칙, 사용자별 값 쿼리 분리, 주문 완료 라우트, Phase 선행·완료 기준 보강 |

## 원본 위치

저장소에 넣지 않은 원본이다. 필드 단위 명세가 필요하면 여기서 찾는다.

- 백엔드 통합 기획서: `~/Downloads/두둥-v2-통합-기획서/index.html` (+ `figma/*.jpg` 와이어프레임 62장), 인쇄본 `~/Downloads/두둥 v2 통합 기획서.pdf`
- 백엔드 API 안내서: `~/Downloads/두둥-v2-API-안내서.html`
- FE 설계 원본 7종: `~/Downloads/dudoong-v2-docs/`
- Figma: `와이어프레임 V0.9 (Copy)`, fileKey `YQzHNU46AMT4iXlKuM4LnH`
- v1 코드: `~/Desktop/repos/DuDoong-Front` (읽기 전용 참고)
- 배포 인프라: `https://github.com/Gosrock/DuDoong-Deploy` (docker-compose, nginx 설정)
- 백엔드 코드: `https://github.com/Gosrock/DuDoong-Backend` `dev` 브랜치. v2는 `DuDoong-Api/src/main/kotlin/band/gosrock/api/v2/`, 규약 원문은 그 폴더의 `README.md`

## 범위

**제외** — 백엔드 v2에 API가 없다: PG 결제, 쿠폰, 공연 Q&A, 관객 공연 상세의 지도 위젯, 슬랙 웹훅, 제휴, 호스트 삭제, 멤버 초대 수락 대기, 공연 D-1·1시간 전 알림, 푸시·알림톡.

호스팅 기본 정보의 **주소 검색 → 좌표 변환은 범위 안이다**. 서버가 위도·경도를 필수로 받아 이것 없이는 공연을 등록할 수 없다(P11, Daum 우편번호 + 카카오 Geocoder).

**제외** — 요구사항이 없다: GA4 수집(v1에서 넘어온 항목. 필요해지면 `features/shared`에 추가한다).

**이전 계획에 없다가 추가된 것**: 호스트 홈·관심 호스트(P5c, P9), 관람 공연 아카이빙(P9), 관객 셀프 체크인(P8c), 환불 계좌 입력·수정과 환불 완료(P9, P13a), 프로필 편집(P9), 판매 중단·재개(P12), 선물 반환과 "선물 완료" 상세(P8b).

## 미확정

2026-10-15 기준(검토 3회차 반영). 스파이크, 백엔드 코드, 배포 저장소로 풀 수 있는 것은 풀었다. 풀린 내용은 [`tech-decisions.md`](./tech-decisions.md) §22(조사)·§23(백엔드 코드)·§25(배포 인프라)에 있다.

### 물어야 하는 것

- **백엔드 질문 6건(B1~B6)과 지켜보는 항목** → [`backend-questions.md`](./backend-questions.md)
- **기획 질문 18건(Q1~Q19, Q14는 해결)** → [`design-requests.md`](./design-requests.md) §2

### 실제 환경에서 확인할 것

| 항목 | 필요한 것 | Phase |
|---|---|---|
| 외부 링크로 보호 화면에 들어올 때의 쿠키 동작(`SameSite=Strict`)과 카카오 로그인 복귀 | 로컬에서 응답 쿠키를 `Strict`로 바꿔 재현(스테이징은 `Lax`라 대신하지 못한다). 운영은 컷오버 리허설에서 | P4b, P15 |
| 카카오 스크랩 서버의 현재 UA와 미리보기 | 카카오 공유 디버거 + 공개 URL(P4b의 스테이징 첫 배포 뒤) | P5b |
| 토스 송금 링크(`supertoss://send?…`)가 열리는지, 은행명 값이 맞는지 | 토스 앱이 깔린 기기 | P7 |
| 카카오톡 인앱 브라우저(iOS WKWebView · Android WebView)에서 Web Locks 동작과 `localStorage` 유지(세션 플래그) | 실기기. Web Locks가 없으면 대체 경로로 동작하는지 | P4b |
| v1 본문 실데이터가 `marked`로 제대로 렌더되는지 | 백엔드 데이터 샘플 | P5b |
| 실제로 들어오는 v1 경로 | nginx 접근 로그(CloudWatch) | P15 |
| 배포 관련 10건(이미지 크기·메모리, 카카오 JS 키가 환경별로 같은지, GHCR 공개 패키지 등) | [`deploy-plan.md`](./deploy-plan.md) §9 | P0, P4b |

### 디자인 대기

화면이 없는 것과 Figma·서버 차이를 [`design-requests.md`](./design-requests.md)로 옮겼다.

### 지켜볼 것

백엔드 변경(#758·#763·#776, 기본안)은 [`backend-questions.md`](./backend-questions.md)에 있다. 프론트 쪽:

- vanilla-extract의 Turbopack 연결이 `unstable_` 옵션이다
- 카카오 크롤러 인식이 User-Agent 문자열에 의존한다

### 구현하면서 정할 것

라우트 경로는 [`tech-decisions.md`](./tech-decisions.md) §3과 [`directory-structure.md`](./directory-structure.md)에 정리돼 있다(2026-10-12 검토). 주문 완료 화면은 `/orders/[orderUuid]?created=1`로 정했다(P7). 쿼리 기본 옵션은 tech-decisions §4에 정했다. 날짜·토스트·파일 선택·캐러셀을 라이브러리로 할지, `commitlint` 도입 여부는 해당 Phase에서 정한다.
