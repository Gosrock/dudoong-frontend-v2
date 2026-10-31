# 아이콘

Figma 「디자인 시스템」 파일의 `ic` 컴포넌트 세트(`36:178`)와 세트 밖 낱개 `ic/ticket/filled/24`(`183:1130`)에서
뽑은 SVG를 `<Icon />`으로 쓴다(2026-11-01 판 기준 58종 85개 — 세트 밖 낱개 `lightbulb`·`important` 24, ic_v2의 gift filled 3종·`link` 포함).
`lucide-react`는 쓰지 않는다(`.claude/docs/design-system.md` §4). 라이선스 고지는 루트 `THIRD_PARTY_NOTICES.md`.

```tsx
<Icon name="home" />                              // outline 24 (기본값)
<Icon name="home" variant="filled" />
<Icon name="chevron-down" size={12} />
<Icon name="chevron-left" size={20} />
<Icon name="notification-on" title="새 알림" />   // title이 있으면 role="img", 없으면 aria-hidden
```

- 색은 `currentColor`(부모 `color`)를 따른다. 다색 아이콘 7개(`chat`, `important`, `instagram`, `lightbulb`,
  `notification-on`, `settings` filled, `ticket-alert`)는 본문만 `currentColor`이고 강조색은 고정이다.
- Figma에 있는 (name, variant, size) 조합만 타입 검사를 통과한다(`registry.ts`의 `IconSpec`).

## 파일

| 파일                                               | 내용                                       |
| -------------------------------------------------- | ------------------------------------------ |
| `svg/<key>-<outline\|filled>-<12\|16\|20\|24>.svg` | 원본(정리된 SVG). 직접 고쳐도 된다         |
| `generate.mjs`                                     | `svg/` → `registry.ts` 생성기(의존성 없음) |
| `registry.ts`                                      | 생성 파일. 직접 고치지 않는다              |
| `Icon.tsx`                                         | 컴포넌트                                   |

## 다시 뽑기

1. Figma에서 `ic` 세트의 변형을 SVG로 내보낸다(내보내기 이름은 기본값 `name=…, type=…, size=…` 그대로 둔다).
   REST로 받을 때는 `GET /v1/images/0QD9tGSt8ZciDqe7ol2gYH?ids=<노드 id,…>&format=svg`가 준 주소를 받아 같은 이름으로 저장한다.
   - **`ticket` filled는 세트 밖이다**(2026-10-25에 세트에서 빠져 낱개 컴포넌트 `ic/ticket/filled/24` `183:1130`이 됐다).
     세트만 내보내면 빠지므로 이 노드를 따로 내보내 `ticket-filled-24.svg`로 저장한다.
   - **`lightbulb` 24도 세트 밖 낱개 컴포넌트다**(`714:1841`, 2026-10-31) — 따로 내보내 `lightbulb-outline-24.svg`로 저장한다(다색).
   - 2026-10-31 판에서 `gift` 12가 세트에서 빠졌다(코드에서도 지움). `gift cancle`은 `gift-cancel`로 저장한다.
   - 섹션 "ic_v2 (인스턴스 스왑용)"(`740:1168`)의 `ic_<이름>` 세트는 2026-11-01 판에서 공개됐다. 그림은 `ic` 세트와 같고
     **새 그림만 ic_v2에 있다** — `ic_gift`·`ic_gift-return`·`ic_gift-cancle` filled 24(`739:1928`·`739:1917`·`739:1318`),
     `ic_link` 24(`760:2838`). 이 넷은 ic_v2에서 따로 내보내 `<key>-<type>-24.svg`로 저장한다(이름은 `ic` 체계 그대로).
   - 세트 밖 낱개 `important` 24(`751:1654`, 다색)도 따로 내보내 `important-outline-24.svg`로 저장한다.
   - 세트 밖 낱개 프레임 `ic`(`662:722`·`662:726`)·`icon/music-4`(`662:730`)는 2026-10-31에 지워졌다.
2. 파일을 `src/ui/icons/svg/`에 넣는다(같은 키의 기존 파일은 지운다).
3. `node src/ui/icons/generate.mjs`
   - Figma 이름 파일을 `<key>-<type>-<size>.svg`로 바꾼다(이름 대응표는 `generate.mjs`의 `FIGMA_NAME_MAP`).
   - width/height 제거, 단색은 `currentColor`, 다색은 본문 잉크색(`#141413`)만 `currentColor`, id에 파일 이름 접두사.
   - viewBox가 `0 0 <size> <size>`가 아니면 경고한다.
4. 스토리북 Icon 스토리의 `Gallery`에서 눈으로 확인한다.

### Figma 이름 → 키

| Figma                                              | 키                                                              |
| -------------------------------------------------- | --------------------------------------------------------------- |
| `notificatio_onn`                                  | `notification-on`                                               |
| `Ticket`(2026-10-25부터 `ticket`) / `Ticket-alert` | `ticket` / `ticket-alert`                                       |
| `Settings`                                         | `settings`                                                      |
| `up down`                                          | `up-down`                                                       |
| `order detail`                                     | `order-detail`                                                  |
| `open chat`                                        | `open-chat`                                                     |
| `image_add`                                        | `image-add`                                                     |
| 나머지                                             | 소문자·공백은 `-`(`pop out` → `pop-out`, `log out` → `log-out`) |

### 손으로 고친 파일 — 다시 뽑을 때 덮어쓰지 말 것

Figma 원본이 고쳐지기 전까지는 아래 두 파일을 새 내보내기로 바꾸지 않는다.

- `home-outline-24.svg` (`120:972`): `SVG_STRING` 내보내기에서 바깥 윤곽(windingRule NONE 경로)이 빠지고
  문만 나온다. `home` filled(`120:975`) 경로가 같은 중심선이므로 그 경로를 선 2px로 그려 만들었다
  (Figma PNG와 비교 확인).
- `ticket-alert-outline-24.svg` (`213:34`): 배지가 틀 밖으로 나가 28×28로 뽑힌다. 티켓은 24 틀 좌표로 되돌리고
  배지(지름 8, 중심이 오른쪽 위 모서리)는 `overflow="visible"`로 틀 밖에 그대로 둔다 — Figma 모양과 같다.
