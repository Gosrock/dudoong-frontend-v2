# DuDoong 디자인 트래커 (Figma 플러그인)

디자이너가 프레임·컴포넌트를 고르고 변경 내용을 적어 [확인]을 누르면 이 저장소(`Gosrock/dudoong-frontend-v2`)에 GitHub 이슈가 생긴다. 파일 이름·페이지·프레임 이름·노드 번호·`node-id` 링크·Dev Mode 상태·작성자는 자동으로 들어간다.

대상 파일: GUI 화면(`1Cn4WOu6TDaSajbFIuH6fO`), 와이어프레임 V0.9(`FUQb8ldGBp3uYUuXPV5FDC`), 디자인 시스템(`0QD9tGSt8ZciDqe7ol2gYH`). 다른 파일에서 만든 이슈는 `Test: figma-plugin` 라벨이 붙는다(테스트용).

## 디자이너: 설치와 사용

1. 이 폴더(`tools/figma-plugin/`)를 내려받는다(저장소 ZIP 또는 clone).
2. **Figma 데스크탑 앱** → 메뉴 Plugins → Development → **Import plugin from manifest…** → 이 폴더의 `manifest.json`.
3. 아무 파일에서 Plugins → Development → **DuDoong 디자인 트래커**.
4. 처음 한 번 **GitHub 연결**:
   - [토큰 발급 페이지 열기] → 이름·조직(Gosrock)·만료(366일)·Issues 쓰기 권한이 채워진 GitHub 페이지가 열린다.
   - Repository access → **Only select repositories** → `dudoong-frontend-v2`를 고른다(미리 채울 수 없는 칸).
   - [Generate token] → 토큰을 플러그인에 붙여 넣고 [연결].
   - Gosrock 조직 관리자가 토큰을 승인해야 이슈를 쓸 수 있다(승인 전에는 권한 오류).
5. 캔버스에서 프레임을 고른다(안쪽 레이어를 골라도 화면 프레임으로 올라간다. variant는 컴포넌트 세트로). 여러 개를 고르면 이슈 하나로 묶는다.
6. **"무엇이 바뀌었나요?"에 적고 버튼(또는 ⌘+Enter)** — 입력은 이 칸 하나다.
   - 첫 줄이 이슈 제목이 된다.
   - 변경 유형 칩은 자동으로 골라져 있다(모두 Ready for dev면 Ready for dev, 디자인 시스템 파일이면 디자인 시스템, 그 밖은 수정). 다르면 칩만 누른다.
   - 고른 프레임에 열린 이슈가 있으면 자동으로 그 이슈에 이어서 기록한다(버튼이 "#N에 이어서 기록"). 새 이슈로 하려면 "새 이슈로".
   - 아래 "이 프레임 이슈 n개"를 펼치면 지난 이슈와 열림/닫힘(개발 처리 상태)이 보인다.

토큰은 그 컴퓨터의 Figma 플러그인 저장소(`figma.clientStorage`)에 평문으로 저장된다. 권한은 이 저장소 Issues 쓰기뿐이다. [연결 해제]로 지운다. 만료(1년) 뒤에는 다시 발급한다.

## 개발: 구조

| 파일                        | 내용                                                                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.json`             | `networkAccess`는 `https://api.github.com`만. `enablePrivatePluginApi`(개발용 플러그인에서 `figma.fileKey`), `permissions: ["currentuser"]`(작성자 이름) |
| `src/core.mjs`              | 순수 로직 — 라벨, 이슈·댓글 본문, 마커, 노드 → 트래킹 단위, 이슈 매칭. 메인 스레드에도 들어가서 `?.`·`??`·객체 spread를 쓰지 않는다                      |
| `src/code.js`               | 메인 스레드 — 선택 읽기, `clientStorage`, `openExternal`                                                                                                 |
| `src/ui.html` · `src/ui.js` | UI(iframe) — GitHub REST 호출. iframe origin이 `null`이라 `Access-Control-Allow-Origin: *`인 api.github.com만 부른다                                     |
| `build.mjs`                 | 의존성 없이 `plugin/code.js`·`plugin/ui.html`을 만든다. **결과물은 커밋한다**(디자이너가 Node 없이 가져온다). `--check`는 맞는지만 본다                  |
| `sync-labels.mjs`           | 라벨을 저장소에 만든다(`gh`). 기본은 출력만, `--apply`로 실행                                                                                            |

`src/`를 고친 뒤 `node tools/figma-plugin/build.mjs`. 테스트는 `pnpm test`(`src/core.test.mjs` — 빌드 결과가 오래됐으면 실패한다).

