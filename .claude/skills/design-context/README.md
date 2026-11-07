# 디자이너 Q&A 스킬(design-context) 준비하기

Claude Code에서 "예매자 관리 환불 탭은 왜 이렇게 됐어?"처럼 물으면, Claude가 디스코드 작업 기록·Figma 코멘트·코드·문서를 찾아 출처와 함께 설명해 줍니다. 처음 한 번만 아래를 준비하면 됩니다(15분쯤).

필요한 것: macOS, Claude Code, `git`, `python3`(맥에 기본으로 있음), GitHub 계정(Gosrock 조직 멤버).

## 1. 저장소 받기

```bash
gh auth login                       # 처음이면. GitHub.com → HTTPS → 브라우저로 로그인
gh repo clone Gosrock/dudoong-frontend-v2 ~/dudoong-frontend-v2
cd ~/dudoong-frontend-v2
claude                              # 이 폴더에서 Claude Code를 연다
```

스킬은 저장소 안(`.claude/skills/design-context`)에 있어서 따로 설치하지 않습니다. 이 폴더에서 Claude Code를 열면 바로 쓸 수 있어요.

- **백엔드 코드**(`Gosrock/DuDoong-Backend`)는 비공개입니다. 읽기 권한이 없으면 프론트 담당자에게 요청하세요. 없어도 다른 출처로는 답합니다.
- **질문 이슈에 라벨을 붙이려면** 저장소에 Triage 이상 권한이 필요합니다. 없으면 라벨 없이 올라갑니다.

## 2. 설정 파일 만들기

```bash
touch ~/.dudoong-design-context.env
chmod 600 ~/.dudoong-design-context.env      # 나만 읽게
open -e ~/.dudoong-design-context.env        # 텍스트 편집기로 열기
```

아래 세 줄을 채워 저장합니다.

```
DISCORD_BOT_TOKEN=프론트 담당자에게 비공개로 받은 값
DISCORD_CHANNEL_ID=1061518004598362122
FIGMA_ACCESS_TOKEN=아래 2-2에서 만든 값
```

### 2-1. 디스코드 봇 토큰

프론트 담당자에게 **DM으로** 받습니다(채널·이슈에 붙여 넣지 않기). 이 스킬의 디스코드 도구는 #프론트 채널을 **읽기만** 하고 글을 올리지 않습니다.

### 2-2. Figma 토큰

Figma → 왼쪽 위 프로필 → **Settings → Security → Personal access tokens → Generate new token**

- 이름: `design-context`
- 만료: 원하는 기간
- 권한(Scopes): **File content — Read**, **Comments — Read**(나머지는 없음)

만든 값을 `FIGMA_ACCESS_TOKEN=` 뒤에 붙입니다.

## 3. 확인

Claude Code에서 이렇게 말해 보세요.

> design-context 준비됐는지 확인해줘

또는 터미널에서:

```bash
python3 .claude/skills/design-context/discord_read.py check
python3 .claude/skills/design-context/figma_read.py comments --limit 1
```

`결과: 읽을 준비 됨`과 코멘트 한 개가 보이면 끝입니다.

## 쓰는 법

그냥 물어보면 됩니다. 예:

- "관심호스트 화면에 필터가 없는 거 개발에서 어떻게 했어?"
- "이 프레임에 달린 코멘트 무슨 뜻이야? https://www.figma.com/design/…?node-id=1175-20350"
- "주문 상태 종류가 뭐가 있어? 서버에서 오는 거 기준으로"
- "지금 디자이너 답을 기다리는 것만 모아줘"
- "예매자 관리 환불 탭 디자인하려는데 놓치면 안 되는 상태 알려줘"

답에는 출처 링크와 함께 **✅ 확정 / 🤖 Claude 잠정안(확인 기다림) / 🎨 디자인대로 / ❓ 모름** 표시가 붙습니다. 잠정안에 답하고 싶거나 답이 없는 질문은 "이슈로 올려줘"라고 하면 초안을 보여 준 뒤 올립니다.

## 문제가 생기면

| 증상 | 할 일 |
|---|---|
| `설정 파일이 없다` | 2번을 다시. 파일 이름이 `~/.dudoong-design-context.env`인지 |
| 디스코드 `401` | 봇 토큰이 틀렸거나 바뀜 — 프론트 담당자에게 다시 받기 |
| Figma `403` | Figma 토큰 권한(Scopes) 확인, 또는 GUI 화면 파일 보기 권한 |
| 백엔드 `Could not resolve to a Repository` | 백엔드 저장소 읽기 권한 요청 |
| 코드가 옛날 것 같음 | Claude에게 "최신으로 받아줘"(또는 `git pull`) |
