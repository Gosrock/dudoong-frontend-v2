/** Turbopack `type: 'asset'` 규칙(`next.config.ts` `turbopack.rules`)으로 가져온 글꼴 파일 — import 값은 내보낸 파일의 URL이다. */
declare module '*.otf' {
  const url: string;
  export default url;
}