**이슈 형식**: 제목 `[디자인·GUI] <프레임 이름>[ 외 n] — <요약>`. 본문은 변경 유형, 파일·페이지, 프레임 표(이름 링크·노드·종류·섹션·Dev Mode), 변경 내용, 끝에 숨긴 마커 `<!-- figma-node:<fileKey>/<nodeId> -->`(프레임마다). 플러그인은 `Design Sync` 라벨 이슈(최근 500개)의 마커로 프레임별 이력을 찾는다. 댓글로 이어 쓰면서 새 프레임이 생기면 이슈 본문 끝에 마커를 덧붙인다.

**라벨**: `Design Sync`(전부) + 변경 유형 `Design: 신규 화면|수정|삭제|Ready for dev|디자인 시스템` + 파일 `Figma: GUI|와이어프레임|디자인 시스템`(테스트 파일이면 `Test: figma-plugin`). API는 push 권한이 없으면 라벨을 조용히 버린다.

**개발 쪽에서 읽기**: `gh issue list -R Gosrock/dudoong-frontend-v2 -l "Design Sync" --search "-label:\"Test: figma-plugin\""`.

## 정한 것과 근거

- 인증은 디자이너 개인 fine-grained PAT(사용자 결정 2026-10-31 — 서드파티 서버 없이). GitHub 로그인(device flow)은 `github.com/login/device/code`·`/login/oauth/access_token` 응답에 CORS 헤더가 없어 iframe에서 쓸 수 없다(2026-10-31 curl 확인). api.github.com은 `Origin: null`에도 `*`를 준다.
- 스크린샷은 붙이지 않는다(사용자 결정 — GitHub REST에 이슈 첨부 업로드가 없다). 프레임 링크만.
- 디자인 시스템 변수 diff, Ready for dev 전환 자동 감지는 넣지 않았다 — 플러그인 API에 이전 버전을 읽는 방법도, `devStatus` 변경 이벤트도 없다.
- 디자이너 파일에 pluginData·relaunch 버튼을 남기지 않는다.

## 테스트

- 테스트 파일: "디자인 트래커 플러그인 테스트"(`mjqW9YI6SW96MQK6iAnDhW`, 두둥 팀 드래프트) — 프레임 `1:5`(Ready for dev로 표시해서 쓴다), `1:8`, 섹션 안 `1:12`, 컴포넌트 세트 `1:17`. 디자이너 파일 세 개에서는 시험하지 않는다.
- 2026-10-31: GitHub 흐름(이슈 생성 → 같은 프레임 댓글 + 마커 덧붙임 + 라벨 → 이력 매칭)을 `core.mjs` 그대로 REST로 돌려 확인 — 테스트 이슈 #1. GUI 화면 파일에서 읽기만으로 `resolveTarget`·`devStatus` 읽기(디자인 모드)를 확인. Figma 안에서 UI를 띄우는 것은 아직 확인하지 않았다.
- 2026-10-31 브라우저(ego-browser): 디자이너 흐름 그대로 — 미리 채운 PAT 페이지(이름·Gosrock·만료 1년·Issues 읽기/쓰기·Metadata 읽기가 채워짐, 저장소만 직접 고름) → 발급 → 빌드한 `plugin/ui.html`을 Figma처럼 origin `null` sandbox iframe + CSP `connect-src https://api.github.com`에, `plugin/code.js`를 가짜 `figma` 위에서 띄워 연결·선택(안쪽 레이어 → 프레임, variant → 세트)·Ready for dev 자동 선택·이력·댓글(#1)·새 이슈(#3, 여러 프레임 #4)를 실제로 눌러 확인. 조직 관리자 본인 토큰은 승인 없이 바로 쓰기가 됐다. 이때 `href="#"` 링크가 iframe을 부모 주소로 이동시키는 버그를 찾아 고쳤다. 이슈의 노드 링크는 Figma가 파일 이름을 붙여 해당 노드를 고른 채 연다.

## 확인 못 한 것

- manifest `id`(`dudoong-design-tracker`)를 Figma가 개발용 가져오기에서 받아 주는지 — 막히면 Figma에서 새 플러그인을 만들어 받은 id로 바꾼다.
- 조직 플랜이 아니면 private 플러그인 배포가 안 된다. 그래서 개발용 가져오기(데스크탑 앱 필요)로 쓴다. `figma.fileKey`가 비면 플러그인이 파일 링크를 한 번 묻는다.
