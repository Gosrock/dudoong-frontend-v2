/** e2e·QA 공용 상수. playwright.config.ts와 fixtures.ts가 같이 쓴다. */

/** Next standalone 서버. 브라우저는 여기로 바로 가지 않고 가짜 백엔드(앞문)를 거친다 */
export const APP_PORT = Number(process.env.E2E_APP_PORT ?? 3100);
/** 가짜 nginx + 백엔드(앞문). 브라우저의 baseURL이고 Next의 API_INTERNAL_URL이다 */
export const MOCK_PORT = Number(process.env.E2E_MOCK_PORT ?? 4100);

export const APP_ORIGIN = `http://127.0.0.1:${APP_PORT}`;
export const MOCK_ORIGIN = `http://127.0.0.1:${MOCK_PORT}`;

/** 카카오 스크랩 서버 UA. 줄여 쓰면 `<head>` 대신 `<body>`로 나간다(tech-decisions §2) */
export const KAKAO_SCRAP_UA =
  'facebookexternalhit/1.1; kakaotalk-scrap/1.0; +https://devtalk.kakao.com/t/scrap/33984';

/** 데스크탑 기준(breakpoints.ts desktop ≥ 1024) 위와 아래 */
export const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1280, height: 800 },
} as const;
