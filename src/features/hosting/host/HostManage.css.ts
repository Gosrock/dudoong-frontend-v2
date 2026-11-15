import { style } from '@vanilla-extract/css';

/**
 * 호스트 설정 · 멤버(plan P10b) 공용 틀. 화면 모양은 각 화면 파일(`HostSettingsView.css` · 멤버 화면)이 갖는다 —
 * 와이어 때의 이미지 칸 · 멤버 줄 클래스는 GUI로 바뀌며 쓰는 곳이 없어 지웠다(2026-11-16, #272 — #271 머지 뒤).
 */

/** 화면 — 하단 고정 바가 아래에 붙도록 남은 높이를 채운다 */
export const page = style({ display: 'flex', flexDirection: 'column', flex: '1 0 auto' });

export const body = style({ flex: '1 0 auto' });

export const note = style({ margin: 0 });
