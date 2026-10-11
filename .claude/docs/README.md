# DuDoong-Front v2 문서

2026-10-12 기준.

## 한 줄 요약

**Next 16 앱 하나(App Router, vanilla-extract)** 로 관객 화면과 호스팅 센터를 같이 만든다. 공개·공유 화면은 서버에서 조회해 렌더하고(캐시 없음), 로그인 뒤 조작 화면은 클라이언트에서 조회한다. 조회 정의(`queryOptions`)는 한 벌을 양쪽이 같이 쓴다. 백엔드 `/api/v2` 82개는 이미 구현돼 있다.

## 문서

| 문서 | 내용 |
|---|---|
| [`tech-decisions.md`](./tech-decisions.md) | 기술 결정(§0~§20), 검증·조사 기록(§21~§23·§26), 도구 세팅(§24), 배포 인프라(§25) |
| [`api-contract.md`](./api-contract.md) | 백엔드 `/api/v2` 규약·권한·상태·API 색인, v1 인증 API, 알림 문구 |
| [`error-codes.md`](./error-codes.md) | 백엔드 에러 코드 200개(자동 추출) |
| [`plan.md`](./plan.md) | 24개 Phase, 선행 관계, API 배정 |
| [`deploy-plan.md`](./deploy-plan.md) | 프론트 이미지 빌드와 배포 흐름, Deploy 저장소 변경 목록 |
| [`directory-structure.md`](./directory-structure.md) | 폴더, 라우트, 계층 규칙 |
| [`storyboard.md`](./storyboard.md) | 화면 흐름 + 호출 API + Phase |
| [`patterns.md`](./patterns.md) | 구현 패턴(§1~§10 공통, §11~§23 화면) |
| [`figma-structure.md`](./figma-structure.md) | Figma 관측 캐시 |
| [`implementation-log.md`](./implementation-log.md) | Phase별 구현 기록 |

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

## 원본 위치

저장소에 넣지 않은 원본이다. 필드 단위 명세가 필요하면 여기서 찾는다.

- 백엔드 통합 기획서: `~/Downloads/두둥-v2-통합-기획서/index.html` (+ `figma/*.jpg` 와이어프레임 64장), 인쇄본 `~/Downloads/두둥 v2 통합 기획서.pdf`
- 백엔드 API 안내서: `~/Downloads/두둥-v2-API-안내서.html`
- FE 설계 원본 7종: `~/Downloads/dudoong-v2-docs/`
- Figma: `와이어프레임 V0.9 (Copy)`, fileKey `YQzHNU46AMT4iXlKuM4LnH`
- v1 코드: `~/Desktop/repos/DuDoong-Front` (읽기 전용 참고)
- 배포 인프라: `https://github.com/Gosrock/DuDoong-Deploy` (docker-compose, nginx 설정)
- 백엔드 코드: `https://github.com/Gosrock/DuDoong-Backend` `dev` 브랜치. v2는 `DuDoong-Api/src/main/kotlin/band/gosrock/api/v2/`, 규약 원문은 그 폴더의 `README.md`

## 범위

**제외** — 백엔드 v2에 API가 없다: PG 결제, 쿠폰, 공연 Q&A, 지도, 슬랙 웹훅, 제휴, 호스트 삭제, 멤버 초대 수락 대기, 공연 D-1·1시간 전 알림, 푸시·알림톡.

**제외** — 요구사항이 없다: GA4 수집(v1에서 넘어온 항목. 필요해지면 `features/shared`에 추가한다).

**이전 계획에 없다가 추가된 것**: 호스트 홈·관심 호스트(P5c, P9), 관람 공연 아카이빙(P9), 관객 셀프 체크인(P8c), 환불 계좌 입력·수정과 환불 완료(P9, P13a), 프로필 편집(P9), 판매 중단·재개(P12), 선물 반환과 "선물 완료" 상세(P8b).

## 미확정

2026-10-12 기준. 스파이크, 백엔드 코드, 배포 저장소로 풀 수 있는 것은 풀었다. 풀린 내용은 [`tech-decisions.md`](./tech-decisions.md) §22(조사)·§23(백엔드 코드)·§25(배포 인프라)에 있다.

### 물어야 하는 것

**백엔드** — 코드로 알 수 없는 의도·운영 값·일정이다.

