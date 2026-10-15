# Implementation Log

> Phase 하나가 끝날 때마다 기록한다. 결정의 "왜"와 만난 허들을 남긴다. Phase 정의는 [`plan.md`](./plan.md).

## 기록 형식

```
## P{n} — {제목}

**상태**: pending | in-progress | done ({날짜})
**변경**: 한 줄 요약
**완료 기준**: plan.md 체크리스트 중 통과/미통과
**허들**: 만난 문제와 해결
**결정**: 계획과 다르게 한 것, 이유
**문서 반영**: 고친 문서와 절
```

---

## P0 — 스캐폴딩 · 스파이크 · 의존성 감사

**상태**: in-progress (2026-10-16) — 코드·스파이크 완료, Docker 이미지·CI 첫 실행·외부 확인(산출물 D) 남음
**변경**: 단일 Next 16.4.1 앱 골격, `src/{app,features,ui,api,utils,env}`, 라우트 그룹, `api`/`authApi` + `unwrap`(NON_JSON) + `openEnum`, `getQueryClient`, `serverQuery`·`<Prefetch>`, GE-11 수직 슬라이스, ESLint(계층·ky 금지)·Prettier·husky·lint-staged, Vitest+MSW(4건), Storybook, Dockerfile, GitHub Actions 3종, `/healthz`, `CLAUDE.md`
**완료 기준**: lint 계층 실패·커밋 훅·env 누락 빌드 실패는 통과. Docker 이미지·CI 게이트는 첫 실행 대기. `.css.ts` 반영은 서버 재컴파일까지 확인
**허들**: zsh의 `path` 변수가 `PATH`와 묶여 있어 스크립트가 깨짐(변수 이름 변경). ky `Request`가 상대 URL을 못 받음(origin 붙임). boundaries 7·MSW 3 문법 변경
**결정**: `instant = false`를 페이지마다 둔다(레이아웃만으로는 부족 — 스파이크로 확인). 나머지는 tech-decisions §31
**문서 반영**: tech-decisions §2·§3·§31, plan P0 완료 기준, directory-structure, patterns