| # | 질문 | 왜 필요한가 |
|---|---|---|
| B1 | 리프레시 토큰이 사용자당 하나만 유효하다(다른 기기에서 로그인하면 기존 기기의 재발급이 실패). 의도인가? | 폰으로 티켓을 보는 사람이 노트북으로 호스팅 센터에 들어오면 한쪽이 끊긴다. 의도면 FE는 안내 문구만 둔다 |
| B2 | 운영의 액세스·리프레시 토큰 수명은? 코드 기본값은 둘 다 3600초다 | 세션 유지 UX. 기본값 그대로면 한 시간 조작이 없을 때 로그인이 풀린다 |
| B3 | 티켓 계좌의 은행명을 목록(코드값)으로 바꿀 수 있나? 지금은 자유 입력 30자다 | 토스 송금 링크에 넣을 은행명을 만들 수 없다. 어렵다면 FE 폼에서만 목록으로 제한한다 |
| B4 | #758에서 일반 멤버에게 입금자명도 가리나? | 주문 목록 한 열 |
| B5 | #758·#776 머지 예정 시점과 V001~V011의 staging·prod 실행 일정은? | FE 통합 테스트 시작 시점, 컷오버 순서 |

**기획**

| # | 질문 | 왜 필요한가 |
|---|---|---|
| P1 | 알림을 눌렀을 때 어디로 가나? 알림에는 종류와 대상 id만 온다. FE 안: 주문 알림 → 주문상세(호스트가 받은 것은 예매자 관리의 주문 상세), 선물 알림 → 티켓탭, 멤버 추가 알림 → 호스트 홈 | P9b |
| P2 | 호스팅 센터의 PC 레이아웃이 필요한가? 와이어프레임은 전부 모바일 프레임이다 | P1 breakpoint, 호스팅 센터 화면 전체 |

### 실제 환경에서 확인할 것

| 항목 | 필요한 것 | Phase |
|---|---|---|
| 외부 링크로 보호 화면에 들어올 때의 쿠키 동작(`SameSite=Strict`)과 카카오 로그인 복귀 | 스테이징(쿠키가 `Lax`라 운영과 다를 수 있다) | P4b |
| 카카오 스크랩 서버의 현재 UA와 미리보기 | 카카오 공유 디버거 + 공개 URL | P5b |
| 토스 송금 링크(`supertoss://send?…`)가 열리는지, 은행명 값이 맞는지 | 토스 앱이 깔린 기기 | P7 |
| v1 본문 실데이터가 `marked`로 제대로 렌더되는지 | 백엔드 데이터 샘플 | P5b |
| 실제로 들어오는 v1 경로 | nginx 접근 로그(CloudWatch) | P15 |
| 배포 관련 8건(이미지 크기·메모리, 카카오 JS 키가 환경별로 같은지, GHCR 공개 패키지 등) | [`deploy-plan.md`](./deploy-plan.md) §9 | P0, P4b |

### 디자인 대기

백엔드 문서의 "디자이너 확인 25건"(2026-10-05·09 기준) 중 화면이 없어 FE가 그릴 수 없는 것만 추렸다. 이후 Figma 변경 여부는 확인하지 않았다.

- QR 체크인 결과 화면
- 선물 랜딩 `viewState` 5종(ALREADY_ACCEPTED · REJECTED · RETURNED · OWN_LINK · EXPIRED)
- 거절 주문상세의 환불 계좌 입력 입구
- 승인 완료 주문 취소 화면, 승인 실패 안내
- 티켓 폼 기본값(무제한 + 재고 공개 — 서버가 거부하는 조합), 은행 선택 UI
- 진행 중 공연 배지, 회원 탈퇴 메뉴, 옵션 수정 화면 잠금 표시
- 주문내역 필터, 관심 호스트 필터 선택지
- 보낸·받은 선물 내역 화면 — API(GG-7)는 있는데 Figma에 화면이 있는지 확인하지 못했다. 있으면 `/mypage/gifts`

### 지켜볼 것

결정할 것은 아니지만 바뀌면 화면이 달라진다.

- 백엔드 "기본안"(변경 가능) 항목: 입금자명 닉네임 고정, 받은 티켓 재선물 불가, 공연 검색 범위 등
- #758: 엑셀 다운로드 매니저 이상, 일반 멤버에게 연락처·이메일 가림, 일부 400 → 404
- #776: Origin 검사, OAuth `state` 필수, 토큰 쿠키 HttpOnly
- vanilla-extract의 Turbopack 연결이 `unstable_` 옵션이다
- 카카오 크롤러 인식이 User-Agent 문자열에 의존한다

### 구현하면서 정할 것

라우트 경로는 [`tech-decisions.md`](./tech-decisions.md) §3과 [`directory-structure.md`](./directory-structure.md)에 정리돼 있다(2026-10-12 검토). 주문 완료 화면의 라우트, 쿼리 `staleTime` 기본값, 날짜·토스트·파일 선택·캐러셀을 라이브러리로 할지, `commitlint` 도입 여부는 해당 Phase에서 정한다.
